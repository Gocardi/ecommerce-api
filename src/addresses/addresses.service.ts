import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface CreateAddressDto {
  name: string;
  phone: string;
  region: string;
  city: string;
  address: string;
  reference?: string;
  isDefault?: boolean;
}

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Listar direcciones del usuario
   */
  async getUserAddresses(userId: number) {
    const addresses = await this.prisma.shippingAddress.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { id: 'desc' }, // Cambiar createdAt por id
      ],
    });

    return addresses;
  }

  /**
   * Crear nueva dirección
   */
  async createAddress(userId: number, addressData: CreateAddressDto) {
    const result = await this.prisma.$transaction(async (tx) => {
      // Si es dirección por defecto, quitar el default de las otras
      if (addressData.isDefault) {
        await tx.shippingAddress.updateMany({
          where: { userId },
          data: { isDefault: false },
        });
      }

      // Si es la primera dirección, hacerla por defecto automáticamente
      const existingCount = await tx.shippingAddress.count({
        where: { userId },
      });

      const isDefault = addressData.isDefault || existingCount === 0;

      return tx.shippingAddress.create({
        data: {
          userId,
          ...addressData,
          isDefault,
        },
      });
    });

    return result;
  }

  /**
   * Actualizar dirección
   */
  async updateAddress(userId: number, addressId: number, addressData: Partial<CreateAddressDto>) {
    // Verificar que la dirección pertenece al usuario
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Si se está marcando como default, quitar default de las otras
      if (addressData.isDefault) {
        await tx.shippingAddress.updateMany({
          where: { 
            userId,
            id: { not: addressId },
          },
          data: { isDefault: false },
        });
      }

      return tx.shippingAddress.update({
        where: { id: addressId },
        data: addressData,
      });
    });

    return result;
  }

  /**
   * Eliminar dirección
   */
  async deleteAddress(userId: number, addressId: number) {
    // Verificar que la dirección pertenece al usuario
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    // No permitir eliminar si es la única dirección
    const addressCount = await this.prisma.shippingAddress.count({
      where: { userId },
    });

    if (addressCount === 1) {
      throw new BadRequestException('No puedes eliminar tu única dirección');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.shippingAddress.delete({
        where: { id: addressId },
      });

      // Si era la dirección por defecto, hacer default la primera que encuentre
      if (address.isDefault) {
        const firstAddress = await tx.shippingAddress.findFirst({
          where: { userId },
          orderBy: { id: 'asc' }, // Cambiar createdAt por id
        });

        if (firstAddress) {
          await tx.shippingAddress.update({
            where: { id: firstAddress.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { success: true };
  }

  /**
   * Establecer dirección como por defecto
   */
  async setDefaultAddress(userId: number, addressId: number) {
    // Verificar que la dirección pertenece al usuario
    const address = await this.prisma.shippingAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException('Dirección no encontrada');
    }

    await this.prisma.$transaction(async (tx) => {
      // Quitar default de todas las direcciones del usuario
      await tx.shippingAddress.updateMany({
        where: { userId },
        data: { isDefault: false },
      });

      // Establecer la nueva dirección como default
      await tx.shippingAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });

    return { success: true };
  }

  /**
   * Obtener dirección por defecto
   */
  async getDefaultAddress(userId: number) {
    const defaultAddress = await this.prisma.shippingAddress.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    if (!defaultAddress) {
      // Si no hay dirección por defecto, devolver la primera
      return this.prisma.shippingAddress.findFirst({
        where: { userId },
        orderBy: { id: 'asc' }, // Cambiar createdAt por id
      });
    }

    return defaultAddress;
  }
}
