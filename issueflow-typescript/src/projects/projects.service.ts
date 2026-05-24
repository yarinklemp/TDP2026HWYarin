import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, Not } from 'typeorm';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project) 
    private projectsRepository: Repository<Project>,
    private usersService: UsersService,
  ) {}

  async create(createProjectDto: CreateProjectDto) {
    const user = await this.usersService.findOne(createProjectDto.ownerId);
    if (!user){
      throw new NotFoundException(`User with ID ${createProjectDto.ownerId} not found`);
    }
    const project = this.projectsRepository.create(createProjectDto);
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

  async update(id: number, updateProjectDto: UpdateProjectDto) {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    Object.assign(project, updateProjectDto);
    return this.projectsRepository.save(project);
  }

  async remove(id: number) {
    const project = await this.projectsRepository.findOne({ where: { id } });
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return this.projectsRepository.softRemove(project);
  }

  async findTrash() {
    return this.projectsRepository.find({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
    })
  }

  async restore(id: number) {
    const restoreResponse = await this.projectsRepository.restore(id);
    
    if (restoreResponse.affected === 0) {
      throw new NotFoundException(`Deleted Project #${id} not found.`);
    }
    
    return { message: `Project #${id} successfully restored.` };
  }
}
