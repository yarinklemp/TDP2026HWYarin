import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    private blacklistedTokens = new Set<string>();  //For blacklisting tokens already used for login. Thoreticly, this is a security risk - the simplistic design opens this up to DDoS attack, but this will work for this project

    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
    ) {}
    
    async validateUser(username: string, password: string): Promise<any> {
        const user = await this.usersService.findByUsername(username);

        if (user && await bcrypt.compare(password, user.password)) {
            const { password, ...result  } = user;
            return result;
        }
        return null;
    }

    async login(user: any) {
        const payload = { username: user.username, sub: user.id, role: user.role };
        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }

    logout(token: string) {
        this.blacklistedTokens.add(token);
        return { message: 'Logged out successfully' } ;
    }

    isBlacklisted(token: string): boolean {
        return this.blacklistedTokens.has(token);
    }
}

