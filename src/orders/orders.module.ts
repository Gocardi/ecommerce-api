import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CommissionsModule } from '../commissions/commissions.module';
import { RewardsModule } from '../rewards/rewards.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MonthlyTrackingModule } from '../monthly-tracking/monthly-tracking.module';

@Module({
  imports: [
    PrismaModule, 
    CommissionsModule, 
    RewardsModule, 
    NotificationsModule, 
    MonthlyTrackingModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
