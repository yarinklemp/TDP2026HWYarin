import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Ticket } from '../../tickets/entities/ticket.entity';

@Entity()
export class Attachment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  filename: string;

  @Column()
  mimeType: string;

  @Column()
  size: number;

  // Storing the actual file buffer directly in PostgreSQL
  @Column({ type: 'bytea' })
  data: Buffer;

  @ManyToOne(() => Ticket, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticketId' })
  ticket: Ticket;

  @Column()
  ticketId: number;

  @CreateDateColumn()
  uploadedAt: Date;
}