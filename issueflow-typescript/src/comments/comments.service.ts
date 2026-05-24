import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    private usersService: UsersService,
    private readonly auditLogsService: AuditLogsService,
  ) {}
  
  private extractMentioned(content: string): string[] { // Try to catch mentions in the comment
    const regex = /@([a-zA-Z0-9_]+)/g;
    const matches = [...content.matchAll(regex)];
    return [...new Set(matches.map(match => match[1]))];
  }

  async create(createCommentDto: CreateCommentDto, actorId: number) {
    const comment = this.commentsRepository.create(createCommentDto);

    const mentionedUsernames = this.extractMentioned(comment.content);
    if (mentionedUsernames.length > 0) {
      comment.mentionedUsers = await this.usersService.findByUsernamesIgnoreCase(mentionedUsernames);
    }
    const savedComment = await this.commentsRepository.save(comment);
    this.auditLogsService.log({
      entityName: 'Comment',
      entityId: savedComment.id,
      action: 'CREATE',
      actorId: actorId, // Indicates the system did it
      oldValues: null,
      newValues: comment,
    })
    return savedComment;
  }

  async findAllByTicket(ticketId: number) {
    return this.commentsRepository.find({
      where: { ticketId: ticketId },
      relations: ['mentionedUsers'],
      order: { createdAt: 'ASC' }, 
    });
  }

  async findOne(id: number) {
    const comment = await this.commentsRepository.findOne({ where: { id } });
    if (!comment) {
      throw new NotFoundException(`Comment #${id} not found`);
    }
    return comment;
  }

  async update(id: number, updateCommentDto: UpdateCommentDto, actorId: number) {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['mentionedUsers'],
    });
    const oldComment = { ...comment }; // For audit logging
    
    if (!comment) {
      throw new NotFoundException(`Comment #${id} not found`);
    }

    const usernames = this.extractMentioned(comment.content);
    comment.mentionedUsers = await this.usersService.findByUsernamesIgnoreCase(usernames);

    Object.assign(comment, updateCommentDto);
    this.auditLogsService.log({
      entityName: 'Comment',
      entityId: comment.id,
      action: 'UPDATE',
      actorId: actorId,
      oldValues: oldComment,
      newValues: comment,
    });
    return this.commentsRepository.save(comment);
  }

  async remove(id: number, actorId: number) {
    const comment = await this.findOne(id);
    this.auditLogsService.log({
      entityName: 'Comment',
      entityId: comment.id,
      action: 'DELETE',
      actorId: actorId,
      oldValues: comment,
      newValues: null,
    });
    return this.commentsRepository.remove(comment);
  }

  async findMentionsForUser(userId: number) {
    return this.commentsRepository.find({
      where: { mentionedUsers: { id: userId } },
      relations: ['mentionedUsers'], // Includes the metadata array in the response
      order: { createdAt: 'DESC' }, // "newest first" requirement
    });
  }
}