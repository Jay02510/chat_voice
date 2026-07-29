import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CandidateService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; email: string }) {
    return this.prisma.candidate.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.candidate.findMany();
  }

  async findOne(id: number) {
    return this.prisma.candidate.findUnique({
      where: { id },
    });
  }
}
