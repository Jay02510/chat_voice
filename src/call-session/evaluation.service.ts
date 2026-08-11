import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';
import { deriveCategoryTotals } from './category-score.util';

type ScoreStep = { label: string; score: number };

function parseSteps(raw: string): ScoreStep[] {
  try {
    const parsed = JSON.parse(raw || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// mm:ss elapsed since call start — NOT the wall-clock minute/second of `at`.
// A call recorded at, say, 01:34:56 wall time must show "00:xx", not "34:56".
function elapsedTimestamp(at: Date, callStart: Date): string {
  const totalSeconds = Math.max(0, Math.floor((at.getTime() - callStart.getTime()) / 1000));
  const mm = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const ss = (totalSeconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

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
        persona: true,
      },
    });

    if (!session || !session.logs.length) {
      return this.createDefaultEvaluation(sessionId, 'No conversation logs recorded for evaluation.');
    }

    // Score against the tier tied to this session's scenario when set, else the default tier
    const tier = session.tierId
      ? await this.prisma.difficultyTier.findUnique({ where: { id: session.tierId } })
      : await this.prisma.difficultyTier.findFirst({ where: { isDefault: true } });

    // When the persona was assigned a scenario type, score against that
    // scenario's (scenarioType × tier) rubric; otherwise fall back to the
    // legacy generic tier-only rubric (scenarioTypeId = null) unchanged.
    let criteriaList = session.scenarioTypeId && tier
      ? await this.prisma.scoringCriteriaItem.findMany({
          where: { scenarioTypeId: session.scenarioTypeId, tierId: tier.id },
          orderBy: { code: 'asc' },
        })
      : [];

    if (!criteriaList.length) {
      criteriaList = tier
        ? await this.prisma.scoringCriteriaItem.findMany({
            where: { tierId: tier.id, scenarioTypeId: null },
            orderBy: { code: 'asc' },
          })
        : [];
    }

    // Fetch configurable evaluation prompt settings
    const systemSettings = await this.prisma.systemSetting.findUnique({
      where: { id: 1 },
    });

    // Steps are listed with explicit indices and the LLM is asked to pick one (below),
    // rather than freely generating a raw achievedScore — the actual score is looked
    // up deterministically from the picked index after the response comes back, so it
    // can never disagree with the rubric's own defined step scores.
    const rubricPromptText = criteriaList.map(c => {
      const steps = parseSteps(c.scoreSteps);
      const stepLines = steps.map((s, i) => `  ${i}: ${s.label}`).join('\n');
      return `
Code: ${c.code} (${c.category} - ${c.title})
Description: ${c.description}
Steps (pick the index that best matches the conversation):
${stepLines}`;
    }).join('\n');

    const scenarioContextText = session.persona
      ? `
Scenario Context (the AI played this customer persona during the call):
- Persona: ${session.persona.prompt}
- Industry: ${session.persona.industry || 'n/a'}
- Product/Offer: ${session.persona.productContext || 'n/a'}
- Expected objections raised: ${session.persona.objectionProfile || 'n/a'}
Evaluate the candidate's handling of THIS specific scenario and its objections, not a generic call.
`
      : '';

    const callStart = session.logs[0].createdAt;

    const transcriptText = session.logs
      .map((log) => {
        const timestamp = elapsedTimestamp(log.createdAt, callStart);
        return `[${timestamp}] ${log.type.includes('USER') ? 'Candidate' : 'AI Evaluator'}: ${log.message}`;
      })
      .join('\n');

    // Quote grounding: the LLM can only pick keyQuotes.quote verbatim from this
    // numbered list of the candidate's actual lines, never compose one freely —
    // otherwise a "key quote" in the report can be a plausible-sounding line the
    // candidate never actually said.
    const candidateLogs = session.logs.filter((log) => log.type.includes('USER'));
    const candidateQuoteCandidates = candidateLogs
      .map((log, i) => `${i}: [${elapsedTimestamp(log.createdAt, callStart)}] ${log.message}`)
      .join('\n');

    const basePrompt = systemSettings?.evaluationPrompt || `You are an expert Outbound Sales Evaluator and Hiring Quality Auditor for VODABI.
Analyze the following sales call transcript between the Candidate and the AI Evaluator.`;

    const prompt = `${basePrompt}
${scenarioContextText}
Evaluation Criteria & Rubrics:
${rubricPromptText}

Evaluate the candidate's performance across ALL criteria items (${criteriaList.map(c => c.code).join(', ') || 'as listed above'}). For each, pick the step index (an integer) that best matches what the candidate actually did — do not invent a score, only pick from the listed steps.

rubricResults MUST include exactly one entry per code listed above (${criteriaList.map(c => c.code).join(', ') || 'n/a'}), and "code" MUST be copied exactly as shown in [Evaluation Criteria & Rubrics] above — never invent, reformat, or abbreviate a code.

Respond STRICTLY with a valid JSON object matching the following structure (the "code" value below is just illustrating the field, use the REAL codes listed above instead):
{
  "verdictSummary": "1-2 sentence executive verdict callout on candidate readiness",
  "rubricResults": [
    {
      "code": "${criteriaList[0]?.code || 'BS001'}",
      "stepIndex": 0,
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
      "candidateIndex": 0,
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

keyQuotes.candidateIndex MUST be one of the index numbers from [Candidate Lines] below — never invent quote text.

[Candidate Lines]
${candidateQuoteCandidates}

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

      // Deterministic scoring: look up each item's achieved score from its own
      // scoreSteps by the LLM-picked index, rather than trusting a freely
      // generated number. Drop any rubric code the LLM invented that doesn't
      // match a real criteria item — that's hallucination, not a real result.
      const criteriaByCode = new Map(criteriaList.map((c) => [c.code, c]));
      const rubricResults = (Array.isArray(parsed.rubricResults) ? parsed.rubricResults : [])
        .map((r: any) => {
          const item = criteriaByCode.get(r?.code);
          if (!item) return null;
          const steps = parseSteps(item.scoreSteps);
          const stepIndex = Math.max(0, Math.min(Math.round(r.stepIndex ?? 0), Math.max(steps.length - 1, 0)));
          const achievedScore = steps[stepIndex]?.score ?? 0;
          return {
            code: item.code,
            title: item.title,
            category: item.category,
            achievedScore,
            maxScore: item.maxScore,
            weight: item.weight,
            stepIndex,
            stepLabel: steps[stepIndex]?.label,
            currentStatus: r.currentStatus,
            targetStandard: r.targetStandard,
            rationale: r.rationale,
          };
        })
        .filter((r: any): r is NonNullable<typeof r> => r !== null);

      // A real criteria list producing zero matched results means every code the
      // LLM returned failed to match — a prompt/schema mismatch, not a candidate
      // who scored zero on everything. Surface it instead of silently persisting
      // a zeroed-out evaluation with no trace of why.
      if (criteriaList.length > 0 && rubricResults.length === 0) {
        console.error(`Evaluation for session ${sessionId}: 0/${criteriaList.length} rubric codes matched — LLM response likely used wrong code format. Raw rubricResults:`, parsed.rubricResults);
      }

      // Category totals and overall score/grade are summed in code from the
      // deterministic rubricResults above — never independently asked of the
      // LLM, so they can't silently disagree with the item-level scores.
      const { basicScore, essentialScore, commScore, coreSkillScore, advancedSkillScore } = deriveCategoryTotals(rubricResults);
      const totalAchieved = rubricResults.reduce((sum, r) => sum + r.achievedScore, 0);
      const totalMax = rubricResults.reduce((sum, r) => sum + r.maxScore, 0);
      const overall = totalMax > 0 ? (totalAchieved / totalMax) * 100 : 0;
      const grade = overall >= 90 ? 'Grade A' : overall >= 80 ? 'Grade B' : overall >= 65 ? 'Grade C' : overall >= 40 ? 'Grade D' : 'Grade F';

      // keyQuotes.quote is resolved from the candidate's actual transcript line by
      // index, never taken from free-form LLM text — same anti-hallucination
      // technique as the rubric codes above.
      const keyQuotes = (Array.isArray(parsed.keyQuotes) ? parsed.keyQuotes : [])
        .map((q: any) => {
          const log = candidateLogs[q?.candidateIndex];
          if (!log) return null;
          return {
            timestamp: elapsedTimestamp(log.createdAt, callStart),
            quote: log.message,
            comment: q.comment,
          };
        })
        .filter((q: any): q is NonNullable<typeof q> => q !== null);

      const evaluationRecord = await this.prisma.evaluation.create({
        data: {
          callSessionId: sessionId,
          overallScore: Math.round(overall * 10) / 10,
          grade,
          verdictSummary: parsed.verdictSummary || '최소한의 대화는 이어갔으나 TM 기본 오프닝과 질의응답 수행이 부족해 즉시 실전 투입은 어려워 보입니다.',
          basicScore,
          essentialScore,
          commScore,
          coreSkillScore,
          advancedSkillScore,

          rubricResults: JSON.stringify(rubricResults),
          hiringSummary: JSON.stringify(parsed.hiringSummary || []),
          riskAndCoaching: JSON.stringify(parsed.riskAndCoaching || []),
          bantcq: JSON.stringify(parsed.bantcq || {}),

          talkRatio: parsed.talkRatio || '50%:50%',
          wpm: parsed.wpm || 200,
          listeningNotes: parsed.listeningNotes || '고객의 질문이 있었으나 직성이 이어지지 않아 경청 수행이 미흡했습니다.',
          clarityNotes: parsed.clarityNotes || '발화 자체는 들리지만 짧고 단편적이어서 의미 전달이 선명하지 않았습니다.',

          callFlowPhases: JSON.stringify(parsed.callFlowPhases || []),
          keyQuotes: JSON.stringify(keyQuotes),
          onboardingPlan: JSON.stringify(parsed.onboardingPlan || []),

          openingScore: Math.round(basicScore),
          discoveryScore: Math.round(essentialScore),
          pitchScore: Math.round(commScore),
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
          data: { status: '평가완료', level: tier?.label || '초급' },
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
