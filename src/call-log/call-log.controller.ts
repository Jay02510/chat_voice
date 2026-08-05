import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CallLogService } from './call-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('call-log')
export class CallLogController {
  constructor(private readonly callLogService: CallLogService) {}

  // Public endpoint so candidate voice test (magic link) can log transcripts.
  // Fires once per finalized utterance during a live call, so needs headroom above the global default.
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Post()
  createLog(@Body() body: any) {
    const sessionId = +(body.callSessionId || body.sessionId);
    return this.callLogService.createLog(sessionId, body.message, body.type);
  }

  @UseGuards(JwtAuthGuard)
  @Get('session/:sessionId')
  getLogsForSession(@Param('sessionId') sessionId: string) {
    return this.callLogService.getLogsForSession(+sessionId);
  }
}
