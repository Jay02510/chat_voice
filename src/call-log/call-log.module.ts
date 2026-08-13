import { forwardRef, Module } from '@nestjs/common';
import { CallLogService } from './call-log.service';
import { CallLogController } from './call-log.controller';
import { CallSessionModule } from '../call-session/call-session.module';

@Module({
  imports: [forwardRef(() => CallSessionModule)],
  controllers: [CallLogController],
  providers: [CallLogService],
  exports: [CallLogService],
})
export class CallLogModule {}
