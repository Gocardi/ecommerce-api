import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * RF-12: Obtener notificaciones del usuario
   */
  async getUserNotifications(userId: number, filters: {
    unread?: boolean;
    type?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { unread, type, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (unread !== undefined) {
      where.readFlag = !unread;
    }

    if (type) {
      where.type = type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({
        where: { userId, readFlag: false },
      }),
    ]);

    return {
      unreadCount,
      notifications,
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
   * Marcar notificación como leída
   */
  async markAsRead(userId: number, notificationId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notificación no encontrada');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readFlag: true },
    });
  }

  /**
   * Marcar todas como leídas
   */
  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, readFlag: false },
      data: { readFlag: true },
    });
  }

  /**
   * Crear notificación
   */
  async createNotification(data: {
    userId: number;
    type: string;
    title: string;
    message: string;
  }) {
    return this.prisma.notification.create({ data });
  }

  /**
   * Crear notificaciones automáticas
   */
  async createPaymentSuccessNotification(userId: number, orderId: number) {
    return this.createNotification({
      userId,
      type: 'payment_ok',
      title: 'Pago confirmado',
      message: `Tu pedido #${orderId} ha sido pagado exitosamente.`,
    });
  }

  async createCommissionNotification(userId: number, amount: number, type: string) {
    return this.createNotification({
      userId,
      type: 'commission',
      title: 'Nueva comisión',
      message: `Has ganado S/ ${amount.toFixed(2)} en comisión por ${type === 'direct' ? 'venta directa' : 'referido'}.`,
    });
  }
}
