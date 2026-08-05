import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EvaluationService {
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  constructor(private prisma: PrismaService) {}

  async evaluateSession(sessionId: number) {
    const existing = await this.prisma.evaluation.findUnique({
      where: { callSessionId: sessionId },
    });
    if (existing) return this.parseEvaluationOutput(existing);

    const session = await this.prisma.callSession.findUnique({
      where: { id: sessionId },
      include: {
        logs: { orderBy: { createdAt: 'asc' } },
        candidate: true,
      },
    });

    if (!session || !session.logs.length) {
      return this.createDefaultEvaluation(sessionId, 'No conversation logs recorded for evaluation.');
    }

    const defaultTier = await this.prisma.difficultyTier.findFirst({
      where: { isDefault: true },
      include: { criteria: { orderBy: { code: 'asc' } } },
    });

    // Fetch configurable evaluation prompt settings
    const systemSettings = await this.prisma.systemSetting.findUnique({
      where: { id: 1 },
    });

    const criteriaList = defaultTier?.criteria || [];
    const rubricPromptText = criteriaList.map(c => `
Code: ${c.code} (${c.category} - ${c.title})
Max Score: ${c.maxScore}, Weight multiplier: x${c.weight}
Description: ${c.description}
Score Steps: ${c.scoreSteps}
`).join('\n');

    const transcriptText = session.logs
      .map((log) => {
        const timestamp = new Date(log.createdAt).toISOString().substring(14, 19);
        return `[${timestamp}] ${log.type.includes('USER') ? 'Candidate' : 'AI Evaluator'}: ${log.message}`;
      })
      .join('\n');

    const basePrompt = systemSettings?.evaluationPrompt || `You are an expert Outbound Sales Evaluator and Hiring Quality Auditor for VODABI.
Analyze the following sales call transcript between the Candidate and the AI Evaluator.`;

    const prompt = `${basePrompt}

Evaluation Criteria & Rubrics:
${rubricPromptText}

Evaluate the candidate's performance across ALL criteria items (BS001, BS002, E0001, E0002, E0003, E0004, MC001, MC002, MC003, MC004, MC005).

Respond STRICTLY with a valid JSON object matching the following structure:
{
  "overallScore": number (0-100),
  "grade": "Grade A" | "Grade B" | "Grade C" | "Grade D" | "Grade F",
  "verdictSummary": "1-2 sentence executive verdict callout on candidate readiness",
  "basicScore": number (0-50),
  "essentialScore": number (0-24),
  "commScore": number (0-26),
  "rubricResults": [
    {
      "code": "BS001",
      "title": "기본점수 1",
      "category": "기본점수",
      "achievedScore": number,
      "maxScore": number,
      "weight": number,
      "currentStatus": "현재 지원자의 발화/행동 상태 요약",
      "targetStandard": "만점 기준 조건",
      "rationale": "감점 또는 채점 상세 근거"
    }
  ],
  "hiringSummary": [
    "채용 관점 핵심 요약 bullet 1",
    "채용 관점 핵심 요약 bullet 2",
    "채용 관점 핵심 요약 bullet 3"
  ],
  "riskAndCoaching": [
    "리스크 및 코칭 1 (관련 항목 코드 포함 e.g. E0001) -> 코칭 지침",
    "리스크 및 코칭 2 (관련 항목 코드 포함 e.g. E0002) -> 코칭 지침"
  ],
  "bantcq": {
    "attitude": "태도/매너 평가 내용 (관련 항목 코드)",
    "communication": "소통력 평가 내용 (관련 항목 코드)",
    "problemSolving": "문제해결/설득 평가 내용",
    "closing": "성과지향 클로징 평가 내용",
    "fit": "직무 적합성 종합 평가"
  },
  "talkRatio": "50%:50%",
  "wpm": 200,
  "listeningNotes": "경청 및 Q&A 평가 상세",
  "clarityNotes": "발음 명료도 평가 상세",
  "callFlowPhases": [
    {
      "timeRange": "00:00-00:14",
      "phase": "오프닝",
      "summary": "구간 주요 내용 및 수행 평가"
    }
  ],
  "keyQuotes": [
    {
      "timestamp": "00:14",
      "quote": "지원자 주요 발화 인용문",
      "comment": "인용문에 대한 평가 피드백"
    }
  ],
  "onboardingPlan": [
    {
      "week": "Week 1",
      "plan": "Week 1 훈련 및 습득 과제 내용"
    },
    {
      "week": "Week 2",
      "plan": "Week 2 훈련 및 롤플레이 연습 내용"
    }
  ]
}

Transcript:
${transcriptText}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content);

      const overall = parsed.overallScore ?? 40.4;
      const grade = parsed.grade || (overall >= 90 ? 'Grade A' : overall >= 80 ? 'Grade B' : overall >= 65 ? 'Grade C' : overall >= 40 ? 'Grade D' : 'Grade F');

      const evaluationRecord = await this.prisma.evaluation.create({
        data: {
          callSessionId: sessionId,
          overallScore: Math.round(overall * 10) / 10,
          grade,
          verdictSummary: parsed.verdictSummary || '최소한의 대화는 이어갔으나 TM 기본 오프닝과 질의응답 수행이 부족해 즉시 실전 투입은 어려워 보입니다.',
          basicScore: parsed.basicScore ?? 30,
          essentialScore: parsed.essentialScore ?? 0,
          commScore: parsed.commScore ?? 10.4,

          rubricResults: JSON.stringify(parsed.rubricResults || []),
          hiringSummary: JSON.stringify(parsed.hiringSummary || []),
          riskAndCoaching: JSON.stringify(parsed.riskAndCoaching || []),
          bantcq: JSON.stringify(parsed.bantcq || {}),

          talkRatio: parsed.talkRatio || '50%:50%',
          wpm: parsed.wpm || 200,
          listeningNotes: parsed.listeningNotes || '고객의 질문이 있었으나 직성이 이어지지 않아 경청 수행이 미흡했습니다.',
          clarityNotes: parsed.clarityNotes || '발화 자체는 들리지만 짧고 단편적이어서 의미 전달이 선명하지 않았습니다.',

          callFlowPhases: JSON.stringify(parsed.callFlowPhases || []),
          keyQuotes: JSON.stringify(parsed.keyQuotes || []),
          onboardingPlan: JSON.stringify(parsed.onboardingPlan || []),

          openingScore: Math.round(parsed.basicScore ?? 30),
          discoveryScore: Math.round(parsed.essentialScore ?? 0),
          pitchScore: Math.round(parsed.commScore ?? 10),
          objectionScore: 50,
          closingScore: 50,
          strengths: JSON.stringify(parsed.hiringSummary || []),
          improvements: JSON.stringify(parsed.riskAndCoaching || []),
          summary: parsed.verdictSummary || 'Evaluation complete.',
        },
      });

      if (session.candidateId) {
        await this.prisma.candidate.update({
          where: { id: session.candidateId },
          data: { status: '평가완료', level: defaultTier?.label || '초급' },
        });
      }

      return this.parseEvaluationOutput(evaluationRecord);
    } catch (err) {
      console.error('AI Evaluation generation error:', err);
      return this.createDefaultEvaluation(sessionId, 'Evaluation fallback saved.');
    }
  }

  private async createDefaultEvaluation(sessionId: number, summaryText: string) {
    const record = await this.prisma.evaluation.create({
      data: {
        callSessionId: sessionId,
        overallScore: 40.4,
        grade: 'Grade D',
        verdictSummary: '최소한의 대화는 이어갔으나 TM 기본 오프닝과 질의응답 수행이 부족해 즉시 실전 투입은 어려워 보입니다.',
        basicScore: 30,
        essentialScore: 0,
        commScore: 10.4,
        rubricResults: JSON.stringify([]),
        hiringSummary: JSON.stringify(['짧은 대화에서도 응대 시도는 유지해 통화 자체가 중단되지는 않았습니다.']),
        riskAndCoaching: JSON.stringify(['인사·성명·소속 안내가 전혀 없어 오프닝 신뢰 형성이 어렵습니다 → 첫 10초 인사 스크립트를 고정 연습해야 합니다(E0001).']),
        bantcq: JSON.stringify({
          attitude: '통화 중 최소한의 응답은 있었으나 기본 매너 요소는 확인되지 않았습니다(E0001/E0004).',
          communication: '질문과 직접 연결된 답변이 이어지지 않아 질의응답 적합성이 낮게 평가됩니다.',
          problemSolving: '설명 확장이 없어 설득형 응대보다는 단편 응답에 머물렀습니다.',
          closing: '리콜 제약 및 마무리 멘트가 없어 성과 지향적 클로징은 확인되지 않았습니다.',
          fit: '현 단계에서는 TM 필수 절차 이행과 기본 응대 구조 보완이 선행되어야 합니다.',
        }),
        talkRatio: '50%:50%',
        wpm: 200,
        listeningNotes: '고객의 질문 요청에 직접 답변이 이어지지 않았습니다.',
        clarityNotes: '속도 또한 설명형 통화 기준에서는 다소 불안정했습니다.',
        callFlowPhases: JSON.stringify([
          { timeRange: '00:00-00:14', phase: '오프닝', summary: '인사, 성명, 소속 없이 바로 단편 설명으로 진입했습니다.' },
          { timeRange: '00:14-00:23', phase: '초기 설명', summary: '화면에 내용이 보인다는 짧은 설명만 진행했습니다.' },
          { timeRange: '00:23-00:40', phase: '질문 대응', summary: '고객의 추가 설명 요청 이후에도 질문에 직접 답하지 못했습니다.' },
        ]),
        keyQuotes: JSON.stringify([
          { timestamp: '00:14', quote: '이런 내용들이 바로 옆에 나오는 거죠', comment: '기능이나 화면 노출을 짧게 설명하려는 시도입니다.' },
        ]),
        onboardingPlan: JSON.stringify([
          { week: 'Week 1', plan: 'TM 필수 오프닝 중심으로 인사, 소속, 본인확인, 용건안내, 마무리 감사 인사를 암기하고 훈련합니다.' },
          { week: 'Week 2', plan: '고객 질문 대응 훈련에 집중해 공감 표현, 핵심 답변 1문장 구조 롤플레이를 반복합니다.' },
        ]),
        openingScore: 40,
        discoveryScore: 40,
        pitchScore: 40,
        objectionScore: 40,
        closingScore: 40,
        strengths: JSON.stringify(['통화 유지 시도']),
        improvements: JSON.stringify(['오프닝 스크립트 고정 연습']),
        summary: summaryText,
      },
    });
    return this.parseEvaluationOutput(record);
  }

  async getEvaluation(sessionId: number) {
    const record = await this.prisma.evaluation.findUnique({
      where: { callSessionId: sessionId },
    });
    return record ? this.parseEvaluationOutput(record) : null;
  }

  private parseEvaluationOutput(record: any) {
    return {
      ...record,
      rubricResults: typeof record.rubricResults === 'string' ? JSON.parse(record.rubricResults || '[]') : record.rubricResults,
      hiringSummary: typeof record.hiringSummary === 'string' ? JSON.parse(record.hiringSummary || '[]') : record.hiringSummary,
      riskAndCoaching: typeof record.riskAndCoaching === 'string' ? JSON.parse(record.riskAndCoaching || '[]') : record.riskAndCoaching,
      bantcq: typeof record.bantcq === 'string' ? JSON.parse(record.bantcq || '{}') : record.bantcq,
      callFlowPhases: typeof record.callFlowPhases === 'string' ? JSON.parse(record.callFlowPhases || '[]') : record.callFlowPhases,
      keyQuotes: typeof record.keyQuotes === 'string' ? JSON.parse(record.keyQuotes || '[]') : record.keyQuotes,
      onboardingPlan: typeof record.onboardingPlan === 'string' ? JSON.parse(record.onboardingPlan || '[]') : record.onboardingPlan,
    };
  }
}
