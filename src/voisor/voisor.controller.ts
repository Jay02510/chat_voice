import { Controller, Post, Body, Headers } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { VoisorService } from './voisor.service';
import { SessionAccessService } from '../call-session/session-access.service';
import { VoisorChatDto } from './dto/voisor-chat.dto';

@Controller('voisor')
export class VoisorController {
  constructor(
    private readonly voisorService: VoisorService,
    private readonly sessionAccessService: SessionAccessService,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('chat')
  async chat(@Body() dto: VoisorChatDto, @Headers('authorization') authHeader: string) {
    const { role } = await this.sessionAccessService.verify(dto.sessionId, dto.sessionToken, authHeader);
    // Manager mode is only ever honored for a caller whose own JWT says they're
    // staff — never trust a client-asserted mode, since this decides which
    // persona/framing the reply gets, not what data it can see.
    const effectiveMode: 'candidate' | 'manager' =
      dto.mode === 'manager' && role && ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role) ? 'manager' : 'candidate';
    return this.voisorService.chat(dto.sessionId, dto.message, dto.category, dto.history, effectiveMode, dto.language);
  }
}
