import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const url = (process.env.DATABASE_URL || '').replace(/^mysql:\/\//, 'mariadb://');
    const adapter = new PrismaMariaDb(url);
    super({ adapter } as any);
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Connected to database successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}