import { Module } from '@nestjs/common';
import { VoisorService } from './voisor.service';
import { VoisorController } from './voisor.controller';
import { CallSessionModule } from '../call-session/call-session.module';

@Module({
  imports: [CallSessionModule],
  controllers: [VoisorController],
  providers: [VoisorService],
  exports: [VoisorService],
})
export class VoisorModule {}
