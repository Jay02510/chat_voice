import { Controller, Post, Body, Headers, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { RealtimeService } from './realtime.service';
import { SessionAccessService } from '../call-session/session-access.service';

@Controller('realtime')
export class RealtimeController {
  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly sessionAccessService: SessionAccessService,
  ) {}

  /**
   * POST /api/realtime/session
   * Called by the candidate browser to bootstrap a Realtime API session.
   * Returns an ephemeral token valid for ~60 seconds — used for WebRTC SDP exchange.
   * Requires proof of session ownership (admin JWT or the session's own magicToken)
   * so this can't be used to mint unlimited OpenAI-billed sessions anonymously.
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // mints a real OpenAI-billed session — keep tight
  @Post('session')
  async createSession(
    @Body('sessionId') sessionId: any,
    @Body('sessionToken') sessionToken: string,
    @Headers('authorization') authHeader: string,
  ) {
    if (!sessionId) {
      throw new BadRequestException('sessionId is required.');
    }
    const id = +sessionId;
    await this.sessionAccessService.verify(id, sessionToken, authHeader);
    return this.realtimeService.createSession(id);
  }
}
