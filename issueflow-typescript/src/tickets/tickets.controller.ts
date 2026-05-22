import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  create(@Body() createTicketDto: CreateTicketDto) {
    return this.ticketsService.create(createTicketDto);
  }

  @Get()
  findAll(@Query('projectId') projectId: string) {
    if (!projectId) {
      throw new BadRequestException('You must provide a projectId query parameter (e.g., /tickets?projectId=1)');
    }
    return this.ticketsService.findAll(+projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    
    return this.ticketsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTicketDto: UpdateTicketDto) {
    return this.ticketsService.update(+id, updateTicketDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ticketsService.remove(+id);
  }
}
