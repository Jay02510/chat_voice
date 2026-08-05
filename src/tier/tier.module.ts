import { Module } from '@nestjs/common';
import { TierService } from './tier.service';
import { TierController } from './tier.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [TierService],
  controllers: [TierController],
  exports: [TierService],
})
export class TierModule {}
