import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { CommissionsService } from './commissions.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('commissions')
export class CommissionsController {
  constructor(private readonly commissionsService: CommissionsService) {}

  /**
   * RF-07: Panel "Mis Comisiones" para afiliado
   */
  @Get('my-commissions')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado')
  async getMyCommissions(
    @Query(new ValidationPipe({ transform: true })) filters: {
      month?: string;
      type?: string;
      status?: string;
      page?: number;
      limit?: number;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.commissionsService.getAffiliateCommissions(
      req.user!.id,
      filters
    );

    return {
      success: true,
      data: result,
      message: 'Comisiones obtenidas exitosamente',
    };
  }

  /**
   * RF-07: Desglose por referido
   */
  @Get('by-referral')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado')
  async getCommissionsByReferral(
    @Request() req: AuthenticatedRequest,
    @Query('month') month?: string
  ) {
    const result = await this.commissionsService.getCommissionsByReferral(
      req.user!.id,
      month
    );

    return {
      success: true,
      data: result,
      message: 'Comisiones por referido obtenidas',
    };
  }

  /**
   * RF-13: Aprobar comisión (admin)
   */
  @Put(':id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async approveCommission(
    @Param('id', ParseIntPipe) commissionId: number,
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.commissionsService.approveCommission(
      commissionId,
      req.user!.id
    );

    return {
      success: true,
      data: result,
      message: 'Comisión aprobada exitosamente',
    };
  }

  /**
   * RF-13: Comisiones pendientes (admin)
   */
  @Get('pending')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async getPendingCommissions(
    @Query(new ValidationPipe({ transform: true })) filters: {
      region?: string;
      page?: number;
      limit?: number;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.commissionsService.getPendingCommissions(
      req.user!.id,
      filters
    );

    return {
      success: true,
      data: result,
      message: 'Comisiones pendientes obtenidas',
    };
  }

  /**
   * Marcar comisiones como pagadas
   */
  @Post('mark-as-paid')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async markAsPaid(
    @Body() body: { commissionIds: number[] },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.commissionsService.markCommissionsAsPaid(
      body.commissionIds,
      req.user!.id
    );

    return {
      success: true,
      data: result,
      message: 'Comisiones marcadas como pagadas',
    };
  }
}
