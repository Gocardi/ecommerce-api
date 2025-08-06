import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { CartService } from './cart.service';
import { AuthGuard } from '../guards/auth.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getUserCart(@Request() req: AuthenticatedRequest) {
    const result = await this.cartService.getUserCart(req.user!.id, req.user!.role);

    return {
      success: true,
      data: result,
      message: 'Carrito obtenido exitosamente',
    };
  }

  @Post('items')
  @UseGuards(AuthGuard)
  async addItem(
    @Body() body: { productId: number; quantity: number },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.cartService.addItem(
      req.user!.id,
      body.productId,
      body.quantity
    );

    return {
      success: true,
      data: result,
      message: 'Producto agregado al carrito',
    };
  }

  @Put('items/:itemId')
  @UseGuards(AuthGuard)
  async updateItemQuantity(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: { quantity: number },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.cartService.updateItemQuantity(
      req.user!.id,
      itemId,
      body.quantity
    );

    return {
      success: true,
      data: result,
      message: 'Cantidad actualizada',
    };
  }

  @Delete('items/:itemId')
  @UseGuards(AuthGuard)
  async removeItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.cartService.removeItem(req.user!.id, itemId);

    return {
      success: true,
      data: result,
      message: 'Producto eliminado del carrito',
    };
  }

  @Delete()
  @UseGuards(AuthGuard)
  async clearCart(@Request() req: AuthenticatedRequest) {
    const result = await this.cartService.clearCart(req.user!.id);

    return {
      success: true,
      data: result,
      message: 'Carrito vaciado exitosamente',
    };
  }

  @Get('summary')
  @UseGuards(AuthGuard)
  async getCartSummary(@Request() req: AuthenticatedRequest) {
    const result = await this.cartService.getCartSummary(req.user!.id, req.user!.role);

    return {
      success: true,
      data: result,
      message: 'Resumen del carrito obtenido',
    };
  }
}
