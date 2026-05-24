import { Injectable, NotFoundException} from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import * as bcrypt from 'bcrypt';
import { UserRole } from './entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private auditLogsService: AuditLogsService
  ) {}
  async create(createUserDto: CreateUserDto) { 
    const { password, ...data } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.usersRepository.create({...data, password: hashedPassword,});
    this.auditLogsService.log({
      entityName: 'User',
      entityId: newUser.id,
      action: 'CREATE',
      actorId: null, // Indicates the system did it
      oldValues: null,
      newValues: newUser,
    });
    return await this.usersRepository.save(newUser);
  }

  async findAll() {
    return await this.usersRepository.find();
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({where: {id}});
    if (!user) {
      throw new NotFoundException('User with ID ${id} not found');
    }
    return user;
  }

  
  async update(id: number, updateUserDto: UpdateUserDto, actorId: number) {
    const existingUser = await this.findOne(id);
    if (!existingUser) {
      throw new NotFoundException('User with ID ${id} not found');
    }
    await this.usersRepository.update(id, updateUserDto);
    const updatedUser = await this.findOne(id);
    this.auditLogsService.log({
      entityName: 'User',
      entityId: updatedUser.id,
      action: 'UPDATE',
      actorId: actorId, 
      oldValues: existingUser,
      newValues: updatedUser,
    });
    return updatedUser;
  }

  async remove(id: number, actorId: number) {
    const userToDelete = await this.findOne(id);
    if (!userToDelete) {
      throw new NotFoundException('User with ID ${id} not found');
    }
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User with ID ${id} not found');
    }
    this.auditLogsService.log({
      entityName: 'User',
      entityId: userToDelete.id,
      action: 'DELETE',
      actorId: actorId,
      oldValues: userToDelete,
      newValues: null,
    });
    return { message: 'User with ID #${id} has been deleted' };
  }

  async findByUsername(username: string): Promise<User | undefined> {
    return await this.usersRepository.findOne({ where: { username } });
  }

  async findAllByRole(role: string) {
    if (role !== UserRole.ADMIN && role !== UserRole.DEVELOPER) {
      throw new NotFoundException('Role must be either ADMIN or DEVELOPER');
    }
    return await this.usersRepository.find({
      where: { role } ,
      order: { id: 'ASC' },
    });
  }

  async findByUsernamesIgnoreCase(usernames: string[]) {
    if (!usernames || usernames.length === 0) return [];
    
    const lowerCaseUsernames = usernames.map(u => u.toLowerCase());
    
    return this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.username) IN (:...usernames)', { usernames: lowerCaseUsernames })
      .select(['user.id', 'user.username', 'user.full_name']) // Only grab required metadata
      .getMany();
  }
}
