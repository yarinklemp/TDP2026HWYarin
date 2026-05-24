import { Controller, Get, Post, Body, Patch, Param, Res, BadRequestException, UseInterceptors, UseGuards, UploadedFile } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';


@UseGuards(JwtAuthGuard)
@Controller('tickets')
export class AttachmentsController {
  constructor(private readonly attachmentsService: AttachmentsService) {}

  @Post(':ticketId/attachments')
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize : 10 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => { const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf', 'text/plain'];
      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new BadRequestException(`File type ${file.mimetype} is not allowed.`), false);
      }
      cb(null, true);
    }
  })) 
  async uploadFile(@Param('ticketId') ticketId: string, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File is missing or exceeded the 10 MB limit.');
    }
    return this.attachmentsService.saveAttachment(+ticketId, file);
  }


  @Get(':ticketId/attachments')
  findAll(@Param('ticketId') ticketId: string) {
    return this.attachmentsService.findAllByTicket(+ticketId);
  }

  @Get('attachments/:id')
  async downloadFile(@Param('id') id: string, @Res() res: Response) {
    const attachment = await this.attachmentsService.findOne(+id);
    if (!attachment) {
      throw new BadRequestException('Attachment not found.');
    }
    res.set({
      'Content-Type': attachment.mimeType,
      'Content-Disposition': `attachment; filename="${attachment.filename}"`,
    });
    res.send(attachment.data);
  }
}
