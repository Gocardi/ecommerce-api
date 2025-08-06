import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../guards/auth.guard';
import { AuthenticatedRequest } from '../guards/auth.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getNotifications(
    @Query(new ValidationPipe({ transform: true })) filters: {
      unread?: boolean;
      type?: string;
      page?: number;
      limit?: number;
    },
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.notificationsService.getUserNotifications(
      req.user!.id,
      filters
    );

    return {
      success: true,
      data: result,
      message: 'Notificaciones obtenidas exitosamente',
    };
  }

  @Put(':id/read')
  @UseGuards(AuthGuard)
  async markAsRead(
    @Param('id', ParseIntPipe) notificationId: number,
    @Request() req: AuthenticatedRequest
  ) {
    const result = await this.notificationsService.markAsRead(
      req.user!.id,
      notificationId
    );

    return {
      success: true,
      data: result,
      message: 'Notificación marcada como leída',
    };
  }

  @Put('mark-all-read')
  @UseGuards(AuthGuard)
  async markAllAsRead(@Request() req: AuthenticatedRequest) {
    const result = await this.notificationsService.markAllAsRead(req.user!.id);

    return {
      success: true,
      data: result,
      message: 'Todas las notificaciones marcadas como leídas',
    };
  }
}
