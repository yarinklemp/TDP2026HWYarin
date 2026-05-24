import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, Not } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) 
    private projectsRepository: Repository<Project>,
    private usersService: UsersService,
    private auditLogsService: AuditLogsService,
  ) {}

  async create(createProjectDto: CreateProjectDto, actorId: number) {
    const user = await this.usersService.findOne(createProjectDto.ownerId);
    if (!user){
      throw new NotFoundException(`User with ID ${createProjectDto.ownerId} not found`);
    }
    const project = this.projectsRepository.create(createProjectDto);
    this.auditLogsService.log({
      entityName: 'Project',
      entityId: project.id,
      action: 'Create',
      actorId: actorId, // Passed from the controller
      oldValues: {},
      newValues: project,
    }); 
    return this.projectsRepository.save(project);
  }

  findAll() {
    return this.projectsRepository.find();
  }

  async findOne(id: number) {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return project;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto, actorId: number) {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    const oldState = { ...project };
    Object.assign(project, updateProjectDto);
    const savedProject = await this.projectsRepository.save(project);
    this.auditLogsService.log({
      entityName: 'Project',
      entityId: savedProject.id,
      action: 'UPDATE',
      actorId: actorId,
      oldValues: oldState,
      newValues: savedProject,
    });
    return savedProject;
  }

  async remove(id: number, actorId: number) {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    this.auditLogsService.log({
      entityName: 'Project',
      entityId: project.id,
      action: 'DELETE',
      actorId: actorId,
      oldValues: project,
      newValues: {},
    });
    return this.projectsRepository.softRemove(project);
  }

  async findTrash() {
    return this.projectsRepository.find({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
    })
  }

  async restore(id: number, actorId: number) {
    const restoreResponse = await this.projectsRepository.restore(id);
    
    if (restoreResponse.affected === 0) {
      throw new NotFoundException(`Deleted Project #${id} not found.`);
    }
    const project = await this.projectsRepository.findOne({ where: { id } });
    this.auditLogsService.log({
      entityName: 'Project',
      entityId: project.id,
      action: 'RESTORE',
      actorId: actorId,
      oldValues: {},
      newValues: project,
    });
    return { message: `Project #${id} successfully restored.` };
  }
}
