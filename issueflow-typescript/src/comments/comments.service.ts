import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
    private usersService: UsersService,
  ) {}
  
  private extractMentioned(content: string): string[] { // Try to catch mentions in the comment
    const regex = /@([a-zA-Z0-9_]+)/g;
    const matches = [...content.matchAll(regex)];
    return [...new Set(matches.map(match => match[1]))];
  }

  async create(createCommentDto: CreateCommentDto) {
    const comment = this.commentsRepository.create(createCommentDto);

    const mentionedUsernames = this.extractMentioned(comment.content);
    if (mentionedUsernames.length > 0) {
      comment.mentionedUsers = await this.usersService.findByUsernamesIgnoreCase(mentionedUsernames);
    }
    return this.commentsRepository.save(comment);
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

  async update(id: number, updateCommentDto: UpdateCommentDto) {
    const comment = await this.commentsRepository.findOne({
      where: { id },
      relations: ['mentionedUsers'],
    });
    
    if (!comment) {
      throw new NotFoundException(`Comment #${id} not found`);
    }

    const usernames = this.extractMentioned(comment.content);
    comment.mentionedUsers = await this.usersService.findByUsernamesIgnoreCase(usernames);

    Object.assign(comment, updateCommentDto);
    return this.commentsRepository.save(comment);
  }

  async remove(id: number) {
    const comment = await this.findOne(id);
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