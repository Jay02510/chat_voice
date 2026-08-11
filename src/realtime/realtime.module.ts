import { Module } from '@nestjs/common';
import { RealtimeService } from './realtime.service';
import { RealtimeController } from './realtime.controller';
import { ChatModule } from '../chat/chat.module';
import { CallSessionModule } from '../call-session/call-session.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ChatModule, CallSessionModule, PrismaModule],
  controllers: [RealtimeController],
  providers: [RealtimeService],
})
export class RealtimeModule {}
