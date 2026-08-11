import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TierService } from '../tier/tier.service';
import { SCENARIO_TYPES, SCENARIO_RUBRICS } from './scenario-rubric-seed-data';
import { PROMPT_TEMPLATE_SEED } from '../chat/prompt-template-seed-data';

const TIER_KEYS = ['beginner', 'intermediate', 'advanced'] as const;

@Injectable()
export class ScenarioTypeService implements OnModuleInit {
  constructor(
    private prisma: PrismaService,
    private tierService: TierService,
  ) {}

  async onModuleInit() {
    await this.seedDefaultScenarioTypes();
    await this.seedToneTemplates();
  }

  async seedDefaultScenarioTypes() {
    for (const st of SCENARIO_TYPES) {
      const promptContent = PROMPT_TEMPLATE_SEED.scenarios[st.key];

      let scenarioType = await this.prisma.scenarioType.findUnique({
        where: { key: st.key },
      });
      if (!scenarioType) {
        scenarioType = await this.prisma.scenarioType.create({
          data: {
            key: st.key,
            label: st.label,
            workType: st.workType,
            order: st.order,
            startingLine: promptContent?.startingLine,
            scenarioRules: promptContent?.scenarioRules,
            exampleSituation: promptContent?.exampleSituation,
          },
        });
      } else if (promptContent && !scenarioType.scenarioRules) {
        // Backfill prompt-template content onto rows created before this field existed.
        scenarioType = await this.prisma.scenarioType.update({
          where: { id: scenarioType.id },
          data: {
            startingLine: promptContent.startingLine,
            scenarioRules: promptContent.scenarioRules,
            exampleSituation: promptContent.exampleSituation,
          },
        });
      }

      const rubricByTier = SCENARIO_RUBRICS[st.key];
      if (!rubricByTier) continue;

      for (const tierKey of TIER_KEYS) {
        const tier = await this.prisma.difficultyTier.findUnique({ where: { key: tierKey } });
        if (!tier) continue;

        const existingCount = await this.prisma.scoringCriteriaItem.count({
          where: { scenarioTypeId: scenarioType.id, tierId: tier.id },
        });
        if (existingCount > 0) continue;

        const items = rubricByTier[tierKey] || [];
        for (const item of items) {
          await this.tierService.addCriteriaItem(tier.id, {
            scenarioTypeId: scenarioType.id,
            category: item.category,
            code: item.code,
            title: item.title,
            description: item.description,
            weight: item.weight,
            maxScore: item.maxScore,
            scoreSteps: item.scoreSteps,
          });
        }
      }
    }
  }

  async seedToneTemplates() {
    for (const workType of Object.keys(PROMPT_TEMPLATE_SEED.tone)) {
      for (const tierKey of TIER_KEYS) {
        const content = PROMPT_TEMPLATE_SEED.tone[workType]?.[tierKey];
        if (!content) continue;

        const existing = await this.prisma.toneTemplate.findUnique({
          where: { workType_tierKey: { workType, tierKey } },
        });
        if (existing) continue;

        await this.prisma.toneTemplate.create({
          data: { workType, tierKey, content },
        });
      }
    }
  }

  async getAllScenarioTypes() {
    return this.prisma.scenarioType.findMany({
      orderBy: { order: 'asc' },
    });
  }

  async getToneTemplate(workType: string, tierKey: string) {
    return this.prisma.toneTemplate.findUnique({
      where: { workType_tierKey: { workType, tierKey } },
    });
  }

  async getScenarioTypeCriteria(scenarioTypeId: number, tierId?: number) {
    return this.prisma.scoringCriteriaItem.findMany({
      where: {
        scenarioTypeId,
        ...(tierId ? { tierId } : {}),
      },
      orderBy: [{ tierId: 'asc' }, { code: 'asc' }],
    });
  }
}
