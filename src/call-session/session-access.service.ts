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

  async verify(sessionId: number, sessionToken?: string, authHeader?: string): Promise<void> {
    if (authHeader?.startsWith('Bearer ')) {
      try {
        this.jwtService.verify(authHeader.slice(7));
        return;
      } catch {
        // fall through to session-token check
      }
    }

    if (sessionToken) {
      const session = await this.prisma.callSession.findUnique({ where: { id: sessionId } });
      if (session?.magicToken && session.magicToken === sessionToken) {
        return;
      }
    }

    throw new UnauthorizedException('Not authorized to access this session.');
  }
}
