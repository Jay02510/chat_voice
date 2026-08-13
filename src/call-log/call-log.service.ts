import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { encrypt, decrypt } from '../common/crypto.util';

@Injectable()
export class CallLogService {
  constructor(private prisma: PrismaService) {}

  async createLog(sessionId: number, message: string, type: string) {
    const log = await this.prisma.callLog.create({
      data: {
        callSessionId: sessionId,
        message: encrypt(message),
        type, // e.g., 'TRANSCRIPT', 'ERROR', 'EVENT'
      },
    });
    return { ...log, message };
  }

  async getLogsForSession(sessionId: number) {
    const logs = await this.prisma.callLog.findMany({
      where: { callSessionId: sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return logs.map((l) => ({ ...l, message: decrypt(l.message) }));
  }
}
