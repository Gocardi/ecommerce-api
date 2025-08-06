import { Controller, Get } from '@nestjs/common';

@Controller('config')
export class ConfigController {
  /**
   * Obtener regiones disponibles
   */
  @Get('regions')
  async getRegions() {
    const regions = [
      {
        code: 'LIM',
        name: 'Lima',
        cities: ['Lima', 'San Isidro', 'Miraflores', 'Surco', 'La Molina', 'San Borja'],
      },
      {
        code: 'ARE',
        name: 'Arequipa',
        cities: ['Arequipa', 'Cayma', 'Cerro Colorado', 'Paucarpata'],
      },
      {
        code: 'CUS',
        name: 'Cusco',
        cities: ['Cusco', 'San Sebastián', 'San Jerónimo', 'Wanchaq'],
      },
      {
        code: 'TRU',
        name: 'La Libertad',
        cities: ['Trujillo', 'La Esperanza', 'El Porvenir', 'Florencia de Mora'],
      },
      {
        code: 'PIU',
        name: 'Piura',
        cities: ['Piura', 'Castilla', 'Catacaos', 'La Unión'],
      },
    ];

    return {
      success: true,
      data: regions,
      message: 'Regiones disponibles obtenidas',
    };
  }

  /**
   * Configuraciones de la aplicación
   */
  @Get('app-settings')
  async getAppSettings() {
    const settings = {
      maintenance: false,
      minAppVersion: '1.0.0',
      maxReferralsDefault: 10,
      pointsPerSol: 0.1,
      shippingRegions: ['Lima', 'Arequipa', 'Cusco', 'La Libertad', 'Piura'],
      supportContact: {
        phone: '+51999888777',
        email: 'soporte@suplementosnaturales.com',
        whatsapp: '+51999888777',
      },
    };

    return {
      success: true,
      data: settings,
      message: 'Configuraciones obtenidas',
    };
  }
}
