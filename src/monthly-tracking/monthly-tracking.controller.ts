import {
  Controller,
  Get,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { MonthlyTrackingService } from './monthly-tracking.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('monthly-tracking')
export class MonthlyTrackingController {
  constructor(private readonly monthlyTrackingService: MonthlyTrackingService) {}

  /**
   * RF-05: Historial de compras mensuales
   */
  @Get('my-history')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado')
  async getMyHistory(
    @Query('months', new ParseIntPipe({ optional: true })) months = 12,
    @Request() req: AuthenticatedRequest
  ) {
    const history = await this.monthlyTrackingService.getMonthlyHistory(
      req.user!.id,
      months
    );

    // Obtener compra mínima requerida
    const businessRule = await this.monthlyTrackingService['prisma'].businessRule.findUnique({
      where: { key: 'minMonthlyBuy' },
    });
    const required = businessRule ? parseInt(businessRule.value) : 1;

    const formattedHistory = history.map(record => ({
      month: record.month,
      quantity: record.quantity,
      achieved: record.achieved,
      required,
    }));

    return {
      success: true,
      data: formattedHistory,
      message: 'Historial de compras mensuales obtenido',
    };
  }

  /**
   * RF-05: Estado actual del mes
   */
  @Get('current-status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado')
  async getCurrentStatus(@Request() req: AuthenticatedRequest) {
    const status = await this.monthlyTrackingService.getCurrentMonthStatus(req.user!.id);

    return {
      success: true,
      data: status,
      message: 'Estado actual obtenido',
    };
  }
}
