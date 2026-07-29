import { Module } from '@nestjs/common';
import { CallSessionService } from './call-session.service';
import { CallSessionController } from './call-session.controller';
import { CallGateway } from './call.gateway';
import { ChatModule } from '../chat/chat.module';
import { CallLogModule } from '../call-log/call-log.module';
import { VoiceModule } from '../voice/voice.module';

@Module({
  imports: [ChatModule, CallLogModule, VoiceModule],
  controllers: [CallSessionController],
  providers: [CallSessionService, CallGateway],
})
export class CallSessionModule {}
