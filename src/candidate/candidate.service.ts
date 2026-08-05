import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; email: string; phone?: string; level?: string }) {
    const magicToken = randomUUID();
    const existing = await this.prisma.candidate.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      return this.prisma.candidate.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          phone: data.phone || existing.phone,
          level: data.level || existing.level,
          magicToken: existing.magicToken || magicToken,
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
    return candidate;
  }
}
