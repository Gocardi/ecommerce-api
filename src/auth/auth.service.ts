// filepath: /home/gocardi/boost-project/ecommerce-api/src/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUtil } from '../utils/auth.util';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const { dni, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { dni },
      include: {
        affiliate: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('DNI o contraseña incorrectos');
    }

    const isPasswordValid = await AuthUtil.comparePassword(
      password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('DNI o contraseña incorrectos');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Cuenta desactivada. Contacte al administrador.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const payload = AuthUtil.createJwtPayload(user);
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        dni: user.dni,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        affiliate: user.affiliate,
      },
      token,
      expiresIn: '7d',
    };
  }

  async register(registerDto: RegisterDto) {
    const { dni, email, password, role, ...affiliateData } = registerDto;

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ dni }, { email }],
      },
    });

    if (existingUser) {
      if (existingUser.dni === dni) {
        throw new ConflictException('El DNI ya está registrado');
      }
      if (existingUser.email === email) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    if (affiliateData.sponsorId) {
      const sponsor = await this.prisma.user.findFirst({
        where: {
          id: affiliateData.sponsorId,
          role: 'afiliado',
          isActive: true,
        },
      });

      if (!sponsor) {
        throw new BadRequestException('Patrocinador no válido');
      }
    }

    const passwordHash = await AuthUtil.hashPassword(password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          dni,
          fullName: registerDto.fullName,
          email,
          passwordHash,
          role,
        },
      });

      if (role === 'afiliado') {
        await tx.affiliate.create({
          data: {
            id: user.id,
            sponsorId: affiliateData.sponsorId || null,
            phone: affiliateData.phone || '',
            region: affiliateData.region || null,
            city: affiliateData.city || null,
            address: affiliateData.address || null,
            reference: affiliateData.reference || null,
          },
        });

        if (affiliateData.sponsorId) {
          await tx.referral.create({
            data: {
              referrerId: affiliateData.sponsorId,
              referredId: user.id,
            },
          });
        }
      }

      return user;
    });

    const payload = AuthUtil.createJwtPayload(result);
    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: result.id,
        dni: result.dni,
        fullName: result.fullName,
        email: result.email,
        role: result.role,
        isActive: result.isActive,
      },
      token,
      expiresIn: '7d',
    };
  }

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        dni: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        lastLogin: true,
        affiliate: {
          select: {
            phone: true,
            region: true,
            city: true,
            address: true,
            reference: true,
            status: true,
            points: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return user;
  }
}
