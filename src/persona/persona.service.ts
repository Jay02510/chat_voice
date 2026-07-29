import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PersonaService {
  constructor(private prisma: PrismaService) {}

  async create(name: string, prompt: string) {
    return this.prisma.persona.create({
      data: { name, prompt },
    });
  }

  async findAll() {
    return this.prisma.persona.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async activate(id: number) {
    // Deactivate all
    await this.prisma.persona.updateMany({
      data: { isActive: false },
    });
    // Activate specific
    return this.prisma.persona.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async update(id: number, data: { name?: string; prompt?: string }) {
    return this.prisma.persona.update({
      where: { id },
      data,
    });
  }
}
