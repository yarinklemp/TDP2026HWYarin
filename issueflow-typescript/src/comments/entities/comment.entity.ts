import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, VersionColumn, CreateDateColumn, JoinTable, ManyToMany } from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  content: string;

  // Relationship: Belongs to one ticket
  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' }) // If ticket is deleted, comments go with it
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column()
  ticketId: number;

  // Relationship: Authored by one user
  @ManyToOne(() => User)
  @JoinColumn({ name: 'authorId' })
  author: User;

  @Column()
  authorId: number;

  @CreateDateColumn()
  createdAt: Date; //Not necessary but good

  // Fulfills the requirement: "Two users can't edit a comment in the same time"
  @VersionColumn()
  version: number; 

  @ManyToMany(() => User)
  @JoinTable({ name: 'comment_mentions' }) // This automatically creates the junction table
  mentionedUsers: User[];
}
