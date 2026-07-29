import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CallSessionService {
  constructor(private prisma: PrismaService) {}

  async startSession(candidateId: number) {
    return this.prisma.callSession.create({
      data: {
        candidateId,
        status: 'ACTIVE',
      },
    });
  }

  async findAll() {
    return this.prisma.callSession.findMany({
      include: {
        candidate: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async endSession(sessionId: number) {
    return this.prisma.callSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });
  }
}
