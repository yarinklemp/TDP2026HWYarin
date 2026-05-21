import { IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class UpdateUserDto {
  @IsString()
  @Length(2, 50, { message: 'Full name must be between 2 and 50 characters' })
  @IsOptional()
  full_name?: string;

  @IsEnum(UserRole, { message: 'Role must be exactly ADMIN or DEVELOPER' })
  @IsOptional()
  role?: UserRole;
}