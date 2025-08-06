import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigController } from './config.controller';
import { BusinessRulesController } from '../business-rules/business-rules.controller';
import { BusinessRulesService } from '../business-rules/business-rules.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ConfigController, BusinessRulesController],
  providers: [BusinessRulesService],
  exports: [BusinessRulesService],
})
export class ConfigModule {}