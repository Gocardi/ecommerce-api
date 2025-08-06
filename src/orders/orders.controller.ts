import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * RF-04: Crear pedido desde carrito (checkout)
   */
  @Post()
  @UseGuards(AuthGuard)
  async createOrder(
    @Body() orderData: {
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
    },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.ordersService.createOrder(
      req.user!.id,
      orderData,
      req.user!.role
    );

    return {
      success: true,
      data: result,
      message: 'Pedido creado exitosamente',
    };
  }

  /**
   * RF-09: Obtener mis pedidos
   */
  @Get('my-orders')
  @UseGuards(AuthGuard)
  async getMyOrders(
    @Query(new ValidationPipe({ transform: true })) filters: {
      status?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const parsedFilters = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    };

    const result = await this.ordersService.getUserOrders(req.user!.id, parsedFilters);

    return {
      success: true,
      data: result,
      message: 'Pedidos obtenidos exitosamente',
    };
  }

  /**
   * Obtener detalle de pedido
   */
  @Get(':id')
  @UseGuards(AuthGuard)
  async getOrderById(
    @Param('id', ParseIntPipe) orderId: number,
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.ordersService.getOrderById(orderId, req.user!.id);

    return {
      success: true,
      data: result,
      message: 'Detalle del pedido obtenido',
    };
  }

  /**
   * RF-13: Actualizar estado de pedido (admin)
   */
  @Put(':id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async updateOrderStatus(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() body: {
      status: string;
      trackingCode?: string;
      shalomAgency?: string;
      shalomGuide?: string;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.ordersService.updateOrderStatus(
      orderId,
      body.status,
      req.user!.id,
      {
        trackingCode: body.trackingCode,
        shalomAgency: body.shalomAgency,
        shalomGuide: body.shalomGuide,
      }
    );

    return {
      success: true,
      data: result,
      message: 'Estado del pedido actualizado',
    };
  }

  /**
   * RF-13: Obtener pedidos para administración
   */
  @Get('admin/list')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async getOrdersForAdmin(
    @Query(new ValidationPipe({ transform: true })) filters: {
      status?: string;
      region?: string;
      dateFrom?: string;
      dateTo?: string;
      page?: number;
      limit?: number;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const parsedFilters = {
      ...filters,
      dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
      dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
    };

    const result = await this.ordersService.getOrdersForAdmin(req.user!.id, parsedFilters);

    return {
      success: true,
      data: result,
      message: 'Pedidos administrativos obtenidos',
    };
  }
}
