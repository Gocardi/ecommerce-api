import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommissionsService } from '../commissions/commissions.service';
import { RewardsService } from '../rewards/rewards.service';
import { NotificationsService } from '../notifications/notifications.service';
import { MonthlyTrackingService } from '../monthly-tracking/monthly-tracking.service';

interface CreateOrderDto {
  shippingAddress: {
    name: string;
    phone: string;
    region: string;
    city: string;
    address: string;
    reference?: string;
  };
  paymentMethod: string;
  useStoredAddress?: boolean;
  addressId?: number;
}

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private commissionsService: CommissionsService,
    private rewardsService: RewardsService,
    private notificationsService: NotificationsService,
    private monthlyTrackingService: MonthlyTrackingService
  ) {}

  /**
   * RF-04: Crear pedido desde carrito (checkout)
   */
  async createOrder(userId: number, orderData: CreateOrderDto, userRole?: string) {
    // Verificar que el carrito tiene items
    const cart = await this.prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('El carrito está vacío');
    }

    // Verificar stock de todos los productos
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuficiente para ${item.product.name}. Disponible: ${item.product.stock}`
        );
      }
    }

    // Calcular totales
    let subtotal = 0;
    cart.items.forEach(item => {
      const price = userRole === 'afiliado' 
        ? Number(item.product.affiliatePrice) 
        : Number(item.product.publicPrice);
      subtotal += price * item.quantity;
    });

    const shippingCost = 15.00; // Temporal, después desde BusinessRules
    const totalAmount = subtotal + shippingCost;

    // Crear pedido en transacción
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Crear el pedido
      const order = await tx.order.create({
        data: {
          userId,
          status: 'pending',
          totalAmount,
          shippingCost,
        },
      });

      // 2. Crear items del pedido y actualizar stock
      for (const item of cart.items) {
        const unitPrice = userRole === 'afiliado' 
          ? Number(item.product.affiliatePrice) 
          : Number(item.product.publicPrice);

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice,
          },
        });

        // Reducir stock
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // 3. Guardar dirección de envío si es nueva
      let shippingAddressId: number | null = null; // Especificar el tipo correcto
      if (orderData.useStoredAddress && orderData.addressId) {
        shippingAddressId = orderData.addressId;
      } else {
        const newAddress = await tx.shippingAddress.create({
          data: {
            userId,
            ...orderData.shippingAddress,
          },
        });
        shippingAddressId = newAddress.id;
      }

      // 4. Actualizar pedido con dirección
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { shippingAddressId },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  category: true,
                },
              },
            },
          },
          shippingAddress: true,
        },
      });

      // 5. Limpiar carrito
      await tx.cartItem.deleteMany({
        where: { cartId: cart.id },
      });

      return updatedOrder;
    });

    return this.formatOrderResponse(result);
  }

  /**
   * RF-09: Obtener pedidos del usuario (historial filtrable)
   */
  async getUserOrders(userId: number, filters: {
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  } = {}) {
    const { status, dateFrom, dateTo, page = 1, limit = 10 } = filters;

    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          orderItems: {
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
          shippingAddress: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const formattedOrders = orders.map(order => this.formatOrderResponse(order));

    return {
      orders: formattedOrders,
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
   * Obtener detalle de un pedido específico
   */
  async getOrderById(orderId: number, userId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        shippingAddress: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    return this.formatOrderResponse(order);
  }

  /**
   * RF-13: Actualizar estado de pedido (admin)
   */
  async updateOrderStatus(
    orderId: number,
    status: string,
    adminId: number,
    trackingData?: {
      trackingCode?: string;
      shalomAgency?: string;
      shalomGuide?: string;
    }
  ) {
    // Verificar que el admin tiene permisos
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

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    const updateData: any = { status };

    if (trackingData) {
      if (trackingData.trackingCode) updateData.trackingCode = trackingData.trackingCode;
      if (trackingData.shalomAgency) updateData.shalomAgency = trackingData.shalomAgency;
      if (trackingData.shalomGuide) updateData.shalomGuide = trackingData.shalomGuide;
    }

    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        orderItems: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
          },
        },
        shippingAddress: true,
        payments: true,
      },
    });

    return this.formatOrderResponse(updatedOrder);
  }

  /**
   * Obtener pedidos para administración
   */
  async getOrdersForAdmin(adminId: number, filters: {
    status?: string;
    region?: string;
    dateFrom?: Date;
    dateTo?: Date;
    page?: number;
    limit?: number;
  } = {}) {
    const { status, region, dateFrom, dateTo, page = 1, limit = 20 } = filters;

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

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    // Filtrar por región si el admin no es admin_general
    if (admin.role === 'admin' || region) {
      const allowedRegions = admin.role === 'admin_general' 
        ? [region].filter(Boolean)
        : admin.adminRegions.map(ar => ar.region);

      if (allowedRegions.length > 0) {
        where.shippingAddress = {
          region: {
            in: region ? [region] : allowedRegions,
          },
        };
      }
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              dni: true,
              email: true,
            },
          },
          orderItems: {
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
          shippingAddress: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const formattedOrders = orders.map(order => ({
      ...this.formatOrderResponse(order),
      user: order.user,
    }));

    return {
      orders: formattedOrders,
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
   * Confirmar pago y generar comisiones
   */
  async confirmPayment(orderId: number, paymentData: {
    method: string;
    amount: number;
    reference?: string;
    bcpCode?: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException('Pedido no encontrado');
    }

    if (order.status !== 'pending') {
      throw new BadRequestException('El pedido ya ha sido procesado');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Crear registro de pago
      const payment = await tx.payment.create({
        data: {
          orderId,
          paidAt: new Date(),
          method: paymentData.method,
          amount: paymentData.amount,
          status: 'valid',
          reference: paymentData.reference,
          bcpCode: paymentData.bcpCode,
        },
      });

      // 2. Actualizar estado del pedido
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'paid' },
      });

      return { payment, order: updatedOrder };
    });

    // 3. Procesos posteriores al pago
    try {
      // Generar comisiones
      await this.commissionsService.calculateAndCreateCommissions(orderId);

      // Agregar puntos si es afiliado
      if (order.user.role === 'afiliado') {
        await this.rewardsService.addPointsForPurchase(
          order.userId,
          Number(order.totalAmount)
        );
      }

      // Verificar compra mensual
      if (order.user.role === 'afiliado') {
        await this.monthlyTrackingService.checkMonthlyBuy(
          order.userId,
          new Date()
        );
      }

      // Crear notificación de pago exitoso
      await this.notificationsService.createPaymentSuccessNotification(
        order.userId,
        orderId
      );
    } catch (error) {
      console.error('Error en procesos posteriores al pago:', error);
    }

    return result;
  }

  /**
   * Formatear respuesta de pedido
   */
  private formatOrderResponse(order: any) {
    return {
      id: order.id,
      status: order.status,
      totalAmount: Number(order.totalAmount),
      shippingCost: Number(order.shippingCost),
      trackingCode: order.trackingCode,
      shalomAgency: order.shalomAgency,
      shalomGuide: order.shalomGuide,
      createdAt: order.createdAt,
      scheduledDate: order.scheduledDate,
      deliveredAt: order.deliveredAt,
      orderItems: order.orderItems?.map(item => ({
        id: item.id,
        quantity: item.quantity,
        unitPrice: Number(item.unitPrice),
        totalPrice: Number(item.unitPrice) * item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          imageUrl: item.product.imageUrl,
          category: item.product.category,
        },
      })) || [],
      shippingAddress: order.shippingAddress,
      payments: order.payments?.map(payment => ({
        id: payment.id,
        amount: Number(payment.amount),
        method: payment.method,
        status: payment.status,
        paidAt: payment.paidAt,
        reference: payment.reference,
      })) || [],
    };
  }
}
