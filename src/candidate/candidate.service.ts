import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { encrypt, decrypt } from '../common/crypto.util';

const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matching this codebase's JWT expiry convention

// email is kept plaintext (exact-match lookup + uniqueness constraint depend
// on it); name/phone are display-only, never queried by value, so they're
// safe to encrypt without breaking any lookup path.
export function decryptCandidate<T extends { name: string; phone: string | null } | null>(candidate: T): T {
  if (!candidate) return candidate;
  return { ...candidate, name: decrypt(candidate.name), phone: candidate.phone ? decrypt(candidate.phone) : candidate.phone };
}

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; email: string; phone?: string; level?: string }) {
    const magicToken = randomUUID();
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MS);
    const existing = await this.prisma.candidate.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      // Re-registering an existing candidate is functionally a re-invite — reset the clock.
      const updated = await this.prisma.candidate.update({
        where: { id: existing.id },
        data: {
          name: encrypt(data.name),
          phone: data.phone ? encrypt(data.phone) : existing.phone,
          level: data.level || existing.level,
          // Always rotate on re-invite — keeping the old token meant a stale
          // or leaked link kept working indefinitely as expiresAt got pushed
          // forward on every subsequent re-invite.
          magicToken,
          expiresAt,
        },
      });
      return decryptCandidate(updated);
    }

    const created = await this.prisma.candidate.create({
      data: {
        name: encrypt(data.name),
        email: data.email,
        phone: data.phone ? encrypt(data.phone) : data.phone,
        level: data.level || '초급',
        magicToken,
        expiresAt,
      },
    });
    return decryptCandidate(created);
  }

  async findAll() {
    const candidates = await this.prisma.candidate.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return candidates.map(decryptCandidate);
  }

  async findOne(id: number) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id },
    });
    return decryptCandidate(candidate);
  }

  async findByMagicToken(magicToken: string) {
    const candidate = await this.prisma.candidate.findUnique({
      where: { magicToken },
      include: {
        callSessions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { evaluation: true },
        },
      },
    });
    // null expiresAt = a link issued before expiry existed — treated as never-expiring,
    // not re-issued retroactively.
    if (candidate?.expiresAt && candidate.expiresAt < new Date()) {
      return null;
    }
    return decryptCandidate(candidate);
  }
}
