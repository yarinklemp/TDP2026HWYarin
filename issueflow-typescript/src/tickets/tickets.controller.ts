import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, BadRequestException, Header, UseInterceptors, UploadedFile, ForbiddenException, Request } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';


@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get('deleted')
  getDeleted(@Query('projectId') projectId: string, @Request() req) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can view deleted tickets.');
    }
    if (!projectId) {
      throw new BadRequestException('You must provide a projectId query parameter (e.g., ?projectId=1).');
    }
    return this.ticketsService.findTrash(+projectId);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can restore deleted tickets.');
    }
    return this.ticketsService.restore(+id);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="tickets-export.csv"')
  exportTickets(@Query('projectId') projectId: string) {
    if (!projectId) {
      throw new BadRequestException('You must provide a projectId query parameter.');
    }
    return this.ticketsService.exportTickets(+projectId);
  }

  @Post('import')
  @UseInterceptors(FileInterceptor('file')) // Tells NestJS to look for a multipart field named 'file'
  importTickets(
    @UploadedFile() file: Express.Multer.File,
    @Body('projectId') projectId: string
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please provide a CSV file under the "file" field.');
    }
    if (!projectId) {
      throw new BadRequestException('You must provide a "projectId" form field.');
    }

    return this.ticketsService.importTickets(+projectId, file.buffer);
  }

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

  
  @Get(':id/dependencies')
  getDependencies(@Param('id') ticketId: string) {
    return this.ticketsService.getDependencies(+ticketId);
  }

  
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
