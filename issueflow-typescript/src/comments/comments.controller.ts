import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';
import { TicketsService } from '../tickets/tickets.service';

@UseGuards(JwtAuthGuard)
@Controller('comments')
export class CommentsController {
  constructor(
    private readonly commentsService: CommentsService,
  ) {}

  @Post()
  async create(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    const isAuthor = req.user.sub === createCommentDto.authorId; // No spoofing!
    const isAdmin = req.user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('You can only post comments under your own user ID.');
    }

    return this.commentsService.create(createCommentDto);
  }

  @Get()
  findAll(@Query('ticketId') ticketId: number) {
    if (!ticketId) {
      throw new BadRequestException('You must provide a ticketId query parameter (e.g., /comments?ticketId=1)');
    }
    return this.commentsService.findAllByTicket(+ticketId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string, 
    @Body() updateCommentDto: UpdateCommentDto, 
    @Request() req
  ) {
    const comment = await this.commentsService.findOne(+id);

    const isAuthor = req.user.sub === comment.authorId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('You do not have permission to edit this comment.');
    }

    return this.commentsService.update(+id, updateCommentDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const comment = await this.commentsService.findOne(+id);

    const isAuthor = req.user.sub === comment.authorId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete this comment.');
    }

    return this.commentsService.remove(+id);
  }
}
