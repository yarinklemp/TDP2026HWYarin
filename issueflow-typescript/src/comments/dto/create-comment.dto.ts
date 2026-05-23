import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsNumber()
  @IsNotEmpty()
  authorId: number;

  @IsNumber()
  @IsNotEmpty()
  ticketId: number;
}