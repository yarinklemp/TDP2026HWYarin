import { Controller, Post, Body, Get, UseGuards, Request, UnauthorizedException, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth/jwt-auth.guard';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
constructor(
    private authService: AuthService,
    private usersService: UsersService
  ) {}

  @Post('login')
  async login(@Body() loginDto: Record<string, any>) {
    const user = await this.authService.validateUser(loginDto.username, loginDto.password);
    if (!user) {
        throw new UnauthorizedException('Invalid credentials or user not found');
        }
    return this.authService.login(user);
    }

    @Post('logout')
    async logout(@Headers('authorization') authHeader: string) {
        if (!authHeader) {
            throw new UnauthorizedException('Authorization header missing');
        }
        const token = authHeader.split(' ')[1];
        return this.authService.logout(token);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getProfile(@Request() req) {
        return this.usersService.findOne(req.user.sub);
    }
}
