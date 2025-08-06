import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductFiltersDto } from './dto/product-filters.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * RF-03: Listar todos los productos con filtros y paginación
   * Público - Precios para visitantes
   * Privado - Precios para afiliados
   */
  @Get()
  async findAll(
    @Query(new ValidationPipe({ transform: true })) filters: ProductFiltersDto,
    @Request() req?: AuthenticatedRequest,
  ) {
    const userRole = req?.user?.role;
    const result = await this.productsService.findAll(filters, userRole);

    return {
      success: true,
      data: result,
      message: `${result.products.length} productos encontrados`,
    };
  }

  /**
   * RF-03: Obtener producto por ID
   * Precio según rol del usuario (si está autenticado)
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req?: AuthenticatedRequest,
  ) {
    const userRole = req?.user?.role;
    const product = await this.productsService.findOne(id, userRole);

    return {
      success: true,
      data: product,
      message: 'Producto encontrado',
    };
  }

  /**
   * RF-03: Productos por categoría
   */
  @Get('category/:categoryId')
  async findByCategory(
    @Param('categoryId', ParseIntPipe) categoryId: number,
    @Request() req?: AuthenticatedRequest,
  ) {
    const userRole = req?.user?.role;
    const result = await this.productsService.findByCategory(categoryId, userRole);

    return {
      success: true,
      data: result,
      message: `Productos de la categoría ${categoryId}`,
    };
  }

  /**
   * RF-03: Búsqueda de productos
   * Endpoint específico para búsquedas más avanzadas
   */
  @Get('search/:term')
  async search(
    @Param('term') searchTerm: string,
    @Query(new ValidationPipe({ transform: true })) filters: ProductFiltersDto,
    @Request() req?: AuthenticatedRequest,
  ) {
    const userRole = req?.user?.role;
    const searchFilters = { ...filters, search: searchTerm };
    const result = await this.productsService.findAll(searchFilters, userRole);

    return {
      success: true,
      data: result,
      message: `Resultados para: "${searchTerm}"`,
    };
  }

  /**
   * RF-03: Productos destacados/populares
   */
  @Get('featured/list')
  async getFeatured(@Request() req?: AuthenticatedRequest) {
    const userRole = req?.user?.role;
    const filters: ProductFiltersDto = {
      page: 1,
      limit: 8,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    };

    const result = await this.productsService.findAll(filters, userRole);

    return {
      success: true,
      data: result.products,
      message: 'Productos destacados',
    };
  }

  /**
   * Productos con descuento
   */
  @Get('discounts/list')
  async getDiscountedProducts(@Request() req?: AuthenticatedRequest) {
    const userRole = req?.user?.role;
    const result = await this.productsService.findDiscountedProducts(userRole);

    return {
      success: true,
      data: result,
      message: 'Productos con descuento',
    };
  }

  /**
   * ADMIN: Crear producto (solo administradores)
   */
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general') // Agregar admin_general
  async create(@Body() createProductDto: CreateProductDto) {
    const product = await this.productsService.create(createProductDto);

    return {
      success: true,
      data: product,
      message: 'Producto creado exitosamente',
    };
  }

  /**
   * ADMIN: Actualizar stock (solo administradores)
   */
  @Post(':id/stock')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general') // Agregar admin_general
  async updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStockDto: { stock: number },
  ) {
    const product = await this.productsService.updateStock(id, updateStockDto.stock);

    return {
      success: true,
      data: product,
      message: 'Stock actualizado exitosamente',
    };
  }

  /**
   * Verificar disponibilidad de productos
   */
  @Post('check-availability')
  async checkAvailability(@Body() productIds: { ids: number[] }) {
    const availability = await this.productsService.checkAvailability(productIds.ids);

    return {
      success: true,
      data: availability,
      message: 'Disponibilidad verificada',
    };
  }
}