import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { AffiliatesService } from './affiliates.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('affiliates')
export class AffiliatesController {
  constructor(private readonly affiliatesService: AffiliatesService) {}

  /**
   * RF-08: Panel "Mi red de afiliados"
   */
  @Get('my-network')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado')
  async getMyNetwork(
    @Query(new ValidationPipe({ transform: true })) filters: {
      search?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.affiliatesService.getAffiliateNetwork(
      req.user!.id,
      filters
    );

    return {
      success: true,
      data: result,
      message: 'Red de afiliados obtenida exitosamente',
    };
  }

  /**
   * RF-02: Registrar nuevo afiliado
   */
  @Post('register-referral')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado', 'admin', 'admin_general')
  async registerReferral(
    @Body() referralData: {
      dni: string;
      fullName: string;
      email: string;
      phone: string;
      region: string;
      city: string;
      address: string;
      reference?: string;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.affiliatesService.registerReferral(
      req.user!.id,
      referralData
    );

    return {
      success: true,
      data: result,
      message: 'Referido registrado exitosamente',
    };
  }

  /**
   * Obtener estadísticas de un afiliado específico
   */
  @Get(':id/stats')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado')
  async getAffiliateStats(
    @Param('id', ParseIntPipe) affiliateId: number,
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.affiliatesService.getAffiliateStatsById(
      req.user!.id,
      affiliateId
    );

    return {
      success: true,
      data: result,
      message: 'Estadísticas del afiliado obtenidas',
    };
  }

  /**
   * Activar/desactivar afiliado
   */
  @Put(':id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado', 'admin', 'admin_general')
  async toggleStatus(
    @Param('id', ParseIntPipe) affiliateId: number,
    @Body() body: { status: 'active' | 'inactive' },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.affiliatesService.toggleAffiliateStatus(
      req.user!.id,
      affiliateId,
      body.status
    );

    return {
      success: true,
      data: result,
      message: `Afiliado ${body.status === 'active' ? 'activado' : 'desactivado'} exitosamente`,
    };
  }
}
