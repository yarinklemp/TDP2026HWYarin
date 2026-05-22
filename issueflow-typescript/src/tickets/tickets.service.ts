import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { Ticket } from './entities/ticket.entity';
import { TicketStatus } from './enums/ticket.enum';
import { UsersService } from '../users/users.service';


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
          status: Not(TicketStatus.DONE),
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
}
