import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TutorialsService {
  constructor(private prisma: PrismaService) {}

  /**
   * RF-11: Centro de capacitación
   */
  async getTutorials(filters: {
    category?: string;
    contentType?: string;
  } = {}) {
    const { category, contentType } = filters;

    const where: any = { isActive: true };

    if (category) {
      where.category = category;
    }

    if (contentType) {
      where.contentType = contentType;
    }

    return this.prisma.tutorial.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { order: 'asc' },
        { createdAt: 'asc' },
      ],
    });
  }

  async getTutorialById(id: number) {
    return this.prisma.tutorial.findUnique({
      where: { id, isActive: true },
    });
  }

  async getTutorialsByCategory() {
    const tutorials = await this.getTutorials();
    
    const groupedByCategory = tutorials.reduce((acc, tutorial) => {
      if (!acc[tutorial.category]) {
        acc[tutorial.category] = [];
      }
      acc[tutorial.category].push(tutorial);
      return acc;
    }, {} as Record<string, any[]>);

    return {
      sales: groupedByCategory.sales || [],
      platform: groupedByCategory.platform || [],
      products: groupedByCategory.products || [],
    };
  }

  // Métodos para administradores
  async createTutorial(data: {
    title: string;
    description?: string;
    url: string;
    contentType: string;
    category: string;
    order?: number;
  }) {
    return this.prisma.tutorial.create({ data });
  }

  async updateTutorial(id: number, data: any) {
    return this.prisma.tutorial.update({
      where: { id },
      data,
    });
  }

  async deleteTutorial(id: number) {
    return this.prisma.tutorial.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
