import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluationService } from './evaluation.service';

@Injectable()
export class CallSessionService {
  constructor(
    private prisma: PrismaService,
    private evaluationService: EvaluationService,
  ) {}

  async startSession(candidateId: number) {
    return this.prisma.callSession.create({
      data: {
        candidateId,
        status: 'ACTIVE',
        magicToken: randomUUID(),
      },
    });
  }

  async findAll() {
    return this.prisma.callSession.findMany({
      include: {
        candidate: true,
        evaluation: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async endSession(sessionId: number) {
    const session = await this.prisma.callSession.update({
      where: { id: sessionId },
      data: { status: 'COMPLETED', endedAt: new Date() },
      include: { candidate: true },
    });

    const evaluation = await this.evaluationService.evaluateSession(sessionId);
    return { ...session, evaluation };
  }

  async deleteSession(sessionId: number) {
    await this.prisma.callLog.deleteMany({
      where: { callSessionId: sessionId },
    });
    await this.prisma.evaluation.deleteMany({
      where: { callSessionId: sessionId },
    });
    return this.prisma.callSession.delete({
      where: { id: sessionId },
    });
  }
}
