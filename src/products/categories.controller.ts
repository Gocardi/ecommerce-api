import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * RF-03: Listar todas las categorías (público)
   */
  @Get()
  async findAll() {
    const categories = await this.categoriesService.findAll();
    
    return {
      success: true,
      data: categories,
      message: `${categories.length} categorías encontradas`,
    };
  }

  /**
   * RF-03: Obtener categoría por ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const category = await this.categoriesService.findOne(id);
    
    return {
      success: true,
      data: category,
      message: 'Categoría encontrada',
    };
  }

  /**
   * RF-03: Obtener categoría por slug
   */
  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    const category = await this.categoriesService.findBySlug(slug);
    
    return {
      success: true,
      data: category,
      message: 'Categoría encontrada',
    };
  }

  /**
   * Estadísticas de categorías
   */
  @Get('stats/overview')
  async getCategoriesWithStats() {
    const stats = await this.categoriesService.getCategoriesWithStats();
    
    return {
      success: true,
      data: stats,
      message: 'Estadísticas de categorías',
    };
  }

  /**
   * ADMIN: Crear categoría (solo administradores)
   */
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    const category = await this.categoriesService.create(createCategoryDto);
    
    return {
      success: true,
      data: category,
      message: 'Categoría creada exitosamente',
    };
  }

  /**
   * ADMIN: Actualizar categoría (solo administradores)
   */
  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    const category = await this.categoriesService.update(id, updateCategoryDto);
    
    return {
      success: true,
      data: category,
      message: 'Categoría actualizada exitosamente',
    };
  }

  /**
   * ADMIN: Eliminar categoría (solo administradores)
   */
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.categoriesService.remove(id);
    
    return {
      success: true,
      message: 'Categoría eliminada exitosamente',
    };
  }
}
