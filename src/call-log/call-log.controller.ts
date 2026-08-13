import { Controller, Post, Body, Get, Param, UseGuards, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CallLogService } from './call-log.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SessionAccessService } from '../call-session/session-access.service';
import { CreateLogDto } from './dto/create-log.dto';

@Controller('call-log')
export class CallLogController {
  constructor(
    private readonly callLogService: CallLogService,
    private readonly sessionAccessService: SessionAccessService,
  ) {}

  // Candidate voice test (magic link) logs transcripts here — no JWT available,
  // so access is proven via sessionToken instead, same as every other
  // session-touching endpoint (voisor/chat, call-session/:id/end).
  // Fires once per finalized utterance during a live call, so needs headroom above the global default.
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  @Post()
  async createLog(@Body() dto: CreateLogDto, @Headers('authorization') authHeader: string) {
    await this.sessionAccessService.verify(dto.callSessionId, dto.sessionToken, authHeader);
    return this.callLogService.createLog(dto.callSessionId, dto.message, dto.type);
  }

  @UseGuards(JwtAuthGuard)
  @Get('session/:sessionId')
  getLogsForSession(@Param('sessionId') sessionId: string) {
    return this.callLogService.getLogsForSession(+sessionId);
  }
}
