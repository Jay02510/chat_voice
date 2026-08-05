import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

const LOGS_DIR = join(__dirname, '..', '..', 'logs');

@Injectable()
export class ChatService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(private prisma: PrismaService) {}

  async getSessionSystemPrompt(sessionId?: number): Promise<string> {
    const settings = await this.prisma.systemSetting.findUnique({
      where: { id: 1 },
    });

    const scenarioText = `
[역할 명확화 - 아웃바운드 텔레마케팅 롤플레잉]
- 당신(AI)은 텔레마케팅 전화를 받은 일반 고객(Customer / Prospect)입니다.
- 상대방(지원자/테스트 참여자)은 아웃바운드 영업 상담사(Outbound Sales Rep)입니다.
- 절대로 당신이 먼저 상품을 설명하거나 상담사처럼 안내하지 마십시오. 지원자가 오프닝 인사와 상품 제안을 수행하는 것을 들으면서 고객 입장에서 자연스럽게 질의응답 및 반응을 하십시오.

[상품 및 시나리오 정보]
- 상품명: ${settings?.productName || '신규 카드'}
- 가격/연회비: ${settings?.productPrice || '가입비 없음'} ${settings?.productPriceUnit || ''}
- 주요혜택: ${settings?.productBenefits || '편의점·카페 10% 할인'}
- 가입조건: ${settings?.productCondition || '일상생활 관련 혜택'}
`;

    let tierKey = 'beginner';
    if (sessionId) {
      const session = await this.prisma.callSession.findUnique({
        where: { id: sessionId },
        include: { candidate: true },
      });
      if (session?.candidate?.level) {
        const levelMap: Record<string, string> = {
          '초급': 'beginner',
          '중급': 'intermediate',
          '고급': 'advanced',
          '커스텀': 'custom',
        };
        tierKey = levelMap[session.candidate.level] || 'beginner';
      }
    }

    const tier = await this.prisma.difficultyTier.findUnique({
      where: { key: tierKey },
    }) || await this.prisma.difficultyTier.findFirst({ where: { isDefault: true } });

    const fixedBase = tier?.fixedBasePrompt || '';
    const additional = tier?.additionalInstructions || '';

    return `${fixedBase}\n\n${additional}\n\n${scenarioText}`;
  }

  async chat(message: string, sessionId?: number) {
    const systemPrompt = await this.getSessionSystemPrompt(sessionId);

    let pastLogs: any[] = [];
    if (sessionId) {
      pastLogs = await this.prisma.callLog.findMany({
        where: { callSessionId: sessionId },
        orderBy: { createdAt: 'asc' },
        take: 10,
      });
    }

    const messagesArray: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
    ];

    for (const log of pastLogs) {
      messagesArray.push({
        role: log.type.includes('USER') ? 'user' : 'assistant',
        content: log.message,
      });
    }

    messagesArray.push({ role: 'user', content: message });

    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messagesArray,
    });

    return response.choices[0].message.content;
  }

  async synthesizeSpeech(text: string): Promise<string> {
    const speech = await this.openai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
      response_format: 'mp3',
    });

    await fs.mkdir(LOGS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `reply-${timestamp}.mp3`;

    await fs.writeFile(
      join(LOGS_DIR, fileName),
      Buffer.from(await speech.arrayBuffer()),
    );

    return fileName;
  }

  async saveConversation(conversation: { role: 'user' | 'ai'; text: string }[]) {
    await fs.mkdir(LOGS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `conversation-${timestamp}.txt`;

    const content = conversation
      .map((entry) => `${entry.role === 'user' ? '나' : 'GPT'} : ${entry.text}`)
      .join('\n');

    await fs.writeFile(join(LOGS_DIR, fileName), content, 'utf-8');

    return fileName;
  }
}