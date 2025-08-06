import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BusinessRulesService {
  constructor(private prisma: PrismaService) {}

  /**
   * RF-14: Obtener reglas de negocio
   */
  async getBusinessRules() {
    const rules = await this.prisma.businessRule.findMany({
      orderBy: { key: 'asc' },
    });

    const rulesMap = rules.reduce((acc, rule) => {
      let value: any = rule.value;
      
      if (rule.type === 'number') {
        value = parseFloat(rule.value);
      } else if (rule.type === 'json') {
        try {
          value = JSON.parse(rule.value);
        } catch {
          value = rule.value;
        }
      }

      acc[rule.key] = value;
      return acc;
    }, {} as any);

    return {
      minMonthlyBuy: rulesMap.minMonthlyBuy || 1,
      referralCommissionPercentage: rulesMap.referralCommissionPercentage || 10,
      directSaleCommissionPercentage: rulesMap.directSaleCommissionPercentage || 20,
      shippingCost: rulesMap.shippingCost || 15.00,
      maxReferralsDefault: rulesMap.maxReferralsDefault || 10,
      ...rulesMap,
    };
  }

  /**
   * RF-14: Actualizar reglas de negocio (admin general)
   */
  async updateBusinessRules(adminId: number, rules: Record<string, any>) {
    const admin = await this.prisma.user.findFirst({
      where: {
        id: adminId,
        role: 'admin_general',
        isActive: true,
      },
    });

    if (!admin) {
      throw new BadRequestException('Solo el administrador general puede actualizar las reglas');
    }

    for (const [key, value] of Object.entries(rules)) {
      const type = this.getValueType(value);
      const stringValue = this.valueToString(value);

      await this.prisma.businessRule.upsert({
        where: { key },
        update: {
          value: stringValue,
          type,
        },
        create: {
          key,
          value: stringValue,
          type,
        },
      });
    }

    return {
      success: true,
      updatedRules: Object.keys(rules),
    };
  }

  /**
   * Obtener reglas disponibles y su configuración
   */
  async getAvailableRules() {
    return {
      rules: [
        {
          key: 'minMonthlyBuy',
          name: 'Compra mínima mensual',
          description: 'Cantidad mínima de productos que debe comprar un afiliado por mes',
          type: 'number',
          defaultValue: 1,
        },
        {
          key: 'referralCommissionPercentage',
          name: 'Porcentaje comisión por referido',
          description: 'Porcentaje de comisión que recibe por ventas de sus referidos',
          type: 'number',
          defaultValue: 10,
        },
        {
          key: 'directSaleCommissionPercentage',
          name: 'Porcentaje comisión venta directa',
          description: 'Porcentaje de comisión por ventas propias',
          type: 'number',
          defaultValue: 20,
        },
        {
          key: 'shippingCost',
          name: 'Costo de envío',
          description: 'Costo fijo de envío para todos los pedidos',
          type: 'number',
          defaultValue: 15.00,
        },
        {
          key: 'maxReferralsDefault',
          name: 'Máximo referidos por defecto',
          description: 'Número máximo de referidos permitidos para nuevos afiliados',
          type: 'number',
          defaultValue: 10,
        },
      ],
    };
  }

  /**
   * Determinar tipo de valor
   */
  private getValueType(value: any): string {
    if (typeof value === 'number') return 'number';
    if (typeof value === 'object') return 'json';
    return 'string';
  }

  /**
   * Convertir valor a string
   */
  private valueToString(value: any): string {
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    return String(value);
  }
}