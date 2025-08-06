import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { BusinessRulesService } from './business-rules.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('config')
export class BusinessRulesController {
  constructor(private readonly businessRulesService: BusinessRulesService) {}

  /**
   * RF-14: Obtener reglas de negocio
   */
  @Get('business-rules')
  async getBusinessRules() {
    const result = await this.businessRulesService.getBusinessRules();

    return {
      success: true,
      data: result,
      message: 'Reglas de negocio obtenidas',
    };
  }

  /**
   * RF-14: Actualizar reglas de negocio (admin general)
   */
  @Put('business-rules')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin_general')
  async updateBusinessRules(
    @Body() rules: Record<string, any>,
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.businessRulesService.updateBusinessRules(
      req.user!.id,
      rules
    );

    return {
      success: true,
      data: result,
      message: 'Reglas de negocio actualizadas exitosamente',
    };
  }

  /**
   * Obtener reglas disponibles
   */
  @Get('available-rules')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin_general')
  async getAvailableRules() {
    const result = await this.businessRulesService.getAvailableRules();

    return {
      success: true,
      data: result,
      message: 'Reglas disponibles obtenidas',
    };
  }
}
