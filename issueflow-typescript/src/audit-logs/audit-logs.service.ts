import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { UpdateAuditLogDto } from './dto/update-audit-log.dto';
import { AuditLog } from './entities/audit-log.entity';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private auditLogsRepository: Repository<AuditLog>,
  ) {}

  async log(data: Partial<AuditLog>) {
    const auditLog = this.auditLogsRepository.create(data); //No await - backgroud task
    this.auditLogsRepository.save(auditLog).catch(err => {
      console.error('Failed to write audit log:', err);
    });
  }

  async findAll(filters: any) {
    const query = this.auditLogsRepository.createQueryBuilder('log');

    if (filters.entityName) query.andWhere('log.entityName = :entityName', { entityName: filters.entityName });
    if (filters.entityId) query.andWhere('log.entityId = :entityId', { entityId: filters.entityId });
    if (filters.action) query.andWhere('log.action = :action', { action: filters.action });
    if (filters.actorId) query.andWhere('log.actorId = :actorId', { actorId: filters.actorId });

    query.orderBy('log.createdAt', 'DESC');
    return query.getMany();
  }
}