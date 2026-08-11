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
    @Body('mode') mode: string,
    @Body('language') language: string,
    @Body('sessionToken') sessionToken: string,
    @Body('history') history: Array<{ sender: 'user' | 'voisor'; text: string }>,
    @Headers('authorization') authHeader: string,
  ) {
    const { role } = await this.sessionAccessService.verify(sessionId, sessionToken, authHeader);
    // Manager mode is only ever honored for a caller whose own JWT says they're
    // staff — never trust a client-asserted mode, since this decides which
    // persona/framing the reply gets, not what data it can see.
    const effectiveMode: 'candidate' | 'manager' =
      mode === 'manager' && role && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role) ? 'manager' : 'candidate';
    return this.voisorService.chat(sessionId, message, category, history, effectiveMode, language);
  }
}
