import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_EVALUATION_PROMPT = `You are an expert Outbound Sales Evaluator and Hiring Quality Auditor for VODABI.
Analyze the following sales call transcript between the Candidate and the AI Evaluator.

Evaluate the candidate's performance across ALL criteria items (BS001, BS002, E0001, E0002, E0003, E0004, MC001, MC002, MC003, MC004, MC005).

Respond STRICTLY with a valid JSON object.`;

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.systemSetting.findUnique({
      where: { id: 1 },
    });

    if (!settings) {
      settings = await this.prisma.systemSetting.create({
        data: {
          id: 1,
          openingScript: '안녕하세요, 보다비 고객팀 {{name}}입니다. 최근 신규 카드를 신청하셔서 안내차 연락드렸습니다.',
          productName: '신규 카드',
          productPrice: '가입비 없음',
          productPriceUnit: '',
          productBenefits: '편의점·카페 10% 할인\n온라인 쇼핑 5% 적립',
          productCondition: '일상생활 관련 혜택이 많은 신규 카드',
          evaluationPrompt: DEFAULT_EVALUATION_PROMPT,
        },
      });
    }

    return settings;
  }

  async updateSettings(data: {
    openingScript?: string;
    productName?: string;
    productPrice?: string;
    productPriceUnit?: string;
    productBenefits?: string;
    productCondition?: string;
    evaluationPrompt?: string;
  }) {
    await this.getSettings();
    return this.prisma.systemSetting.update({
      where: { id: 1 },
      data,
    });
  }
}
