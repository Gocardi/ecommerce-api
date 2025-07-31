import {
  Controller,
  Post,
  Body,
  Get,
  Put,
  Patch, // ← FALTABA ESTE IMPORT
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto, RegisterAffiliateDto, RegisterAdminDto } from './dto/register.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * RF-01: Autenticación por DNI y contraseña
   */
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    try {
      const result = await this.authService.login(loginDto);
      return {
        success: true,
        data: result,
        message: 'Inicio de sesión exitoso',
      };
    } catch (error: any) {
      throw new UnauthorizedException(error.message);
    }
  }

  /**
   * RF-02: Registro de usuario normal (visitante)
   */
  @Post('register/user')
  async registerUser(@Body() registerDto: RegisterUserDto) {
    try {
      const result = await this.authService.registerUser(registerDto);
      return {
        success: true,
        data: result,
        message: 'Usuario registrado exitosamente',
      };
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('ya está registrado')) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * RF-02: Registro de afiliado (solo por otros afiliados/admins)
   */
  @Post('register/affiliate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado', 'admin', 'admin_general')
  async registerAffiliate(
    @Body() registerDto: RegisterAffiliateDto,
    @Request() req: AuthenticatedRequest
  ) {
    try {
      const result = await this.authService.registerAffiliate(registerDto, req.user!.id);
      return {
        success: true,
        data: result,
        message: 'Afiliado registrado exitosamente',
      };
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('ya está registrado')) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * RF-02: Registro de administrador (solo admin general)
   */
  @Post('register/admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin_general')
  async registerAdmin(
    @Body() registerDto: RegisterAdminDto,
    @Request() req: AuthenticatedRequest
  ) {
    try {
      const result = await this.authService.registerAdmin(registerDto, req.user!.id);
      return {
        success: true,
        data: result,
        message: 'Administrador registrado exitosamente',
      };
    } catch (error: any) {
      if (error.message.includes('already exists') || error.message.includes('ya está registrado')) {
        throw new ConflictException(error.message);
      }
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Actualizar límite de referidos de un afiliado
   */
  @Put('affiliates/:id/max-referrals')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async updateMaxReferrals(
    @Param('id', ParseIntPipe) affiliateId: number,
    @Body() body: { maxReferrals: number },
    @Request() req: AuthenticatedRequest
  ) {
    try {
      const result = await this.authService.updateMaxReferrals(
        affiliateId, 
        body.maxReferrals, 
        req.user!.id
      );
      return {
        success: true,
        data: result,
        message: 'Límite de referidos actualizado',
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Obtener información del usuario autenticado
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    try {
      const userProfile = await this.authService.getProfile(req.user!.id);
      return {
        success: true,
        data: userProfile,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Actualizar perfil del usuario autenticado
   */
  @Patch('profile')
  @UseGuards(AuthGuard)
  async updateProfile(
    @Body() updateData: Partial<RegisterUserDto>,
    @Request() req: AuthenticatedRequest
  ) {
    try {
      const result = await this.authService.updateProfile(req.user!.id, updateData);
      return {
        success: true,
        data: result,
        message: 'Perfil actualizado exitosamente',
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * Cerrar sesión (invalidar token del lado del cliente)
   */
  @Post('logout')
  @UseGuards(AuthGuard)
  logout() {
    return {
      success: true,
      message: 'Sesión cerrada exitosamente',
    };
  }
}