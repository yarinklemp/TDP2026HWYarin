import { Injectable, NotFoundException} from '@nestjs/common';
import { InjectRepository } from "@nestjs/typeorm";
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import * as bcrypt from 'bcrypt';
import {UserRole} from './entities/user.entity';


@Injectable()
export class UsersService {
  constructor(
      @InjectRepository(User)
      private usersRepository: Repository<User>
  ) {}
  async create(createUserDto: CreateUserDto) {
  
    const { password, ...data } = createUserDto;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = this.usersRepository.create({...data, password: hashedPassword,});
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

  
  async update(id: number, updateUserDto: UpdateUserDto) {
    await this.usersRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User with ID ${id} not found');
    }
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
