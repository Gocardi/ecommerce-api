import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { TutorialsService } from './tutorials.service';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard, Roles } from '../guards/roles.guard';

@Controller('tutorials')
export class TutorialsController {
  constructor(private readonly tutorialsService: TutorialsService) {}

  /**
   * RF-11: Centro de capacitación
   */
  @Get()
  async getTutorials(
    @Query(new ValidationPipe({ transform: true })) filters: {
      category?: string;
      contentType?: string;
    }
  ) {
    const tutorials = await this.tutorialsService.getTutorials(filters);

    return {
      success: true,
      data: tutorials,
      message: 'Tutoriales obtenidos exitosamente',
    };
  }

  /**
   * RF-11: Tutoriales por categoría
   */
  @Get('by-category')
  async getTutorialsByCategory() {
    const tutorials = await this.tutorialsService.getTutorialsByCategory();

    return {
      success: true,
      data: tutorials,
      message: 'Tutoriales por categoría obtenidos',
    };
  }

  /**
   * Obtener tutorial específico
   */
  @Get(':id')
  async getTutorialById(@Param('id', ParseIntPipe) id: number) {
    const tutorial = await this.tutorialsService.getTutorialById(id);

    return {
      success: true,
      data: tutorial,
      message: 'Tutorial obtenido exitosamente',
    };
  }

  /**
   * Crear tutorial (admin)
   */
  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async createTutorial(
    @Body() tutorialData: {
      title: string;
      description?: string;
      url: string;
      contentType: string;
      category: string;
      order?: number;
    }
  ) {
    const tutorial = await this.tutorialsService.createTutorial(tutorialData);

    return {
      success: true,
      data: tutorial,
      message: 'Tutorial creado exitosamente',
    };
  }

  /**
   * Actualizar tutorial (admin)
   */
  @Put(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async updateTutorial(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: any
  ) {
    const tutorial = await this.tutorialsService.updateTutorial(id, updateData);

    return {
      success: true,
      data: tutorial,
      message: 'Tutorial actualizado exitosamente',
    };
  }

  /**
   * Eliminar tutorial (admin)
   */
  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin', 'admin_general')
  async deleteTutorial(@Param('id', ParseIntPipe) id: number) {
    await this.tutorialsService.deleteTutorial(id);

    return {
      success: true,
      message: 'Tutorial eliminado exitosamente',
    };
  }
}
