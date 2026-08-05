import { Injectable, NotFoundException } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VoisorService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(private prisma: PrismaService) {}

  async chat(sessionId: number, message: string, category?: string) {
    const session = await this.prisma.callSession.findUnique({
      where: { id: sessionId },
      include: {
        candidate: true,
        evaluation: true,
        logs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!session) {
      throw new NotFoundException('Call session not found.');
    }

    const evalData = session.evaluation;
    const transcriptText = session.logs
      .map((log) => `${log.type.includes('USER') ? 'Candidate' : 'AI Evaluator'}: ${log.message}`)
      .join('\n');

    const systemPrompt = `You are VOISOR, an expert AI Sales Coach and Telemarketing Mentor for VODABI.
Your goal is to explain candidate evaluation scores, clarify rubric point deductions, and provide actionable 1-on-1 coaching based on the candidate's call test results.

Candidate Profile:
- Name: ${session.candidate?.name || 'Candidate'}
- Overall Score: ${evalData?.overallScore ?? 40.4} / 100 (${evalData?.grade ?? 'Grade D'})
- Basic Score (기본점수): ${evalData?.basicScore ?? 30} / 50
- Essential Score (필수요소): ${evalData?.essentialScore ?? 0} / 24
- Communication Score (소통력): ${evalData?.commScore ?? 10.4} / 26

Evaluation Summary:
${evalData?.verdictSummary ?? ''}

Rubric Point Deductions & Coaching Directive:
${evalData?.riskAndCoaching ?? ''}

BANTCQ Assessment:
${evalData?.bantcq ?? ''}

Call Transcript:
${transcriptText}

Guidelines for VOISOR Responses:
1. Be encouraging, professional, and highly constructive.
2. Directly answer the user's question by citing specific timestamped quotes from their transcript or specific rubric item codes (e.g. E0001 greeting, E0002 verification, MC003 speech speed WPM).
3. If category is provided (${category || 'general'}), focus heavily on that specific aspect.
4. Keep answers concise (2-4 bullet points or short paragraphs).`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });

    return {
      reply: completion.choices[0].message.content || 'I am here to coach your sales call performance. Ask me anything!',
    };
  }
}
