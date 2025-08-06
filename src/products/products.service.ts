import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductFiltersDto } from './dto/product-filters.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async create(createProductDto: CreateProductDto) {
    // Verificar que la categoría existe
    const category = await this.prisma.category.findUnique({
      where: { id: createProductDto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return this.prisma.product.create({
      data: createProductDto,
      include: {
        category: true,
      },
    });
  }

  async findAll(filters: ProductFiltersDto, userRole?: string) {
    const {
      search,
      categoryId,
      minPrice,
      maxPrice,
      page,
      limit,
      sortBy,
      sortOrder,
    } = filters;

    // Construir filtros WHERE
    const where: any = {
      isActive: true,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Filtro de precio basado en el rol del usuario
    const priceField = userRole === 'afiliado' ? 'affiliatePrice' : 'publicPrice';

    if (minPrice !== undefined || maxPrice !== undefined) {
      where[priceField] = {};
      if (minPrice !== undefined) where[priceField].gte = minPrice;
      if (maxPrice !== undefined) where[priceField].lte = maxPrice;
    }

    // Construir ordenamiento
    const orderBy: any = {};
    if (sortBy === 'price') {
      orderBy[priceField] = sortOrder;
    } else if (sortBy) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc'; // Orden por defecto
    }

    // Calcular offset para paginación
    const skip = (page - 1) * limit;

    // Ejecutar consultas en paralelo
    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    // Formatear productos con precio según rol
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: userRole === 'afiliado' ? Number(product.affiliatePrice) : Number(product.publicPrice),
      publicPrice: Number(product.publicPrice),
      affiliatePrice: Number(product.affiliatePrice),
      category: product.category,
      imageUrl: product.imageUrl,
      stock: product.stock,
      sku: product.sku,
      discountPercentage: product.discountPercentage ? Number(product.discountPercentage) : null,
      isAvailable: product.stock > 0,
      createdAt: product.createdAt,
    }));

    // Metadatos de paginación
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      products: formattedProducts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: total,
        itemsPerPage: limit,
        hasNextPage,
        hasPrevPage,
      },
      filters: {
        search,
        categoryId,
        minPrice,
        maxPrice,
        priceField,
      },
    };
  }

  async findOne(id: number, userRole?: string) {
    const product = await this.prisma.product.findUnique({
      where: { id, isActive: true },
      include: {
        category: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      price: userRole === 'afiliado' ? Number(product.affiliatePrice) : Number(product.publicPrice),
      publicPrice: Number(product.publicPrice),
      affiliatePrice: Number(product.affiliatePrice),
      category: product.category,
      imageUrl: product.imageUrl,
      stock: product.stock,
      sku: product.sku,
      discountPercentage: product.discountPercentage ? Number(product.discountPercentage) : null,
      isAvailable: product.stock > 0,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }

  async findByCategory(categoryId: number, userRole?: string) {
    const filters: ProductFiltersDto = {
      categoryId,
      page: 1,
      limit: 50,
    };

    return this.findAll(filters, userRole);
  }

  /**
   * Productos con descuento
   */
  async findDiscountedProducts(userRole?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        discountPercentage: {
          gt: 0,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        discountPercentage: 'desc',
      },
      take: 20,
    });

    return products.map((product) => ({
      id: product.id,
      name: product.name,
      description: product.description,
      price: userRole === 'afiliado' ? Number(product.affiliatePrice) : Number(product.publicPrice),
      publicPrice: Number(product.publicPrice),
      affiliatePrice: Number(product.affiliatePrice),
      category: product.category,
      imageUrl: product.imageUrl,
      stock: product.stock,
      sku: product.sku,
      discountPercentage: product.discountPercentage ? Number(product.discountPercentage) : null,
      isAvailable: product.stock > 0,
      finalPrice: this.calculateDiscountedPrice(
        userRole === 'afiliado' ? Number(product.affiliatePrice) : Number(product.publicPrice),
        product.discountPercentage ? Number(product.discountPercentage) : 0,
      ),
    }));
  }

  /**
   * Actualizar stock de producto
   */
  async updateStock(id: number, newStock: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Producto no encontrado');
    }

    return this.prisma.product.update({
      where: { id },
      data: { stock: newStock },
      include: {
        category: true,
      },
    });
  }

  /**
   * Verificar disponibilidad de múltiples productos
   */
  async checkAvailability(productIds: number[]) {
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        stock: true,
      },
    });

    return productIds.map((id) => {
      const product = products.find((p) => p.id === id);
      return {
        productId: id,
        available: product ? product.stock > 0 : false,
        stock: product?.stock || 0,
        name: product?.name || null,
      };
    });
  }

  /**
   * Calcular precio con descuento
   */
  private calculateDiscountedPrice(price: number, discountPercentage: number): number {
    if (discountPercentage <= 0) return price;
    return Math.round((price * (1 - discountPercentage / 100)) * 100) / 100;
  }
}
