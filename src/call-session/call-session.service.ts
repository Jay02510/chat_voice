import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EvaluationService } from './evaluation.service';

const MAGIC_LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matching this codebase's JWT expiry convention

@Injectable()
export class CallSessionService {
  constructor(
    private prisma: PrismaService,
    private evaluationService: EvaluationService,
  ) {}

  async startSession(candidateId: number, personaId?: number, consentGiven = false) {
    let tierId: number | undefined;
    let scenarioTypeId: number | undefined;
    if (personaId) {
      const persona = await this.prisma.persona.findUnique({ where: { id: personaId } });
      tierId = persona?.tierId ?? undefined;
      scenarioTypeId = persona?.scenarioTypeId ?? undefined;
    }

    return this.prisma.callSession.create({
      data: {
        candidateId,
        personaId: personaId ?? null,
        tierId: tierId ?? null,
        scenarioTypeId: scenarioTypeId ?? null,
        status: 'ACTIVE',
        magicToken: randomUUID(),
        expiresAt: new Date(Date.now() + MAGIC_LINK_TTL_MS),
        consentAt: consentGiven ? new Date() : null,
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
    // Concurrent end-session calls (double-click, retry, two tabs) would otherwise
    // both pass evaluateSession's "no existing evaluation" check before either
    // finishes writing, triggering two paid GPT-4o calls and a unique-constraint
    // crash on the second insert. Short-circuit on the DB's own status field.
    const current = await this.prisma.callSession.findUnique({
      where: { id: sessionId },
      include: { candidate: true, evaluation: true },
    });
    if (current?.status === 'COMPLETED') {
      return { ...current, evaluation: current.evaluation ?? (await this.evaluationService.evaluateSession(sessionId)) };
    }

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
