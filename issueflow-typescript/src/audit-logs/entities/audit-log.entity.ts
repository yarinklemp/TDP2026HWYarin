import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  entityName: string; // e.g., 'Project', 'Ticket', 'Comment'

  @Column()
  entityId: number;

  @Column()
  action: string; // e.g., 'CREATE', 'UPDATE', 'DELETE', 'SYSTEM_ESCALATION'

  // Nullable because System Cron Jobs don't have an initiating user
  @Column({ nullable: true })
  actorId: number;

  // jsonb allows us to dump the entire object state into Postgres
  @Column({ type: 'jsonb', nullable: true })
  oldValues: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  newValues: Record<string, any>;

  // Append-only constraint: Only a creation timestamp exists
  @CreateDateColumn()
  createdAt: Date;
}