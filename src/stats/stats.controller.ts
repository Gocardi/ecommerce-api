import {
  Controller,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  /**
   * Estadísticas de rendimiento del afiliado
   */
  @Get('affiliate-performance')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado')
  async getAffiliatePerformance(@Request() req: AuthenticatedRequest) {
    const performance = await this.statsService.getAffiliatePerformance(req.user!.id);

    return {
      success: true,
      data: performance,
      message: 'Estadísticas de rendimiento obtenidas',
    };
  }

  /**
   * Productos más vendidos
   */
  @Get('top-products')
  async getTopProducts() {
    const topProducts = await this.statsService.getTopProducts();

    return {
      success: true,
      data: topProducts,
      message: 'Top productos obtenidos',
    };
  }
}
