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
import { AddressesService } from './addresses.service';
import { AuthGuard } from '../guards/auth.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getUserAddresses(@Request() req: AuthenticatedRequest) {
    const result = await this.addressesService.getUserAddresses(req.user!.id);

    return {
      success: true,
      data: result,
      message: 'Direcciones obtenidas exitosamente',
    };
  }

  @Post()
  @UseGuards(AuthGuard)
  async createAddress(
    @Body() addressData: {
      name: string;
      phone: string;
      region: string;
      city: string;
      address: string;
      reference?: string;
      isDefault?: boolean;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.addressesService.createAddress(req.user!.id, addressData);

    return {
      success: true,
      data: result,
      message: 'Dirección creada exitosamente',
    };
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  async updateAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Body() addressData: {
      name?: string;
      phone?: string;
      region?: string;
      city?: string;
      address?: string;
      reference?: string;
      isDefault?: boolean;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.addressesService.updateAddress(
      req.user!.id,
      addressId,
      addressData
    );

    return {
      success: true,
      data: result,
      message: 'Dirección actualizada exitosamente',
    };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.addressesService.deleteAddress(req.user!.id, addressId);

    return {
      success: true,
      data: result,
      message: 'Dirección eliminada exitosamente',
    };
  }

  @Put(':id/set-default')
  @UseGuards(AuthGuard)
  async setDefaultAddress(
    @Param('id', ParseIntPipe) addressId: number,
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.addressesService.setDefaultAddress(req.user!.id, addressId);

    return {
      success: true,
      data: result,
      message: 'Dirección establecida como principal',
    };
  }

  @Get('default')
  @UseGuards(AuthGuard)
  async getDefaultAddress(@Request() req: AuthenticatedRequest) {
    const result = await this.addressesService.getDefaultAddress(req.user!.id);

    return {
      success: true,
      data: result,
      message: 'Dirección principal obtenida',
    };
  }
}
