import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  /**
   * RF-13, RF-14: Dashboard administrativo
   */
  async getDashboard(adminId: number) {
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

    const isGlobalAdmin = admin.role === 'admin_general';
    const regions = isGlobalAdmin ? [] : admin.adminRegions.map(ar => ar.region);

    const [kpis, recentOrders, lowStockProducts, pendingCommissions] = await Promise.all([
      this.getKPIs(isGlobalAdmin, regions),
      this.getRecentOrders(isGlobalAdmin, regions, 10),
      this.getLowStockProducts(10),
      this.getPendingCommissionsCount(isGlobalAdmin, regions),
    ]);

    return {
      kpis,
      recentOrders,
      lowStockProducts,
      pendingCommissions,
      adminInfo: {
        role: admin.role,
        regions: regions,
        isGlobal: isGlobalAdmin,
      },
    };
  }

  /**
   * Obtener KPIs principales
   */
  private async getKPIs(isGlobal: boolean, regions: string[]) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

    const regionFilter = isGlobal ? {} : {
      shippingAddress: {
        region: { in: regions },
      },
    };

    const [
      totalSales,
      monthlyOrders,
      activeAffiliates,
      pendingCommissions,
      monthlyRevenue,
      totalUsers
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          status: { in: ['paid', 'shipped', 'delivered'] },
          ...regionFilter,
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: {
          status: { in: ['paid', 'shipped', 'delivered'] },
          createdAt: {
            gte: currentMonth,
            lt: nextMonth,
          },
          ...regionFilter,
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'afiliado',
          isActive: true,
          ...(isGlobal ? {} : {
            affiliate: {
              region: { in: regions },
            },
          }),
        },
      }),
      this.prisma.commission.aggregate({
        where: {
          status: 'pending',
          ...(isGlobal ? {} : {
            affiliate: {
              affiliate: {
                region: { in: regions },
              },
            },
          }),
        },
        _sum: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          status: { in: ['paid', 'shipped', 'delivered'] },
          createdAt: {
            gte: currentMonth,
            lt: nextMonth,
          },
          ...regionFilter,
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.user.count({
        where: {
          isActive: true,
          ...(isGlobal ? {} : {
            OR: [
              { role: 'visitante' },
              {
                role: 'afiliado',
                affiliate: {
                  region: { in: regions },
                },
              },
            ],
          }),
        },
      }),
    ]);

    return {
      totalSales: Number(totalSales._sum.totalAmount || 0),
      monthlyOrders,
      monthlyRevenue: Number(monthlyRevenue._sum.totalAmount || 0),
      activeAffiliates,
      totalUsers,
      pendingCommissions: Number(pendingCommissions._sum?.amount || 0),
    };
  }

  /**
   * Obtener pedidos recientes
   */
  private async getRecentOrders(isGlobal: boolean, regions: string[], limit: number) {
    const regionFilter = isGlobal ? {} : {
      shippingAddress: {
        region: { in: regions },
      },
    };

    return this.prisma.order.findMany({
      where: regionFilter,
      include: {
        user: {
          select: {
            fullName: true,
            dni: true,
          },
        },
        shippingAddress: {
          select: {
            region: true,
            city: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Obtener productos con stock bajo
   */
  private async getLowStockProducts(limit: number) {
    return this.prisma.product.findMany({
      where: {
        isActive: true,
        stock: {
          lte: this.prisma.product.fields.minStock,
        },
      },
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { stock: 'asc' },
      take: limit,
    });
  }

  /**
   * Contar comisiones pendientes
   */
  private async getPendingCommissionsCount(isGlobal: boolean, regions: string[]) {
    return this.prisma.commission.count({
      where: {
        status: 'pending',
        ...(isGlobal ? {} : {
          affiliate: {
            affiliate: {
              region: { in: regions },
            },
          },
        }),
      },
    });
  }

  /**
   * RF-13: Gestión de usuarios
   */
  async getUsers(adminId: number, filters: {
    role?: string;
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
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

    const { role, search, isActive, page = 1, limit = 20 } = filters;
    const isGlobal = admin.role === 'admin_general';
    const regions = isGlobal ? [] : admin.adminRegions.map(ar => ar.region);

    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { dni: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Filtrar por región si no es admin global
    if (!isGlobal) {
      where.OR = [
        { role: 'visitante' },
        {
          role: 'afiliado',
          affiliate: {
            region: { in: regions },
          },
        },
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          affiliate: {
            select: {
              region: true,
              city: true,
              phone: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users: users.map(user => ({
        id: user.id,
        dni: user.dni,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        maxReferrals: user.maxReferrals,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        affiliate: user.affiliate,
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
   * Activar/desactivar usuario
   */
  async toggleUserStatus(adminId: number, userId: number, isActive: boolean) {
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

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // No permitir que se desactiven a sí mismos
    if (userId === adminId) {
      throw new BadRequestException('No puedes cambiar tu propio estado');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    return {
      success: true,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        isActive: updatedUser.isActive,
      },
    };
  }
}
