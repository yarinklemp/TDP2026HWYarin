import {Entity, Column, PrimaryGeneratedColumn} from 'typeorm';

export enum UserRole {
    ADMIN = 'ADMIN',
    DEVELOPER = 'DEVELOPER',
}

@Entity('users')
export class User {
   @PrimaryGeneratedColumn()
    id: number;

    @Column({unique: true})
    username: string;

    @Column({unique: true})
    email: string;

    @Column({name: 'full_name'})
    full_name: string;

    @Column({type: 'enum', enum: UserRole, default: UserRole.DEVELOPER})
    role: UserRole;

    @Column()
    password: string;
}
