import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { AuthGuard } from '../guards/auth.guard';
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
   * RF-02: Registro de nuevos usuarios
   */
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    try {
      const result = await this.authService.register(registerDto);
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
   * Obtener información del usuario autenticado
   */
  @Get('me')
  @UseGuards(AuthGuard)
  async getProfile(@Request() req: AuthenticatedRequest) {
    const userProfile = await this.authService.getProfile(req.user!.id);
    return {
      success: true,
      data: userProfile,
    };
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
