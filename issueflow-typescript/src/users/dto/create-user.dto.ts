import {IsEmail, IsEnum, IsNotEmpty, IsString, Length} from 'class-validator';
import {UserRole} from '../entities/user.entity';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    @Length(3, 40, {message: 'Username must be between 3 and 40 characters'})
    username: string;

    @IsEmail({}, {message: 'Invalid email address'})
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    @Length(2, 50, {message: 'Full name must be between 2 and 50 characters'})
    full_name: string;

    @IsEnum(UserRole, {message: 'Role must be either ADMIN or DEVELOPER'})
    role: UserRole;

}
