import { Module } from '@nestjs/common';
import { CallLogService } from './call-log.service';
import { CallLogController } from './call-log.controller';

@Module({
  controllers: [CallLogController],
  providers: [CallLogService],
  exports: [CallLogService],
})
export class CallLogModule {}
