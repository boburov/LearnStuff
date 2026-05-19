import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export type AppRole = 'USER' | 'PENDING' | 'ADMIN' | 'SUPER_ADMIN';

export interface AuthUser {
  sub: number;
  tgId: string;
  role: AppRole;
  kind?: 'user' | 'admin';
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
      user?: AuthUser;
    }>();
    const header = req.headers['authorization'];
    const raw = Array.isArray(header) ? header[0] : header;
    const token = raw?.replace(/^Bearer\s+/i, '');
    if (!token) throw new UnauthorizedException('Missing token');

    try {
      const payload = await this.jwt.verifyAsync<AuthUser>(token);
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
