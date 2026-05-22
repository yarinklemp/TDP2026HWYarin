import { IsString, IsNotEmpty, IsOptional, IsNumber } from 'class-validator'

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    description: string; // Optional field

    @IsNumber()
    @IsNotEmpty()
    ownerId: number;
}
