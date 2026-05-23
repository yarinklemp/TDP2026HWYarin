import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, LessThan } from 'typeorm';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './entities/ticket.entity';
import { TicketStatus, TicketPriority } from './enums/ticket.enum';
import { UsersService } from '../users/users.service';
import { Cron, CronExpression } from '@nestjs/schedule';


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
  ) {}

  async create(createTicketDto: CreateTicketDto) {
    let finalAssigneeId = createTicketDto.assigneeId;
    if (!finalAssigneeId) {
      finalAssigneeId = await this.calculateLeastLoadedDeveloper(createTicketDto.projectId);
    }
    const ticket = this.ticketsRepository.create({...createTicketDto, assigneeId: finalAssigneeId });
    return this.ticketsRepository.save(ticket);
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

  async update(id: number, updateTicketDto: UpdateTicketDto) {
    const ticket = await this.findOne(id);

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
    return this.ticketsRepository.save(ticket);
  }

  async remove(id: number) {
    const ticket = await this.ticketsRepository.findOne({ where : { id } });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${id} not found`);
    }
    return this.ticketsRepository.remove(ticket);
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
        await this.ticketsRepository.save(ticket);
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

  async addDependency(ticketId: number, blockerId: number) {
    const ticket = await this.findOne(ticketId);
    const blocker = await this.findOne(blockerId);
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
      await this.ticketsRepository.save(ticketWithDeps);
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

  async removeDependency(ticketId: number, blockerId: number) {
    const ticket = await this.ticketsRepository.findOne({
      where: { id: ticketId },
      relations: ['blockedBy'],
    });

    if (!ticket) throw new NotFoundException(`Ticket #${ticketId} not found`);

    // Filter out the specific blocker ID
    ticket.blockedBy = ticket.blockedBy.filter((t) => t.id !== blockerId);
    await this.ticketsRepository.save(ticket);

    return { message: 'Dependency on Ticket #${blockerId} removed.' }; 
  }
}