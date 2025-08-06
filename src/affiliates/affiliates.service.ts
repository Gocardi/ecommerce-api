import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AffiliatesService {
  constructor(private prisma: PrismaService) {}

  /**
   * RF-08: Panel "Mi red de afiliados"
   */
  async getAffiliateNetwork(affiliateId: number, filters: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { search, status, page = 1, limit = 20 } = filters;

    // Verificar que el usuario es afiliado
    const affiliate = await this.prisma.user.findFirst({
      where: {
        id: affiliateId,
        role: 'afiliado',
        isActive: true,
      },
    });

    if (!affiliate) {
      throw new NotFoundException('Afiliado no encontrado');
    }

    const where: any = {
      sponsorId: affiliateId,
    };

    if (status) {
      where.status = status;
    }

    if (search) {
      where.user = {
        OR: [
          { fullName: { contains: search, mode: 'insensitive' } },
          { dni: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const skip = (page - 1) * limit;

    const [affiliates, total, summary] = await Promise.all([
      this.prisma.affiliate.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              dni: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.affiliate.count({ where }),
      this.getNetworkSummary(affiliateId),
    ]);

    // Obtener estadísticas para cada afiliado
    const affiliatesWithStats = await Promise.all(
      affiliates.map(async (affiliate) => {
        const stats = await this.getAffiliateStats(affiliate.user.id);
        return {
          id: affiliate.id,
          fullName: affiliate.user.fullName,
          dni: affiliate.user.dni,
          phone: affiliate.phone,
          city: affiliate.city,
          status: affiliate.status,
          isActive: affiliate.user.isActive,
          referredAt: affiliate.createdAt,
          stats,
        };
      })
    );

    return {
      summary,
      affiliates: affiliatesWithStats,
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
   * Obtener resumen de la red
   */
  private async getNetworkSummary(affiliateId: number) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

    const [
      totalAffiliates,
      activeAffiliates,
      totalCommissions,
      monthlyCommissions
    ] = await Promise.all([
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
      this.prisma.commission.aggregate({
        where: {
          affiliateId,
          type: 'referral',
          status: { in: ['approved', 'paid'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: {
          affiliateId,
          type: 'referral',
          status: { in: ['approved', 'paid'] },
          createdAt: {
            gte: currentMonth,
            lt: nextMonth,
          },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalAffiliates,
      activeAffiliates,
      totalCommissionsGenerated: Number(totalCommissions._sum.amount || 0),
      monthlyCommissionsGenerated: Number(monthlyCommissions._sum.amount || 0),
    };
  }

  /**
   * Obtener estadísticas de un afiliado específico
   */
  private async getAffiliateStats(affiliateId: number) {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

    const [
      totalOrders,
      monthlyOrders,
      totalSpent,
      monthlySpent,
      commissionsGenerated,
      monthlyCommissionsGenerated
    ] = await Promise.all([
      this.prisma.order.count({
        where: {
          userId: affiliateId,
          status: { in: ['paid', 'shipped', 'delivered'] },
        },
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
      this.prisma.order.aggregate({
        where: {
          userId: affiliateId,
          status: { in: ['paid', 'shipped', 'delivered'] },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          userId: affiliateId,
          status: { in: ['paid', 'shipped', 'delivered'] },
          createdAt: {
            gte: currentMonth,
            lt: nextMonth,
          },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.commission.aggregate({
        where: {
          orderItem: {
            order: {
              userId: affiliateId,
            },
          },
          type: 'referral',
          status: { in: ['approved', 'paid'] },
        },
        _sum: { amount: true },
      }),
      this.prisma.commission.aggregate({
        where: {
          orderItem: {
            order: {
              userId: affiliateId,
            },
          },
          type: 'referral',
          status: { in: ['approved', 'paid'] },
          createdAt: {
            gte: currentMonth,
            lt: nextMonth,
          },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalOrders,
      monthlyOrders,
      totalSpent: Number(totalSpent._sum.totalAmount || 0),
      monthlySpent: Number(monthlySpent._sum.totalAmount || 0),
      commissionsGenerated: Number(commissionsGenerated._sum.amount || 0),
      monthlyCommissionsGenerated: Number(monthlyCommissionsGenerated._sum.amount || 0),
    };
  }

  /**
   * RF-02: Registrar nuevo afiliado
   */
  async registerReferral(sponsorId: number, referralData: {
    dni: string;
    fullName: string;
    email: string;
    phone: string;
    region: string;
    city: string;
    address: string;
    reference?: string;
  }) {
    // Verificar sponsor
    const sponsor = await this.prisma.user.findFirst({
      where: {
        id: sponsorId,
        role: { in: ['afiliado', 'admin', 'admin_general'] },
        isActive: true,
      },
      include: {
        sponsoredAffiliates: true,
      },
    });

    if (!sponsor) {
      throw new BadRequestException('Patrocinador no válido');
    }

    // Verificar límite de referidos
    if (sponsor.role === 'afiliado' && sponsor.maxReferrals) {
      if (sponsor.sponsoredAffiliates.length >= sponsor.maxReferrals) {
        throw new BadRequestException('Has alcanzado el límite máximo de referidos');
      }
    }

    // Verificar si ya existe
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { dni: referralData.dni },
          { email: referralData.email },
        ],
      },
    });

    if (existingUser) {
      if (existingUser.dni === referralData.dni) {
        throw new BadRequestException('El DNI ya está registrado');
      }
      if (existingUser.email === referralData.email) {
        throw new BadRequestException('El email ya está registrado');
      }
    }

    // Generar contraseña temporal
    const tempPassword = this.generateTemporaryPassword();

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          dni: referralData.dni,
          fullName: referralData.fullName,
          email: referralData.email,
          passwordHash: await this.hashPassword(tempPassword),
          role: 'afiliado',
          maxReferrals: 10,
          createdBy: sponsorId,
        },
      });

      await tx.affiliate.create({
        data: {
          id: user.id,
          sponsorId: sponsorId,
          phone: referralData.phone,
          region: referralData.region,
          city: referralData.city,
          address: referralData.address,
          reference: referralData.reference || null,
        },
      });

      await tx.referral.create({
        data: {
          referrerId: sponsorId,
          referredId: user.id,
        },
      });

      return { user, tempPassword };
    });

    return {
      user: {
        id: result.user.id,
        dni: result.user.dni,
        fullName: result.user.fullName,
        email: result.user.email,
        role: result.user.role,
        tempPassword: result.tempPassword,
      },
      message: 'Afiliado registrado exitosamente. Comparte la contraseña temporal con el nuevo afiliado.',
    };
  }

  /**
   * Obtener estadísticas de un afiliado específico (público para el sponsor)
   */
  async getAffiliateStatsById(sponsorId: number, affiliateId: number) {
    // Verificar que el afiliado pertenece al sponsor
    const affiliate = await this.prisma.affiliate.findFirst({
      where: {
        id: affiliateId,
        sponsorId: sponsorId,
      },
      include: {
        user: {
          select: {
            fullName: true,
            dni: true,
            isActive: true,
          },
        },
      },
    });

    if (!affiliate) {
      throw new NotFoundException('Afiliado no encontrado en tu red');
    }

    const stats = await this.getAffiliateStats(affiliateId);

    return {
      affiliate: {
        id: affiliate.id,
        fullName: affiliate.user.fullName,
        dni: affiliate.user.dni,
        phone: affiliate.phone,
        city: affiliate.city,
        status: affiliate.status,
        isActive: affiliate.user.isActive,
      },
      stats,
    };
  }

  /**
   * Activar/desactivar afiliado de la red
   */
  async toggleAffiliateStatus(sponsorId: number, affiliateId: number, status: 'active' | 'inactive') {
    // Verificar que el afiliado pertenece al sponsor
    const affiliate = await this.prisma.affiliate.findFirst({
      where: {
        id: affiliateId,
        sponsorId: sponsorId,
      },
    });

    if (!affiliate) {
      throw new NotFoundException('Afiliado no encontrado en tu red');
    }

    const updatedAffiliate = await this.prisma.affiliate.update({
      where: { id: affiliateId },
      data: { status },
      include: {
        user: {
          select: {
            fullName: true,
            dni: true,
          },
        },
      },
    });

    return {
      success: true,
      affiliate: {
        id: updatedAffiliate.id,
        fullName: updatedAffiliate.user.fullName,
        status: updatedAffiliate.status,
      },
    };
  }

  /**
   * Generar contraseña temporal
   */
  private generateTemporaryPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Hash password (temporal hasta importar AuthUtil)
   */
  private async hashPassword(password: string): Promise<string> {
    // Temporal - debería importarse desde AuthUtil
    const bcrypt = require('bcrypt');
    return bcrypt.hash(password, 10);
  }
}
