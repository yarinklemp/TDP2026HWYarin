import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThan, IsNull } from 'typeorm';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './entities/ticket.entity';
import { TicketStatus, TicketPriority, TicketType } from './enums/ticket.enum';
import { UsersService } from '../users/users.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { AuditLogsService } from '../audit-logs/audit-logs.service';


@Injectable()
export class TicketsService {
  private readonly allowedTransitions = {
    [TicketStatus.TODO]: [TicketStatus.IN_PROGRESS],
    [TicketStatus.IN_PROGRESS]: [TicketStatus.IN_REVIEW],
    [TicketStatus.IN_REVIEW]: [TicketStatus.DONE],
    [TicketStatus.DONE]: [], 
  };

  constructor(
    @InjectRepository(Ticket)
    private ticketsRepository: Repository<Ticket>,
    private usersService: UsersService,
    private auditLogsService: AuditLogsService,
  ) {}

  async create(createTicketDto: CreateTicketDto, actorId: number) {
    let finalAssigneeId = createTicketDto.assigneeId;
    if (!finalAssigneeId) {
      finalAssigneeId = await this.calculateLeastLoadedDeveloper(createTicketDto.projectId);
    }
    const ticket = this.ticketsRepository.create({...createTicketDto, assigneeId: finalAssigneeId });
    const savedTicket = await this.ticketsRepository.save(ticket);
    this.auditLogsService.log({
      entityName: 'Ticket',
      entityId: savedTicket.id,
      action: 'CREATE',
      actorId: actorId, // Even if there is random assignment, the actor is stil the one who initiated the creation
      oldValues: null,
      newValues: savedTicket,
    });
    return savedTicket;
  }

  async findAll(project_id: number) {
    const tickets = await this.ticketsRepository.find({ where: { projectId: project_id } });
    return tickets;
  }

  async findOne(id: number) {
    const ticket = await this.ticketsRepository.findOne({ where : { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return ticket;
  }

  async update(id: number, updateTicketDto: UpdateTicketDto, actorId: number) {
    const ticket = await this.findOne(id);
    const oldState = { ...ticket };

    // Constraint: Cannot update once DONE
    if (ticket.status === TicketStatus.DONE) {
      throw new BadRequestException('Cannot update a ticket that is already DONE.');
    }

    if (updateTicketDto.status && updateTicketDto.status !== ticket.status) {
      const validNextStates = this.allowedTransitions[ticket.status];
      if (!validNextStates.includes(updateTicketDto.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${ticket.status} to ${updateTicketDto.status}.`
        );
      }
    }

    if (updateTicketDto.status === TicketStatus.DONE) {
      // We must fetch the ticket again with its dependencies loaded
      const ticketWithDeps = await this.ticketsRepository.findOne({
        where: { id },
        relations: ['blockedBy'],
        });
      const hasUnresolvedBlockers = ticketWithDeps.blockedBy.some(
        (blocker) => blocker.status !== TicketStatus.DONE
        );
      if (hasUnresolvedBlockers) {
        throw new BadRequestException(
          'Cannot mark this ticket as DONE because it has unresolved dependencies.'
        );
      }
    }

    if (updateTicketDto.priority && updateTicketDto.priority !== ticket.priority) {
      ticket.is_overdue = false; // Reset the flag
    }

    Object.assign(ticket, updateTicketDto);
    const updatedTicket = await this.ticketsRepository.save(ticket);

    await this.auditLogsService.log({
      entityName: 'Ticket',
      entityId: updatedTicket.id,
      action: 'UPDATE',
      actorId: actorId, // Passed from the controller
      oldValues: oldState,
      newValues: updatedTicket,
    });
    return updatedTicket;
  }

  async remove(id: number, actorId: number) {
    const ticket = await this.ticketsRepository.findOne({ where : { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    this.auditLogsService.log({
      entityName: 'Ticket',
      entityId: ticket.id,
      action: 'DELETE',
      actorId: actorId, // Passed from the controller
      oldValues: ticket,
      newValues: null,
    });
    return this.ticketsRepository.softRemove(ticket);
  }

  async findTrash(projectId: number) {
    return await this.ticketsRepository.find({
      withDeleted: true,
      where: { 
        projectId: projectId, 
        deletedAt: Not(IsNull()) 
      },
    });
  }

  async restore(id: number, actorId: number) {
    const restoreResponse = await this.ticketsRepository.restore(id);
    
    if (restoreResponse.affected === 0) {
      throw new NotFoundException(`Deleted Ticket #${id} not found.`);
    }
    const restoredTicket = await this.ticketsRepository.findOne({ where: { id }});
    this.auditLogsService.log({
      entityName: 'Ticket',
      entityId: restoredTicket.id,
      action: 'RESTORE',
      actorId: actorId, // Passed from the controller
      oldValues: null,
      newValues: restoredTicket,
    });
    
    return { message: `Ticket #${id} successfully restored.` };
  }

  private async calculateLeastLoadedDeveloper(projectId: number): Promise<number | null> {
    const developers = await this.usersService.findAllByRole('DEVELOPER');
    
    if (!developers || developers.length === 0) {
      return null; // Fulfills constraint: If no devs, assign to null without error
    }

    let leastLoadedDevId = null;
    let lowestCount = Infinity;

    for (const dev of developers) {
      const openTicketsCount = await this.ticketsRepository.count({
        where: {
          assigneeId: dev.id,
          projectId: projectId,
          status: Not(TicketStatus.DONE),  // Done tickets don't count towards workload
        },
      });

      // Tie-breaker logic: Since our array is pre-sorted by oldest user first, 
      // strictly using '<' ensures the older dev keeps the ticket in the event of a tie.
      if (openTicketsCount < lowestCount) {
        lowestCount = openTicketsCount;
        leastLoadedDevId = dev.id;
      }
    }

    return leastLoadedDevId;
  }

  // Workload Endpoint Logic (For Requirement 3.8 GET endpoint)
  async getProjectWorkload(projectId: number) {
    const developers = await this.usersService.findAllByRole('DEVELOPER');
    const workload = [];

    for (const dev of developers) {
      const count = await this.ticketsRepository.count({
        where: {
          assigneeId: dev.id,
          projectId: projectId,
          status: Not(TicketStatus.DONE),
        },
      });
      workload.push({ userId: dev.id, username: dev.username, openTicketCount: count });
    }

    // Sort ascending by count
    return workload.sort((a, b) => a.openTicketCount - b.openTicketCount);
  }

  @Cron(CronExpression.EVERY_MINUTE) // Every minute is for testing; change to EVERY_HOUR for production
  async handleTicketEscaltion() {
    const overdueTickets = await this.ticketsRepository.find({
      where: {
        status: Not(TicketStatus.DONE),
        dueDate: LessThan(new Date()),
      },
    });

    for (const ticket of overdueTickets) {
      const oldState = { ...ticket };
      let needUpdate = false;
      if (ticket.priority === TicketPriority.LOW) {
        ticket.priority = TicketPriority.MEDIUM;
        needUpdate = true;
      } else if (ticket.priority === TicketPriority.MEDIUM) {
        ticket.priority = TicketPriority.HIGH;
        needUpdate = true;
      } else if (ticket.priority === TicketPriority.HIGH) {
        ticket.priority = TicketPriority.CRITICAL;
        needUpdate = true;
      } else if (ticket.priority === TicketPriority.CRITICAL && !ticket.is_overdue) {
        ticket.is_overdue = true; 
        needUpdate = true;
      }
      if (needUpdate) {
        const savedTicket = await this.ticketsRepository.save(ticket);
        this.auditLogsService.log({
          entityName: 'Ticket',
          entityId: savedTicket.id,
          action: 'UPDATE',
          actorId: null, // Passed from the controller
          oldValues: oldState,
          newValues: savedTicket,
        });
      }
    }
  }

  private async checkCircularDependency(currentBlockerId: number, targetTicketId: number, visited: Set<number> = new Set()): Promise<boolean> { // Recursive function to check for cycles
    if (currentBlockerId === targetTicketId) {
      return true; 
    }

    if (visited.has(currentBlockerId)) {
      return false; 
    }
    visited.add(currentBlockerId);

    const ticket = await this.ticketsRepository.findOne({
      where: { id: currentBlockerId },
      relations: ['blockedBy'],
    });

    if (!ticket || !ticket.blockedBy || ticket.blockedBy.length === 0) {
      return false; // Dead end, no cycle here
    }

    for (const deepBlocker of ticket.blockedBy) {
      const hasCycle = await this.checkCircularDependency(deepBlocker.id, targetTicketId, visited);
      if (hasCycle) {
        return true;
      }
    }
    return false;
  }

  async addDependency(ticketId: number, blockerId: number, actorId: number) {
    const ticket = await this.findOne(ticketId);
    const blocker = await this.findOne(blockerId);
    const oldState = { ...ticket };
    if (!ticket || !blocker) {
      throw new NotFoundException('Ticket or blocker ticket not found');
    }
    if (ticket.projectId !== blocker.projectId){
      throw new BadRequestException('Both tickets must belong to the same project');
    }
    if (ticket.id == blocker.id) {
      throw new BadRequestException('A ticket cannot depend on itself');
    }
    const createsCycle = await this.checkCircularDependency(blockerId, ticketId);
    if (createsCycle) {
      throw new BadRequestException(
        `Cannot add dependency: Making Ticket #${ticketId} wait on Ticket #${blockerId} would create a circular dependency (soft lock).`
      );
    }

    const ticketWithDeps = await this.ticketsRepository.findOne({
      where: { id: ticketId },
      relations: ['blockedBy'],
    });

    const isAlreadyBlocked = ticketWithDeps.blockedBy.some((t) => t.id === blockerId);
    if (!isAlreadyBlocked) {
      ticketWithDeps.blockedBy.push(blocker);
      const savedTicket = await this.ticketsRepository.save(ticketWithDeps);
          this.auditLogsService.log({
            entityName: 'Ticket',
            entityId: savedTicket.id,
            action: 'ADD_DEPENDENCY',
            actorId: actorId, // Passed from the controller
            oldValues: oldState,
            newValues: savedTicket,
         });
    } 

    return { message: `Ticket #${ticketId} is now blocked by Ticket #${blockerId}` };
  }

  async getDependencies(ticketId: number) {
    const ticket = await this.ticketsRepository.findOne({
      where: { id: ticketId },
      relations: ['blockedBy'], // Fetches the actual blocker ticket objects
    });

    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} not found`);

    return ticket.blockedBy; 
  }

  async removeDependency(ticketId: number, blockerId: number, actorId: number) {
    const ticket = await this.ticketsRepository.findOne({
      where: { id: ticketId },
      relations: ['blockedBy'],
    });
    const oldState = { ...ticket };

    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} not found`);

    // Filter out the specific blocker ID
    ticket.blockedBy = ticket.blockedBy.filter((t) => t.id !== blockerId);
    const savedTicket = await this.ticketsRepository.save(ticket);

    this.auditLogsService.log({
      entityName: 'Ticket',
      entityId: savedTicket.id,
      action: 'REMOVE_DEPENDENCY',
      actorId: actorId,
      oldValues: oldState,
      newValues: savedTicket,
    });

    return { message: 'Dependency on Ticket #${blockerId} removed.' }; 
  }

  async exportTickets(projectId: number): Promise<string> {
    const tickets = await this.findAll(projectId);

    const data = tickets.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      type: t.type,
      assigneeId: t.assigneeId || '', // Leave blank if unassigned
    }));

    return stringify(data, { header: true });
  }

  async importTickets(projectId: number, fileBuffer: Buffer, actorId: number) {
    const records = parse(fileBuffer, {  // Parse csv to json
      columns: true, 
      skip_empty_lines: true 
    });

    let created = 0;
    let failed = 0;
    const errors = [];

    // Loop through each row and create the ticket
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // 1. Build the DTO manually. 
        // CRITICAL: We intentionally IGNORE row.id to prevent database collisions!
        const createTicketDto: CreateTicketDto = {
          title: row.title,
          description: row.description,
          status: row.status as TicketStatus,
          priority: row.priority as TicketPriority,
          type: row.type as TicketType,
          projectId: projectId, // Use the ID passed in the form data
          assigneeId: row.assigneeId ? Number(row.assigneeId) : undefined,
        };

        // 2. Call your existing create method! 
        // Bonus: If the CSV row leaves assigneeId blank, this will automatically 
        // trigger your workload balancing algorithm from earlier!
        await this.create(createTicketDto, actorId);
        created++;

      } catch (error) {
        failed++;
        // Add +2 to index (row 0 is header, array is 0-indexed) to give accurate Excel row numbers
        errors.push(`Row ${i + 2}: ${error.message}`); 
      }
    }

    // Return the summary object exactly as requested by the assignment
    return { created, failed, errors };
  }

}