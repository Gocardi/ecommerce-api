import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  async create(createCategoryDto: CreateCategoryDto) {
    // Verificar que no exista una categoría con el mismo nombre o slug
    const existingCategory = await this.prisma.category.findFirst({
      where: {
        OR: [
          { name: createCategoryDto.name },
          { slug: createCategoryDto.slug },
        ],
      },
    });

    if (existingCategory) {
      throw new ConflictException('Ya existe una categoría con ese nombre o slug');
    }

    return this.prisma.category.create({
      data: createCategoryDto,
    });
  }

  async findAll() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      isActive: category.isActive,
      productsCount: category._count.products,
      createdAt: category.createdAt,
    }));
  }

  async findOne(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id, isActive: true },
      include: {
        products: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            publicPrice: true,
            affiliatePrice: true,
            imageUrl: true,
            stock: true,
            sku: true,
          },
          take: 10, // Limitar productos mostrados
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      isActive: category.isActive,
      productsCount: category._count.products,
      recentProducts: category.products,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug, isActive: true },
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      imageUrl: category.imageUrl,
      isActive: category.isActive,
      productsCount: category._count.products,
      createdAt: category.createdAt,
    };
  }

  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    // Verificar conflictos si se está actualizando nombre o slug
    if (updateCategoryDto.name || updateCategoryDto.slug) {
      const whereConditions: Array<{ name?: string; slug?: string }> = [];
      
      if (updateCategoryDto.name) {
        whereConditions.push({ name: updateCategoryDto.name });
      }
      
      if (updateCategoryDto.slug) {
        whereConditions.push({ slug: updateCategoryDto.slug });
      }

      if (whereConditions.length > 0) {
        const conflictingCategory = await this.prisma.category.findFirst({
          where: {
            AND: [
              { id: { not: id } },
              { OR: whereConditions },
            ],
          },
        });

        if (conflictingCategory) {
          throw new ConflictException('Ya existe una categoría con ese nombre o slug');
        }
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: updateCategoryDto,
    });
  }

  async remove(id: number) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Categoría no encontrada');
    }

    if (category._count.products > 0) {
      throw new ConflictException(
        `No se puede eliminar la categoría porque tiene ${category._count.products} productos activos`,
      );
    }

    // Soft delete - marcar como inactiva
    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async getCategoriesWithStats() {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
        products: {
          where: { isActive: true },
          select: {
            publicPrice: true,
            affiliatePrice: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories.map(category => {
      const productPrices = category.products;
      const avgPublicPrice = productPrices.length > 0
        ? productPrices.reduce((sum, p) => sum + Number(p.publicPrice), 0) / productPrices.length
        : 0;
      
      const avgAffiliatePrice = productPrices.length > 0
        ? productPrices.reduce((sum, p) => sum + Number(p.affiliatePrice), 0) / productPrices.length
        : 0;

      return {
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        imageUrl: category.imageUrl,
        productsCount: category._count.products,
        avgPublicPrice: Math.round(avgPublicPrice * 100) / 100,
        avgAffiliatePrice: Math.round(avgAffiliatePrice * 100) / 100,
        createdAt: category.createdAt,
      };
    });
  }
}