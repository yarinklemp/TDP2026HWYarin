import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, BadRequestException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post(':id/dependencies')
  addDependency(
    @Param('id') ticketId: string,
    @Body('blockedBy') blockerId: number // Extracts just the 'blockedBy' field from the body
  ) {
    if (!blockerId) {
      throw new BadRequestException('You must provide a "blockedBy" ID in the request body.');
    }
    return this.ticketsService.addDependency(+ticketId, blockerId);
  }

  // GET /tickets/{ticketId}/dependencies [cite: 73]
  @Get(':id/dependencies')
  getDependencies(@Param('id') ticketId: string) {
    return this.ticketsService.getDependencies(+ticketId);
  }

  // DELETE /tickets/{ticketId}/dependencies/{blockerId} [cite: 74]
  @Delete(':id/dependencies/:blockerId')
  removeDependency(
    @Param('id') ticketId: string,
    @Param('blockerId') blockerId: string
  ) {
    return this.ticketsService.removeDependency(+ticketId, +blockerId);
  }
  
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
