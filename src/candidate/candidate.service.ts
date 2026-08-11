import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matching this codebase's JWT expiry convention

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
      return this.prisma.candidate.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          phone: data.phone || existing.phone,
          level: data.level || existing.level,
          magicToken: existing.magicToken || magicToken,
          expiresAt,
        },
      });
    }

    return this.prisma.candidate.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        level: data.level || '초급',
        magicToken,
        expiresAt,
      },
    });
  }

  async findAll() {
    return this.prisma.candidate.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.candidate.findUnique({
      where: { id },
    });
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
    return candidate;
  }
}
