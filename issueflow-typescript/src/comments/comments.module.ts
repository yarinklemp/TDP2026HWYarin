import { Module, forwardRef } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Comment } from './entities/comment.entity';
import { AuthModule } from '../auth/auth.module';
import { TicketsModule } from '../tickets/tickets.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Comment]),
    AuthModule, 
    TicketsModule, 
    forwardRef(() => UsersModule)],
  controllers: [CommentsController],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
