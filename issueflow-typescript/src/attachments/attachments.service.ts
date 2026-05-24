import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attachment } from './entities/attachment.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private attachmentsRepository: Repository<Attachment>,
    private auditLogsService: AuditLogsService
  ) {}

  async saveAttachment(ticketId: number, file: Express.Multer.File, actorId: number) {
    const attachment = this.attachmentsRepository.create({
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      data: file.buffer, // The raw file data
      ticketId: ticketId,
    });
    const saved = await this.attachmentsRepository.save(attachment);
    const { data, ...result } = saved; //Return only metadata back to the user
    this.auditLogsService.log({
      entityName: 'ATTACHMENT',
      entityId: saved.id,
      action: 'CREATE',
      actorId: actorId, // Passed from the controller
      oldValues: null,
      newValues: saved,
    });
    return result;
  }

  async findOne(id: number) {
    const attachment = await this.attachmentsRepository.findOne({ where: { id } });
    if (!attachment) throw new NotFoundException(`Attachment #${id} not found`);
    return attachment;
  }

  async findAllByTicket(ticketId: number) {
    return this.attachmentsRepository.find({
      where: { ticketId: ticketId }, 
      select: ['id', 'filename', 'mimeType', 'size', 'uploadedAt', 'ticketId'], 
      order: { uploadedAt: 'DESC' },
    });
  }
}
