import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Estadísticas de rendimiento del afiliado
   */
  async getAffiliatePerformance(affiliateId: number) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

    // Métricas de ventas
    const [totalSales, monthlyOrders, totalOrders] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          userId: affiliateId,
          status: { in: ['paid', 'shipped', 'delivered'] },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: {
          userId: affiliateId,
          status: { in: ['paid', 'shipped', 'delivered'] },
          createdAt: {
            gte: currentMonth,
            lt: nextMonth,
          },
        },
      }),
      this.prisma.order.count({
        where: {
          userId: affiliateId,
          status: { in: ['paid', 'shipped', 'delivered'] },
        },
      }),
    ]);

    // Métricas de red
    const [totalReferrals, activeReferrals] = await Promise.all([
      this.prisma.affiliate.count({
        where: { sponsorId: affiliateId },
      }),
      this.prisma.affiliate.count({
        where: {
          sponsorId: affiliateId,
          status: 'active',
          user: { isActive: true },
        },
      }),
    ]);

    // Métricas de comisiones
    const [totalCommissions, monthlyCommissions, pendingCommissions] = await Promise.all([
      this.prisma.commission.aggregate({
        where: {
          affiliateId,
          status: { in: ['approved', 'paid'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: {
          affiliateId,
          status: { in: ['approved', 'paid'] },
          createdAt: {
            gte: currentMonth,
            lt: nextMonth,
          },
        },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: {
          affiliateId,
          status: 'pending',
        },
        _sum: { amount: true },
      }),
    ]);

    // Estado de compra mensual
    const monthlyBuy = await this.prisma.minMonthlyBuy.findUnique({
      where: {
        uq_aff_month: {
          affiliateId,
          month: currentMonth,
        },
      },
    });

    return {
      salesMetrics: {
        totalSales: Number(totalSales._sum.totalAmount || 0),
        monthlyGrowth: monthlyOrders > 0 ? (monthlyOrders / Math.max(totalOrders - monthlyOrders, 1)) * 100 : 0,
        averageOrderValue: totalOrders > 0 ? Number(totalSales._sum.totalAmount || 0) / totalOrders : 0,
        conversionRate: 8.2, // Temporal
      },
      networkMetrics: {
        totalReferrals,
        activeReferrals,
        networkGrowthRate: totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0,
      },
      commissionMetrics: {
        totalEarned: Number(totalCommissions._sum.amount || 0),
        monthlyEarnings: Number(monthlyCommissions._sum.amount || 0),
        pendingCommissions: Number(pendingCommissions._sum.amount || 0),
      },
      monthlyBuyStatus: {
        currentMonth: monthlyBuy?.achieved || false,
        streak: 8, // Temporal
        complianceRate: 85.7, // Temporal
      },
    };
  }

  /**
   * Productos más vendidos
   */
  async getTopProducts() {
    const topProducts = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      _count: {
        productId: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 10,
    });

    const productsWithDetails = await Promise.all(
      topProducts.map(async (item) => {
        const product = await this.prisma.product.findUnique({
          where: { id: item.productId },
          include: {
            category: {
              select: {
                name: true,
              },
            },
          },
        });

        // Calcular revenue
        const revenue = await this.prisma.orderItem.aggregate({
          where: { productId: item.productId },
          _sum: {
            unitPrice: true,
          },
        });

        return {
          productId: item.productId,
          name: product?.name || 'Producto eliminado',
          totalSold: item._sum.quantity || 0,
          revenue: Number(revenue._sum.unitPrice || 0),
          category: product?.category?.name || 'Sin categoría',
        };
      })
    );

    return productsWithDetails;
  }
}
