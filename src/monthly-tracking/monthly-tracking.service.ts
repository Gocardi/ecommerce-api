import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class MonthlyTrackingService {
  constructor(private prisma: PrismaService) {}

  /**
   * RF-05: Verificar compra mínima mensual
   */
  async checkMonthlyBuy(affiliateId: number, month: Date): Promise<boolean> {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);

    // Contar productos comprados en el mes
    const orderItems = await this.prisma.orderItem.findMany({
      where: {
        order: {
          userId: affiliateId,
          status: { in: ['paid', 'shipped', 'delivered'] },
          createdAt: {
            gte: monthStart,
            lt: nextMonth,
          },
        },
      },
    });

    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);

    // Obtener compra mínima de reglas de negocio
    const businessRule = await this.prisma.businessRule.findUnique({
      where: { key: 'minMonthlyBuy' },
    });

    const minMonthlyBuy = businessRule ? parseInt(businessRule.value) : 1;

    // Crear o actualizar registro
    await this.prisma.minMonthlyBuy.upsert({
      where: {
        uq_aff_month: {
          affiliateId,
          month: monthStart,
        },
      },
      update: {
        quantity: totalQuantity,
        achieved: totalQuantity >= minMonthlyBuy,
      },
      create: {
        affiliateId,
        month: monthStart,
        quantity: totalQuantity,
        achieved: totalQuantity >= minMonthlyBuy,
      },
    });

    return totalQuantity >= minMonthlyBuy;
  }

  /**
   * Verificar y desactivar cuentas que no cumplan compra mínima
   */
  @Cron('0 0 1 * *') // Primer día de cada mes a las 00:00
  async deactivateInactiveAffiliates() {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const affiliates = await this.prisma.user.findMany({
      where: {
        role: 'afiliado',
        isActive: true,
      },
    });

    for (const affiliate of affiliates) {
      const achieved = await this.checkMonthlyBuy(affiliate.id, lastMonth);
      
      if (!achieved) {
        await this.prisma.user.update({
          where: { id: affiliate.id },
          data: { isActive: false },
        });

        // Crear notificación
        await this.prisma.notification.create({
          data: {
            userId: affiliate.id,
            type: 'account_pending',
            title: 'Cuenta desactivada',
            message: 'Tu cuenta ha sido desactivada por no cumplir la compra mínima mensual.',
          },
        });
      }
    }
  }

  /**
   * Obtener historial de compras mensuales
   */
  async getMonthlyHistory(affiliateId: number, months = 12) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return this.prisma.minMonthlyBuy.findMany({
      where: {
        affiliateId,
        month: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { month: 'desc' },
    });
  }

  /**
   * Obtener estado actual del mes
   */
  async getCurrentMonthStatus(affiliateId: number) {
    const currentMonth = new Date();
    currentMonth.setDate(1);

    const achieved = await this.checkMonthlyBuy(affiliateId, currentMonth);

    // Obtener compra mínima requerida
    const businessRule = await this.prisma.businessRule.findUnique({
      where: { key: 'minMonthlyBuy' },
    });

    const required = businessRule ? parseInt(businessRule.value) : 1;

    // Obtener registro actual
    const monthlyRecord = await this.prisma.minMonthlyBuy.findUnique({
      where: {
        uq_aff_month: {
          affiliateId,
          month: currentMonth,
        },
      },
    });

    const quantity = monthlyRecord?.quantity || 0;

    // Calcular días restantes en el mes
    const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const today = new Date();
    const daysRemaining = Math.max(0, lastDayOfMonth.getDate() - today.getDate());

    return {
      currentMonth,
      quantity,
      required,
      achieved,
      daysRemaining,
      status: achieved ? 'compliant' : 'pending',
    };
  }
}
