import { Injectable, NotFoundException} from '@nestjs/common';
import {InjectRepository} from "@nestjs/typeorm";
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import * as bcrypt from 'bcrypt';


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
}
