import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards , Request, ForbiddenException} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { JwtAuthGuard } from '../auth/jwt-auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  create(@Body() createProjectDto: CreateProjectDto, @Request() req) {
    const isOwner = req.user.id === createProjectDto.ownerId;
    const isAdmin = req.user.roles == 'ADMIN';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You do not have permission to create a project for this owner');
    }
    return this.projectsService.create(createProjectDto);
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
