import { Injectable, NotFoundException } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { deriveCategoryMaxes } from '../call-session/category-score.util';
import { decryptEvaluationRecord } from '../call-session/evaluation.service';
import { decrypt } from '../common/crypto.util';

@Injectable()
export class VoisorService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(private prisma: PrismaService) {}

  async chat(
    sessionId: number,
    message: string,
    category?: string,
    history: Array<{ sender: 'user' | 'voisor'; text: string }> = [],
    mode: 'candidate' | 'manager' = 'candidate',
    language: string = 'ko',
  ) {
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

    // session.evaluation is the raw encrypted Prisma record — decrypt/parse it
    // the same way EvaluationService does (shared helper), since this service
    // reads it directly rather than going through EvaluationService.
    const evalData = session.evaluation ? decryptEvaluationRecord(session.evaluation) : null;
    const transcriptText = session.logs
      .map((log) => `${log.type.includes('USER') ? 'Candidate' : 'AI Evaluator'}: ${decrypt(log.message)}`)
      .join('\n');

    const rubricResults: Array<{ category: string; maxScore: number }> = evalData?.rubricResults || [];
    const riskAndCoaching: string[] = evalData?.riskAndCoaching || [];
    const bantcq: Record<string, string> = evalData?.bantcq || {};

    const { basicMax, essentialMax, commMax, coreSkillMax, advancedSkillMax } = deriveCategoryMaxes(rubricResults);

    // Shared across both personas — same underlying evaluation, regardless of who's asking.
    const dataBlock = `Candidate Profile:
- Name: ${session.candidate?.name || 'Candidate'}
- Overall Score: ${evalData?.overallScore ?? 40.4} / 100 (${evalData?.grade ?? 'Grade D'})
- Basic Score (기본점수): ${evalData?.basicScore ?? 30} / ${basicMax}
- Essential Score (필수요소): ${evalData?.essentialScore ?? 0} / ${essentialMax}
- Communication Score (소통력): ${evalData?.commScore ?? 10.4} / ${commMax}${coreSkillMax ? `\n- Core Skill Score (핵심 스킬): ${evalData?.coreSkillScore ?? 0} / ${coreSkillMax}` : ''}${advancedSkillMax ? `\n- Advanced Skill Score (고난도 스킬): ${evalData?.advancedSkillScore ?? 0} / ${advancedSkillMax}` : ''}

Evaluation Summary:
${evalData?.verdictSummary ?? ''}

Rubric Point Deductions & Coaching Directive:
${riskAndCoaching.length ? riskAndCoaching.map((r) => `- ${r}`).join('\n') : '(none recorded)'}

BANTCQ Assessment:
${Object.entries(bantcq).map(([k, v]) => `- ${k}: ${v}`).join('\n') || '(none recorded)'}

Call Transcript:
${transcriptText}`;

    const personaBlock = mode === 'manager'
      ? `You are VOISOR, an objective sales-performance analyst and hiring-risk advisor for VODABI, currently in [MANAGER VIEW].
Your audience is the hiring manager or team lead reviewing this candidate's test — not the candidate.

Persona:
- Cold, analytical, professional — no encouragement, no cheerleading. Refer to the candidate in the 3rd person ("해당 지원자는...", "${session.candidate?.name || 'the candidate'} 지원자는...").
- Your job: summarize hiring risk objectively, and give the manager a concrete plan for what to do about this candidate — an intervention/coaching plan if hiring, or a clear rationale if not.
- Every claim must be grounded in the actual score/transcript data above — never speculate beyond it.`
      : `You are VOISOR, an expert AI Sales Coach and Telemarketing Mentor for VODABI, currently in [CANDIDATE VIEW].
Your goal is to explain evaluation scores, clarify rubric point deductions, and provide actionable 1-on-1 coaching to the candidate themselves.

Persona:
- Warm, encouraging, personal — address the candidate directly as "${session.candidate?.name || '지원자'}님".
- Be highly constructive: when pointing out a weakness, always pair it with a concrete way to improve.`;

    const guidelines = `Guidelines for VOISOR Responses:
1. First classify the question's intent:
   - DATA question (a plain score/fact lookup, "what was my X score", "점수 알려줘"): answer with zero filler — a markdown table or bullet list only, no intro/outro sentences.
   - COACHING question (improvement, risk, "what should I do", a script/plan request): structure the answer as exactly three parts:
     - 🔍 Fact — cite the specific score/rubric code/transcript quote this is based on.
     - ⚠️ Impact — what this costs in a real call (lost trust, lost sale, compliance risk).
     - 🛠️ Fix — a concrete next action: ${mode === 'manager' ? 'a specific observation/intervention step for the manager to run with this candidate' : 'an AS-IS (what they said) vs TO-BE (better phrasing) script the candidate can use next time'}.
2. Directly answer by citing specific rubric item codes (e.g. E0001 greeting, E0002 verification, MC003 speech speed WPM) or transcript quotes — never vague generalities.
3. If category is provided (${category || 'general'}), focus heavily on that specific aspect.
4. Keep answers concise.
5. Respond only in ${language === 'en' ? 'English' : 'Korean'} — regardless of what language the user's message or prior conversation turns are in, never mix languages in your reply.`;

    const systemPrompt = `${personaBlock}\n\n${dataBlock}\n\n${guidelines}`;

    // System prompt is identical for every message in this session (same transcript/eval),
    // so keeping it as a fixed first element lets OpenAI's automatic prompt caching kick in
    // on repeat calls. History is capped so context doesn't grow unbounded across a long chat.
    const recentHistory = history.slice(-20).map((h) => ({
      role: (h.sender === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: h.text,
    }));

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        ...recentHistory,
        { role: 'user', content: message },
      ],
    });

    return {
      reply: completion.choices[0].message.content || 'I am here to coach your sales call performance. Ask me anything!',
    };
  }
}
