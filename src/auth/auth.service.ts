import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUtil } from '../utils/auth.util';
import { LoginDto } from './dto/login.dto';
import { RegisterAdminDto, RegisterUserDto, RegisterAffiliateDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * RF-01: Login con DNI y contraseña
   */
  async login(loginDto: LoginDto) {
    const { dni, password } = loginDto;

    // Buscar usuario por DNI
    const user = await this.prisma.user.findUnique({
      where: { dni },
      include: {
        affiliate: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Verificar contraseña
    const isPasswordValid = await AuthUtil.comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    // Verificar si el usuario está activo
    if (!user.isActive) {
      throw new UnauthorizedException('Cuenta desactivada. Contacta al administrador.');
    }

    // Actualizar último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    // Generar JWT
    const payload = {
      sub: user.id,
      dni: user.dni,
      role: user.role,
      email: user.email,
    };

    const token = this.jwtService.sign(payload);

    return {
      user: {
        id: user.id,
        dni: user.dni,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        maxReferrals: user.maxReferrals,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        affiliate: user.affiliate,
      },
      token,
    };
  }

  /**
   * RF-02: Registro de usuario normal
   */
  async registerUser(registerDto: RegisterUserDto) {
    const { dni, email, password, ...userData } = registerDto;

    // Verificar si ya existe
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

    const passwordHash = await AuthUtil.hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        dni,
        fullName: registerDto.fullName,
        email,
        passwordHash,
        role: 'visitante',
      },
    });

    return {
      user: {
        id: user.id,
        dni: user.dni,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * RF-02: Registro de afiliado
   */
  async registerAffiliate(registerDto: RegisterAffiliateDto, sponsorId: number) {
    const { dni, email, password, ...affiliateData } = registerDto;

    // Verificar sponsor
    const sponsor = await this.prisma.user.findFirst({
      where: {
        id: sponsorId,
        role: { in: ['afiliado', 'admin', 'admin_general'] },
        isActive: true,
      },
      include: {
        sponsoredAffiliates: true,
      },
    });

    if (!sponsor) {
      throw new BadRequestException('Patrocinador no válido');
    }

    // Verificar límite de referidos si es afiliado
    if (sponsor.role === 'afiliado' && sponsor.maxReferrals) {
      if (sponsor.sponsoredAffiliates.length >= sponsor.maxReferrals) {
        throw new BadRequestException('Has alcanzado el límite máximo de referidos');
      }
    }

    // Verificar si ya existe
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

    const passwordHash = await AuthUtil.hashPassword(password);

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          dni,
          fullName: registerDto.fullName,
          email,
          passwordHash,
          role: 'afiliado',
          maxReferrals: affiliateData.maxReferrals || 10,
          createdBy: sponsorId,
        },
      });

      await tx.affiliate.create({
        data: {
          id: user.id,
          sponsorId: sponsorId,
          phone: affiliateData.phone,
          region: affiliateData.region,
          city: affiliateData.city,
          address: affiliateData.address,
          reference: affiliateData.reference || null,
        },
      });

      await tx.referral.create({
        data: {
          referrerId: sponsorId,
          referredId: user.id,
        },
      });

      return user;
    });

    return {
      user: {
        id: result.id,
        dni: result.dni,
        fullName: result.fullName,
        email: result.email,
        role: result.role,
        isActive: result.isActive,
        maxReferrals: result.maxReferrals,
        createdAt: result.createdAt,
      },
    };
  }

  /**
   * RF-02: Registro de administrador
   */
  async registerAdmin(registerDto: RegisterAdminDto, createdBy: number) {
    const { dni, email, password, ...adminData } = registerDto;

    // Solo admin_general puede crear admins
    const creator = await this.prisma.user.findFirst({
      where: {
        id: createdBy,
        role: 'admin_general',
        isActive: true,
      },
    });

    if (!creator) {
      throw new UnauthorizedException('Solo el administrador general puede crear administradores');
    }

    // Verificar si ya existe
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

    const passwordHash = await AuthUtil.hashPassword(password);

    const user = await this.prisma.user.create({
      data: {
        dni,
        fullName: registerDto.fullName,
        email,
        passwordHash,
        role: 'admin',
        createdBy: createdBy,
      },
    });

    // Asignar región al administrador
    await this.prisma.adminRegion.create({
      data: {
        adminId: user.id,
        region: adminData.region,
      },
    });

    return {
      user: {
        id: user.id,
        dni: user.dni,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Obtener perfil completo del usuario
   */
  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        affiliate: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const { passwordHash, ...userProfile } = user;
    return userProfile;
  }

  /**
   * Actualizar perfil del usuario
   */
  async updateProfile(userId: number, updateData: Partial<RegisterUserDto>) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si se está actualizando el email y que no exista
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: updateData.fullName,
        email: updateData.email,
      },
    });

    const { passwordHash, ...userProfile } = updatedUser;
    return userProfile;
  }

  /**
   * Actualizar límite de referidos
   */
  async updateMaxReferrals(affiliateId: number, maxReferrals: number, updatedBy: number) {
    // Verificar permisos
    const updater = await this.prisma.user.findFirst({
      where: {
        id: updatedBy,
        role: { in: ['admin', 'admin_general'] },
        isActive: true,
      },
    });

    if (!updater) {
      throw new UnauthorizedException('No tienes permisos para realizar esta acción');
    }

    // Verificar que el afiliado existe
    const affiliate = await this.prisma.user.findFirst({
      where: {
        id: affiliateId,
        role: 'afiliado',
        isActive: true,
      },
    });

    if (!affiliate) {
      throw new NotFoundException('Afiliado no encontrado');
    }

    await this.prisma.user.update({
      where: { id: affiliateId },
      data: { maxReferrals },
    });

    return { success: true };
  }
}