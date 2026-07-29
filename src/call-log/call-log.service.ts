import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CallLogService {
  constructor(private prisma: PrismaService) {}

  async createLog(sessionId: number, message: string, type: string) {
    return this.prisma.callLog.create({
      data: {
        callSessionId: sessionId,
        message,
        type, // e.g., 'TRANSCRIPT', 'ERROR', 'EVENT'
      },
    });
  }

  async getLogsForSession(sessionId: number) {
    return this.prisma.callLog.findMany({
      where: { callSessionId: sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }
}
