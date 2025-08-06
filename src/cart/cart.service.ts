import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  /**
   * RF-04: Obtener carrito del usuario
   */
  async getUserCart(userId: number, userRole?: string) {
    let cart = await this.prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Crear carrito si no existe
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Calcular totales
    let totalItems = 0;
    let totalPrice = 0;

    const formattedItems = cart.items.map((item) => {
      const price = userRole === 'afiliado' 
        ? Number(item.product.affiliatePrice) 
        : Number(item.product.publicPrice);
      
      const itemTotal = price * item.quantity;
      totalItems += item.quantity;
      totalPrice += itemTotal;

      return {
        id: item.id,
        quantity: item.quantity,
        unitPrice: price,
        totalPrice: itemTotal,
        product: {
          id: item.product.id,
          name: item.product.name,
          price,
          publicPrice: Number(item.product.publicPrice),
          affiliatePrice: Number(item.product.affiliatePrice),
          imageUrl: item.product.imageUrl,
          stock: item.product.stock,
          category: item.product.category,
          isAvailable: item.product.stock >= item.quantity,
        },
      };
    });

    return {
      id: cart.id,
      items: formattedItems,
      totalItems,
      totalPrice: Math.round(totalPrice * 100) / 100,
      isEmpty: formattedItems.length === 0,
      updatedAt: cart.updatedAt,
    };
  }

  /**
   * Agregar item al carrito
   */
  async addItem(userId: number, productId: number, quantity: number) {
    // Verificar que el producto existe y está activo
    const product = await this.prisma.product.findFirst({
      where: {
        id: productId,
        isActive: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    // Verificar stock disponible
    if (product.stock < quantity) {
      throw new BadRequestException(`Stock insuficiente. Disponible: ${product.stock}`);
    }

    // Obtener o crear carrito
    let cart = await this.prisma.cart.findFirst({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // Verificar si el producto ya está en el carrito
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (existingItem) {
      // Actualizar cantidad
      const newQuantity = existingItem.quantity + quantity;
      
      if (product.stock < newQuantity) {
        throw new BadRequestException(`Stock insuficiente. Disponible: ${product.stock}, en carrito: ${existingItem.quantity}`);
      }

      const updatedItem = await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });

      return {
        id: updatedItem.id,
        quantity: updatedItem.quantity,
        product: updatedItem.product,
        action: 'updated',
      };
    } else {
      // Crear nuevo item
      const newItem = await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      });

      return {
        id: newItem.id,
        quantity: newItem.quantity,
        product: newItem.product,
        action: 'added',
      };
    }
  }

  /**
   * Actualizar cantidad de un item
   */
  async updateItemQuantity(userId: number, itemId: number, quantity: number) {
    if (quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor a 0');
    }

    // Verificar que el item pertenece al usuario
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
        },
      },
      include: {
        product: true,
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Item no encontrado en tu carrito');
    }

    // Verificar stock
    if (cartItem.product.stock < quantity) {
      throw new BadRequestException(`Stock insuficiente. Disponible: ${cartItem.product.stock}`);
    }

    const updatedItem = await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
    });

    return {
      id: updatedItem.id,
      quantity: updatedItem.quantity,
      product: updatedItem.product,
      action: 'updated',
    };
  }

  /**
   * Eliminar item del carrito
   */
  async removeItem(userId: number, itemId: number) {
    // Verificar que el item pertenece al usuario
    const cartItem = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: {
          userId,
        },
      },
    });

    if (!cartItem) {
      throw new NotFoundException('Item no encontrado en tu carrito');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return { success: true, itemId };
  }

  /**
   * Vaciar carrito completo
   */
  async clearCart(userId: number) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId },
    });

    if (!cart) {
      return { success: true, message: 'Carrito ya estaba vacío' };
    }

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return { success: true, message: 'Carrito vaciado exitosamente' };
  }

  /**
   * Verificar disponibilidad de todos los items del carrito
   */
  async validateCartAvailability(userId: number) {
    const cart = await this.getUserCart(userId);
    
    const unavailableItems = cart.items.filter(item => !item.product.isAvailable);
    
    return {
      isValid: unavailableItems.length === 0,
      unavailableItems: unavailableItems.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        requestedQuantity: item.quantity,
        availableStock: item.product.stock,
      })),
    };
  }

  /**
   * Obtener resumen del carrito para checkout
   */
  async getCartSummary(userId: number, userRole?: string) {
    const cart = await this.getUserCart(userId, userRole);
    
    if (cart.isEmpty) {
      throw new BadRequestException('El carrito está vacío');
    }

    const validation = await this.validateCartAvailability(userId);
    
    if (!validation.isValid) {
      throw new BadRequestException('Algunos productos no tienen stock suficiente');
    }

    // Calcular costo de envío (esto podría venir de reglas de negocio)
    const shippingCost = 15.00; // Temporal, después viene de BusinessRules
    const finalTotal = cart.totalPrice + shippingCost;

    return {
      ...cart,
      shippingCost,
      finalTotal: Math.round(finalTotal * 100) / 100,
      canProceedToCheckout: validation.isValid,
    };
  }
}
