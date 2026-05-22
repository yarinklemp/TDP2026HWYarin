import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { TicketStatus, TicketPriority, TicketType } from '../enums/ticket.enum';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(TicketStatus)
  @IsOptional()
  status: TicketStatus;

  @IsEnum(TicketPriority)
  priority: TicketPriority;

  @IsEnum(TicketType)
  type: TicketType;

  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  @IsNumber()
  @IsOptional()
  assigneeId?: number;
}