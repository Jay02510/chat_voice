import { Controller, Post, Body, ParseIntPipe, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { VoisorService } from './voisor.service';
import { SessionAccessService } from '../call-session/session-access.service';

@Controller('voisor')
export class VoisorController {
  constructor(
    private readonly voisorService: VoisorService,
    private readonly sessionAccessService: SessionAccessService,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('chat')
  async chat(
    @Body('sessionId', ParseIntPipe) sessionId: number,
    @Body('message') message: string,
    @Body('category') category: string,
    @Body('sessionToken') sessionToken: string,
    @Headers('authorization') authHeader: string,
  ) {
    await this.sessionAccessService.verify(sessionId, sessionToken, authHeader);
    return this.voisorService.chat(sessionId, message, category);
  }
}
