import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

// Authorizes access to a CallSession either via a valid admin JWT,
// or via the session's own magicToken (issued to the candidate at session start).
@Injectable()
export class SessionAccessService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  // Returns the caller's decoded JWT role when auth was via a staff login, or
  // null when auth was via the session's own magicToken (candidate access) —
  // callers that need to know who's asking (e.g. gating a manager-only feature)
  // can use this instead of re-decoding the JWT themselves.
  async verify(sessionId: number, sessionToken?: string, authHeader?: string): Promise<{ role: string | null }> {
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = this.jwtService.verify(authHeader.slice(7));
        // Re-check the DB rather than trusting the token's role claim — a
        // demoted/deleted staff account should lose access immediately, not
        // keep it for the rest of the token's 7-day lifetime.
        const user = payload?.sub ? await this.prisma.user.findUnique({ where: { id: payload.sub } }) : null;
        if (!user) throw new UnauthorizedException();
        return { role: user.role };
      } catch {
        // fall through to session-token check
      }
    }

    if (sessionToken) {
      const session = await this.prisma.callSession.findUnique({ where: { id: sessionId } });
      // null expiresAt = a session created before expiry existed — treated as never-expiring.
      const expired = session?.expiresAt && session.expiresAt < new Date();
      if (session?.magicToken && session.magicToken === sessionToken && !expired) {
        return { role: null };
      }
    }

    throw new UnauthorizedException('Not authorized to access this session.');
  }
}
