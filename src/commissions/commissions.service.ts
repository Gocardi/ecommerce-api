import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommissionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * RF-06: Cálculo automático de comisiones al confirmar pago
   */
  async calculateAndCreateCommissions(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          include: {
            affiliate: true,
            referralsReceived: {
              include: {
                referrer: {
                  include: {
                    affiliate: true,
                  },
                },
              },
            },
          },
        },
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    // Obtener reglas de negocio
    const businessRules = await this.getBusinessRules();
    const commissions: any[] = []; // Especificar tipo

    for (const item of order.orderItems) {
      // Comisión por venta directa (si el comprador es afiliado)
      if (order.user.role === 'afiliado') {
        const directCommission = await this.createDirectCommission(
          order.user.id,
          item,
          businessRules.directSaleCommissionPercentage
        );
        commissions.push(directCommission);
      }

      // Comisión por referido (si el comprador fue referido por alguien)
      if (order.user.referralsReceived.length > 0) {
        const referrer = order.user.referralsReceived[0].referrer;
        if (referrer.role === 'afiliado' && referrer.isActive) {
          const referralCommission = await this.createReferralCommission(
            referrer.id,
            item,
            businessRules.referralCommissionPercentage
          );
          commissions.push(referralCommission);
        }
      }
    }

    return commissions;
  }

  /**
   * Crear comisión por venta directa
   */
  private async createDirectCommission(affiliateId: number, orderItem: any, percentage: number) {
    const amount = (Number(orderItem.unitPrice) * orderItem.quantity * percentage) / 100;

    return this.prisma.commission.create({
      data: {
        affiliateId,
        orderItemId: orderItem.id,
        type: 'direct',
        amount,
        percentage,
        status: 'pending',
      },
    });
  }

  /**
   * Crear comisión por referido
   */
  private async createReferralCommission(affiliateId: number, orderItem: any, percentage: number) {
    const amount = (Number(orderItem.unitPrice) * orderItem.quantity * percentage) / 100;

    return this.prisma.commission.create({
      data: {
        affiliateId,
        orderItemId: orderItem.id,
        type: 'referral',
        amount,
        percentage,
        status: 'pending',
      },
    });
  }

  /**
   * RF-07: Panel "Mis Comisiones" para afiliado
   */
  async getAffiliateCommissions(affiliateId: number, filters: {
    month?: string;
    type?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { month, type, status, page = 1, limit = 20 } = filters;

    const where: any = { affiliateId };

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (month) {
      const monthDate = new Date(month + '-01');
      const nextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      
      where.createdAt = {
        gte: monthDate,
        lt: nextMonth,
      };
    }

    const skip = (page - 1) * limit;

    const [commissions, total, summary] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        include: {
          orderItem: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  imageUrl: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.commission.count({ where }),
      this.getCommissionSummary(affiliateId, month),
    ]);

    return {
      summary,
      commissions: commissions.map(commission => ({
        id: commission.id,
        type: commission.type,
        amount: Number(commission.amount),
        percentage: Number(commission.percentage),
        status: commission.status,
        createdAt: commission.createdAt,
        approvedAt: commission.approvedAt,
        orderItem: {
          product: commission.orderItem.product,
          quantity: commission.orderItem.quantity,
          unitPrice: Number(commission.orderItem.unitPrice),
        },
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Obtener resumen de comisiones
   */
  private async getCommissionSummary(affiliateId: number, month?: string) {
    const currentMonth = month ? new Date(month + '-01') : new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

    const [currentMonthStats, allTimeStats] = await Promise.all([
      this.prisma.commission.groupBy({
        by: ['type', 'status'],
        where: {
          affiliateId,
          createdAt: {
            gte: currentMonth,
            lt: nextMonth,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      this.prisma.commission.groupBy({
        by: ['type', 'status'],
        where: { affiliateId },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const formatStats = (stats: any[]) => {
      const result = {
        total: 0,
        direct: 0,
        referral: 0,
        pending: 0,
        approved: 0,
        paid: 0,
      };

      stats.forEach(stat => {
        const amount = Number(stat._sum.amount || 0);
        result.total += amount;
        result[stat.type] += amount;
        result[stat.status] += amount;
      });

      return result;
    };

    return {
      currentMonth: formatStats(currentMonthStats),
      allTime: formatStats(allTimeStats),
    };
  }

  /**
   * RF-07: Desglose por referido
   */
  async getCommissionsByReferral(affiliateId: number, month?: string) {
    const monthFilter = month ? {
      createdAt: {
        gte: new Date(month + '-01'),
        lt: new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 1),
      },
    } : {};

    const commissions = await this.prisma.commission.findMany({
      where: {
        affiliateId,
        type: 'referral',
        ...monthFilter,
      },
      include: {
        orderItem: {
          include: {
            order: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    dni: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Agrupar por referido
    const referralMap = new Map();

    commissions.forEach(commission => {
      const referral = commission.orderItem.order.user;
      const key = referral.id;

      if (!referralMap.has(key)) {
        referralMap.set(key, {
          referral,
          totalCommissions: 0,
          monthlyCommissions: 0,
          totalOrders: new Set(),
        });
      }

      const entry = referralMap.get(key);
      entry.totalCommissions += Number(commission.amount);
      entry.totalOrders.add(commission.orderItem.order.id);

      if (month) {
        entry.monthlyCommissions += Number(commission.amount);
      }
    });

    return Array.from(referralMap.values()).map(entry => ({
      referral: entry.referral,
      totalCommissions: Math.round(entry.totalCommissions * 100) / 100,
      monthlyCommissions: Math.round(entry.monthlyCommissions * 100) / 100,
      totalOrders: entry.totalOrders.size,
    }));
  }

  /**
   * RF-13: Aprobar comisión (admin)
   */
  async approveCommission(commissionId: number, adminId: number) {
    // Verificar permisos
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['admin', 'admin_general'] },
        isActive: true,
      },
    });

    if (!admin) {
      throw new BadRequestException('No tienes permisos para esta acción');
    }

    const commission = await this.prisma.commission.findUnique({
      where: { id: commissionId },
      include: {
        affiliate: {
          select: {
            id: true,
          },
        },
        orderItem: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!commission) {
      throw new NotFoundException('Comisión no encontrada');
    }

    if (commission.status !== 'pending') {
      throw new BadRequestException('La comisión ya ha sido procesada');
    }

    return this.prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: 'approved',
        approvedAt: new Date(),
      },
      include: {
        affiliate: {
          select: {
            id: true,
          },
        },
        orderItem: {
          include: {
            product: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * RF-13: Obtener comisiones pendientes (admin)
   */
  async getPendingCommissions(adminId: number, filters: {
    region?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { region, page = 1, limit = 20 } = filters;

    // Verificar permisos del admin
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['admin', 'admin_general'] },
        isActive: true,
      },
      include: {
        adminRegions: true,
      },
    });

    if (!admin) {
      throw new BadRequestException('No tienes permisos para esta acción');
    }

    const where: any = { status: 'pending' };

    const skip = (page - 1) * limit;

    const [commissions, total] = await Promise.all([
      this.prisma.commission.findMany({
        where,
        include: {
          affiliate: {
            include: {
              affiliate: true, // Incluir datos del afiliado
            },
          },
          orderItem: {
            include: {
              product: {
                select: {
                  name: true,
                },
              },
              order: {
                select: {
                  id: true,
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.commission.count({ where }),
    ]);

    // Filtrar por región si no es admin general
    let filteredCommissions = commissions;
    if (admin.role === 'admin' || region) {
      const allowedRegions = admin.role === 'admin_general' 
        ? (region ? [region] : [])
        : admin.adminRegions.map(ar => ar.region);

      if (allowedRegions.length > 0) {
        filteredCommissions = commissions.filter(commission => 
          commission.affiliate.affiliate && 
          allowedRegions.includes(commission.affiliate.affiliate.region)
        );
      }
    }

    return {
      commissions: filteredCommissions.map(commission => ({
        id: commission.id,
        type: commission.type,
        amount: Number(commission.amount),
        percentage: Number(commission.percentage),
        status: commission.status,
        createdAt: commission.createdAt,
        affiliate: {
          id: commission.affiliate.id,
          fullName: commission.affiliate.fullName,
          dni: commission.affiliate.dni,
          region: commission.affiliate.affiliate?.region || '',
          city: commission.affiliate.affiliate?.city || '',
        },
        orderItem: {
          product: commission.orderItem.product,
          quantity: commission.orderItem.quantity,
          unitPrice: Number(commission.orderItem.unitPrice),
          order: commission.orderItem.order,
        },
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(filteredCommissions.length / limit),
        totalItems: filteredCommissions.length,
        itemsPerPage: limit,
        hasNextPage: page < Math.ceil(filteredCommissions.length / limit),
        hasPrevPage: page > 1,
      },
    };
  }

  /**
   * Obtener reglas de negocio
   */
  private async getBusinessRules() {
    const rules = await this.prisma.businessRule.findMany({
      where: {
        key: {
          in: ['referralCommissionPercentage', 'directSaleCommissionPercentage'],
        },
      },
    });

    const rulesMap = rules.reduce((acc, rule) => {
      acc[rule.key] = rule.type === 'number' ? parseFloat(rule.value) : rule.value;
      return acc;
    }, {} as any);

    return {
      referralCommissionPercentage: rulesMap.referralCommissionPercentage || 10,
      directSaleCommissionPercentage: rulesMap.directSaleCommissionPercentage || 20,
    };
  }

  /**
   * Marcar comisiones como pagadas
   */
  async markCommissionsAsPaid(commissionIds: number[], adminId: number) {
    // Verificar permisos
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: { in: ['admin', 'admin_general'] },
        isActive: true,
      },
    });

    if (!admin) {
      throw new BadRequestException('No tienes permisos para esta acción');
    }

    const result = await this.prisma.commission.updateMany({
      where: {
        id: { in: commissionIds },
        status: 'approved',
      },
      data: {
        status: 'paid',
      },
    });

    return {
      success: true,
      updatedCount: result.count,
    };
  }
}