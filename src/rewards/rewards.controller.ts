import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { RewardsService } from './rewards.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('rewards')
export class RewardsController {
  constructor(private readonly rewardsService: RewardsService) {}

  /**
   * RF-10: Catálogo de premios
   */
  @Get()
  async getRewards() {
    const rewards = await this.rewardsService.getRewards();

    return {
      success: true,
      data: rewards,
      message: 'Premios disponibles obtenidos',
    };
  }

  /**
   * RF-10: Puntos del afiliado
   */
  @Get('my-points')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado')
  async getMyPoints(@Request() req: AuthenticatedRequest) {
    const points = await this.rewardsService.getAffiliatePoints(req.user!.id);

    return {
      success: true,
      data: points,
      message: 'Puntos obtenidos exitosamente',
    };
  }

  /**
   * RF-10: Canjear premio
   */
  @Post('claim')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado')
  async claimReward(
    @Body() body: { rewardId: number },
    @Request() req: AuthenticatedRequest
  ) {
    const claim = await this.rewardsService.claimReward(req.user!.id, body.rewardId);

    return {
      success: true,
      data: claim,
      message: 'Premio canjeado exitosamente',
    };
  }

  /**
   * Historial de canjes
   */
  @Get('my-claims')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('afiliado')
  async getMyClaims(@Request() req: AuthenticatedRequest) {
    const claims = await this.rewardsService.getClaimHistory(req.user!.id);

    return {
      success: true,
      data: claims,
      message: 'Historial de canjes obtenido',
    };
  }

  /**
   * Crear nuevo premio (admin)
   */
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async createReward(
    @Body() rewardData: {
      name: string;
      description?: string;
      pointsRequired: number;
      imageUrl?: string;
      stock: number;
    }
  ) {
    const reward = await this.rewardsService.createReward(rewardData);

    return {
      success: true,
      data: reward,
      message: 'Premio creado exitosamente',
    };
  }

  /**
   * Aprobar canje de premio (admin)
   */
  @Put(':id/approve-claim')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async approveRewardClaim(@Param('id', ParseIntPipe) claimId: number) {
    const claim = await this.rewardsService.approveRewardClaim(claimId);

    return {
      success: true,
      data: claim,
      message: 'Canje aprobado exitosamente',
    };
  }
}
