import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PersonaInput {
  name?: string;
  prompt?: string;
  mode?: string;
  voice?: string | null;
  tierId?: number | null;
  scenarioTypeId?: number | null;
  industry?: string | null;
  productContext?: string | null;
  objectionProfile?: string | null;
  openingLine?: string | null;
  isActive?: boolean;
}

@Injectable()
export class PersonaService {
  constructor(private prisma: PrismaService) {}

  // When a scenario type is assigned, mode is derived from it (workType) rather
  // than set independently, so runtime mode-based filtering stays consistent.
  private async resolveMode(data: PersonaInput): Promise<string> {
    if (data.scenarioTypeId) {
      const scenarioType = await this.prisma.scenarioType.findUnique({
        where: { id: data.scenarioTypeId },
      });
      if (scenarioType) return scenarioType.workType;
    }
    return data.mode ?? 'OUTBOUND_SALES';
  }

  async create(data: PersonaInput) {
    const mode = await this.resolveMode(data);
    return this.prisma.persona.create({
      data: {
        name: data.name!,
        prompt: data.prompt!,
        mode,
        voice: data.voice ?? null,
        tierId: data.tierId ?? null,
        scenarioTypeId: data.scenarioTypeId ?? null,
        industry: data.industry ?? null,
        productContext: data.productContext ?? null,
        objectionProfile: data.objectionProfile ?? null,
        openingLine: data.openingLine ?? null,
        isActive: data.isActive ?? true,
      },
    });
  }

  async findAll() {
    return this.prisma.persona.findMany({
      include: { tier: true, scenarioType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // Scenarios currently available for selection when starting a session.
  // No mode filter by default — the candidate-creation dropdown lists every
  // active persona across all work types (inbound/outbound/interview), not
  // just outbound. Pass `mode` to narrow to one work type when needed.
  async findActive(mode?: string) {
    return this.prisma.persona.findMany({
      where: { isActive: true, ...(mode ? { mode } : {}) },
      include: { tier: true, scenarioType: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    return this.prisma.persona.findUnique({
      where: { id },
      include: { tier: true, scenarioType: true },
    });
  }

  // Scenarios form a selectable pool, not a single exclusive one — toggle in place
  async setActive(id: number, isActive: boolean) {
    return this.prisma.persona.update({
      where: { id },
      data: { isActive },
    });
  }

  async update(id: number, data: PersonaInput) {
    const updateData: PersonaInput = { ...data };
    if (data.scenarioTypeId) {
      updateData.mode = await this.resolveMode(data);
    }
    return this.prisma.persona.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number) {
    return this.prisma.persona.delete({ where: { id } });
  }
}
