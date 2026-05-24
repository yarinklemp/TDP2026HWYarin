import { Controller, Get, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: any, @Request() req) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can view audit logs.');
    }
    return this.auditLogsService.findAll(query);
  }
}