import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * RF-13, RF-14: Dashboard administrativo
   */
  @Get('dashboard')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async getDashboard(@Request() req: AuthenticatedRequest) {
    const result = await this.adminService.getDashboard(req.user!.id);

    return {
      success: true,
      data: result,
      message: 'Dashboard obtenido exitosamente',
    };
  }

  /**
   * RF-13: Gestión de usuarios
   */
  @Get('users')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async getUsers(
    @Query(new ValidationPipe({ transform: true })) filters: {
      role?: string;
      search?: string;
      isActive?: boolean;
      page?: number;
      limit?: number;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.adminService.getUsers(req.user!.id, filters);

    return {
      success: true,
      data: result,
      message: 'Usuarios obtenidos exitosamente',
    };
  }

  /**
   * Activar/desactivar usuario
   */
  @Put('users/:id/toggle-status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async toggleUserStatus(
    @Param('id', ParseIntPipe) userId: number,
    @Body() body: { isActive: boolean },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.adminService.toggleUserStatus(
      req.user!.id,
      userId,
      body.isActive
    );

    return {
      success: true,
      data: result,
      message: `Usuario ${body.isActive ? 'activado' : 'desactivado'} exitosamente`,
    };
  }
}
