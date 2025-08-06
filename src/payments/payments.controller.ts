import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { AuthGuard } from '../guards/auth.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Confirmar pago de pedido
   */
  @Post('confirm')
  @UseGuards(AuthGuard)
  async confirmPayment(
    @Body() paymentData: {
      orderId: number;
      method: string;
      amount: number;
      reference?: string;
      bcpCode?: string;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.ordersService.confirmPayment(
      paymentData.orderId,
      paymentData
    );

    return {
      success: true,
      data: result,
      message: 'Pago confirmado exitosamente',
    };
  }

  /**
   * Obtener métodos de pago disponibles
   */
  @Get('methods')
  async getPaymentMethods() {
    const methods = [
      {
        id: 'BCP_code',
        name: 'Código BCP',
        description: 'Pago con código de operación del BCP',
        instructions: 'Realiza la transferencia y envía el código de operación',
      },
      {
        id: 'bank_transfer',
        name: 'Transferencia Bancaria',
        description: 'Transferencia directa a cuenta bancaria',
        bankInfo: {
          bank: 'Banco de Crédito del Perú',
          accountNumber: '123-456789-0-12',
          accountName: 'SUPLEMENTOS NATURALES SAC',
        },
      },
    ];

    return {
      success: true,
      data: { methods },
      message: 'Métodos de pago obtenidos',
    };
  }
}
