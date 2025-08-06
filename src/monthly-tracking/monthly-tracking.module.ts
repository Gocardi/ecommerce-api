import { Module } from '@nestjs/common';
import { MonthlyTrackingService } from './monthly-tracking.service';
import { MonthlyTrackingController } from './monthly-tracking.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [MonthlyTrackingController],
  providers: [MonthlyTrackingService],
  exports: [MonthlyTrackingService],
})
export class MonthlyTrackingModule {}
