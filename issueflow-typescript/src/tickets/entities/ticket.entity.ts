import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, VersionColumn } from 'typeorm';
import { Project } from '../../projects/entities/project.entity';
import { User } from '../../users/entities/user.entity';
import { TicketStatus, TicketPriority, TicketType } from '../enums/ticket.enum';

@Entity()
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'enum', enum: TicketStatus, default: TicketStatus.TODO })
  status: TicketStatus;

  @Column({ type: 'enum', enum: TicketPriority })
  priority: TicketPriority;

  @Column({ type: 'enum', enum: TicketType })
  type: TicketType;

  // Relationship: Belongs to exactly one project
  @ManyToOne(() => Project)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  projectId: number;

  // Relationship: Optional assignee
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigneeId' })
  assignee: User;

  @Column({ nullable: true })
  assigneeId: number;

  // Handles the simultaneous update constraint automatically!
  @VersionColumn()
  version: number;
}
