import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { CommissionsModule } from './commissions/commissions.module';
import { AffiliatesModule } from './affiliates/affiliates.module';
import { AddressesModule } from './addresses/addresses.module';
import { AdminModule } from './admin/admin.module';
import { BusinessRulesModule } from './business-rules/business-rules.module';
import { MonthlyTrackingModule } from './monthly-tracking/monthly-tracking.module';
import { RewardsModule } from './rewards/rewards.module';
import { NotificationsModule } from './notifications/notifications.module';
import { TutorialsModule } from './tutorials/tutorials.module';
import { ConfigModule } from './config/config.module';
import { StatsModule } from './stats/stats.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SharedModule,
    AuthModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    CommissionsModule,
    AffiliatesModule,
    AddressesModule,
    AdminModule,
    BusinessRulesModule,
    MonthlyTrackingModule,
    RewardsModule,
    NotificationsModule,
    TutorialsModule,
    ConfigModule,
    StatsModule,
  ],
})
export class AppModule {}
