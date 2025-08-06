import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    dni: string;
    email: string;
    role: string;
    isActive: boolean;
  };
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token de acceso requerido');
    }

    try {
      const payload: any = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET, // Asegurar que use el secret correcto
      });

      console.log('Token payload:', payload); // Debug log

      // Usar payload.id o payload.sub
      const userId = payload.id || payload.sub;
      
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          dni: true,
          email: true,
          role: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        console.log('User not found or inactive:', userId);
        throw new UnauthorizedException('Usuario no encontrado o inactivo');
      }

      console.log('Auth guard passed for user:', user.id);
      request.user = user;
      return true;
    } catch (error) {
      console.log('Auth guard failed:', error.message);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
