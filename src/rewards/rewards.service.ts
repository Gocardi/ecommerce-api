import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RewardsService {
  constructor(private prisma: PrismaService) {}

  /**
   * RF-10: Catálogo de premios
   */
  async getRewards() {
    return this.prisma.reward.findMany({
      where: { isActive: true },
      orderBy: { pointsRequired: 'asc' },
    });
  }

  /**
   * RF-10: Puntos del afiliado
   */
  async getAffiliatePoints(affiliateId: number) {
    const affiliate = await this.prisma.affiliate.findUnique({
      where: { id: affiliateId },
    });

    if (!affiliate) {
      throw new NotFoundException('Afiliado no encontrado');
    }

    // Obtener premios disponibles con los puntos actuales
    const availableRewards = await this.prisma.reward.findMany({
      where: {
        isActive: true,
        pointsRequired: { lte: affiliate.points },
        stock: { gt: 0 },
      },
      orderBy: { pointsRequired: 'asc' },
    });

    // Calcular total ganado y gastado
    const claims = await this.prisma.rewardClaim.findMany({
      where: { affiliateId },
    });

    const totalSpent = claims.reduce((sum, claim) => sum + claim.pointsUsed, 0);
    const totalEarned = affiliate.points + totalSpent;

    return {
      currentPoints: affiliate.points,
      totalEarned,
      totalSpent,
      availableRewards: availableRewards.map(reward => ({
        id: reward.id,
        name: reward.name,
        pointsRequired: reward.pointsRequired,
        imageUrl: reward.imageUrl,
      })),
    };
  }

  /**
   * RF-10: Canjear premio
   */
  async claimReward(affiliateId: number, rewardId: number) {
    return this.prisma.$transaction(async (tx) => {
      const affiliate = await tx.affiliate.findUnique({
        where: { id: affiliateId },
      });

      if (!affiliate) {
        throw new NotFoundException('Afiliado no encontrado');
      }

      const reward = await tx.reward.findUnique({
        where: { id: rewardId },
      });

      if (!reward || !reward.isActive) {
        throw new NotFoundException('Premio no encontrado');
      }

      if (reward.stock <= 0) {
        throw new BadRequestException('Premio agotado');
      }

      if (affiliate.points < reward.pointsRequired) {
        throw new BadRequestException('Puntos insuficientes');
      }

      // Descontar puntos
      await tx.affiliate.update({
        where: { id: affiliateId },
        data: { points: affiliate.points - reward.pointsRequired },
      });

      // Reducir stock del premio
      await tx.reward.update({
        where: { id: rewardId },
        data: { stock: reward.stock - 1 },
      });

      // Crear registro de canje
      const claim = await tx.rewardClaim.create({
        data: {
          affiliateId,
          rewardId,
          pointsUsed: reward.pointsRequired,
          status: 'pending',
        },
        include: {
          reward: true,
        },
      });

      // Crear notificación
      await tx.notification.create({
        data: {
          userId: affiliateId,
          type: 'reward_claimed',
          title: 'Premio canjeado',
          message: `Has canjeado ${reward.name} por ${reward.pointsRequired} puntos.`,
        },
      });

      return claim;
    });
  }

  /**
   * Historial de canjes
   */
  async getClaimHistory(affiliateId: number) {
    return this.prisma.rewardClaim.findMany({
      where: { affiliateId },
      include: {
        reward: {
          select: {
            name: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { claimedAt: 'desc' },
    });
  }

  /**
   * Agregar puntos por compra
   */
  async addPointsForPurchase(affiliateId: number, orderAmount: number) {
    // 1 punto por cada S/ 10 gastados
    const pointsToAdd = Math.floor(orderAmount / 10);

    if (pointsToAdd > 0) {
      await this.prisma.affiliate.update({
        where: { id: affiliateId },
        data: {
          points: {
            increment: pointsToAdd,
          },
        },
      });

      // Crear notificación
      await this.prisma.notification.create({
        data: {
          userId: affiliateId,
          type: 'points_earned',
          title: 'Puntos ganados',
          message: `Has ganado ${pointsToAdd} puntos por tu compra.`,
        },
      });
    }

    return pointsToAdd;
  }

  // Métodos para administradores
  async createReward(rewardData: {
    name: string;
    description?: string;
    pointsRequired: number;
    imageUrl?: string;
    stock: number;
  }) {
    return this.prisma.reward.create({
      data: rewardData,
    });
  }

  async updateReward(id: number, updateData: any) {
    return this.prisma.reward.update({
      where: { id },
      data: updateData,
    });
  }

  async approveRewardClaim(claimId: number) {
    return this.prisma.rewardClaim.update({
      where: { id: claimId },
      data: {
        status: 'approved',
        deliveredAt: new Date(),
      },
    });
  }
}
