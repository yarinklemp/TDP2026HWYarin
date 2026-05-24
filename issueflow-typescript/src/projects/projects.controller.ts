import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards , Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';
import { TicketsService } from '../tickets/tickets.service';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly ticketsService: TicketsService
  ) {}

  @Get('deleted')
  async getDeletedProjects(@Request() req) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admins can view deleted projects');
    }
    return this.projectsService.findTrash();
  }

  @Post(':id/restore')
  restore(@Param('id') id: string, @Request() req) {
    if (req.user.role !== 'ADMIN') {
      throw new ForbiddenException('Only administrators can restore deleted projects.');
    }
    return this.projectsService.restore(+id);
  }

  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    const isOwner = req.user.id === createProjectDto.ownerId;
    const isAdmin = req.user.roles == 'ADMIN';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to create a project for this owner');
    }
    return this.projectsService.create(createProjectDto);
  }

  @Get('id/workload')
  async getProjectWorkload(@Param('id') id: string) { //Specific endpoint specified in section 3.8 of the requierments
    const project = await this.projectsService.findOne(+id);
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return this.ticketsService.getProjectWorkload(+id);
  }

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(+id);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateProjectDto: UpdateProjectDto, @Request() req) {
    const project = await this.projectsService.findOne(+id);
    const isOwner = req.user.id === project.ownerId;
    const isAdmin = req.user.roles == 'ADMIN';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to update this project for this owner');
    }
    return this.projectsService.update(+id, updateProjectDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const project = await this.projectsService.findOne(+id);
    const isOwner = req.user.id === project.ownerId;
    const isAdmin = req.user.roles == 'ADMIN';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to delete this project for this owner');
    }
    return this.projectsService.remove(+id);
  }
}
