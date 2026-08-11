import { Module } from '@nestjs/common';
import { ScenarioTypeService } from './scenario-type.service';
import { ScenarioTypeController } from './scenario-type.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TierModule } from '../tier/tier.module';

@Module({
  imports: [PrismaModule, TierModule],
  providers: [ScenarioTypeService],
  controllers: [ScenarioTypeController],
  exports: [ScenarioTypeService],
})
export class ScenarioTypeModule {}
