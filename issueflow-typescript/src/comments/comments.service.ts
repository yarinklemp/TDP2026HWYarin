import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private commentsRepository: Repository<Comment>,
  ) {}

  create(createCommentDto: CreateCommentDto) {
    const comment = this.commentsRepository.create(createCommentDto);
    
    return this.commentsRepository.save(comment);
  }

  async findAllByTicket(ticketId: number) {
    return this.commentsRepository.find({
      where: { ticketId: ticketId },
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
    const comment = await this.findOne(id);

    Object.assign(comment, updateCommentDto);
    return this.commentsRepository.save(comment);
  }

  async remove(id: number) {
    const comment = await this.findOne(id);
    return this.commentsRepository.remove(comment);
  }
}