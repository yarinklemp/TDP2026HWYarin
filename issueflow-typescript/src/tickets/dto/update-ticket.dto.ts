import { IsString, IsEnum, IsNumber, IsOptional, IsDateString } from 'class-validator';
import { TicketStatus, TicketPriority } from '../enums/ticket.enum';

export class UpdateTicketDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TicketStatus)
  @IsOptional()
  status?: TicketStatus;

  @IsEnum(TicketPriority)
  @IsOptional()
  priority?: TicketPriority;

  @IsNumber()
  @IsOptional()
  assigneeId?: number;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}