import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwtService: JwtService, private authService: AuthService) {}

  async canActivate(
    context: ExecutionContext):Promise<boolean> {
      const request = context.switchToHttp().getRequest();
      const token = this.extractTokenFromHeader(request);

      if (!token) {
        throw new UnauthorizedException('Token not found');
      }
      if (this.authService.isBlacklisted(token)) {
          throw new UnauthorizedException('Token is blacklisted, try login in again');
      }

      try {
        const payload = await this.jwtService.verifyAsync(token, { secret: "BestSecretKeyEver"});
        request['user'] = payload;
      }
      catch {
        throw new UnauthorizedException('Invalid token or error in authentication');
      }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
