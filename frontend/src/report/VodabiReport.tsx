import { t } from '../i18n';
import VoisorWidget from '../components/VoisorWidget';

interface VodabiReportProps {
  session: any;
  language?: string;
  onBack?: () => void;
  token?: string;
}

export default function VodabiReport({ session, language = 'ko', onBack, token }: VodabiReportProps) {
  const evalData = session?.evaluation;
  const candidate = session?.candidate;

  if (!evalData) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', background: '#fff', color: '#333', borderRadius: '12px' }}>
        <h3>No evaluation data recorded.</h3>
        {onBack && (
          <button className="btn btn-outline" onClick={onBack} style={{ marginTop: '15px' }}>
            &larr; {t('back_to_list', language)}
          </button>
        )}
      </div>
    );
  }

  const dateStr = session.createdAt ? new Date(session.createdAt).toISOString().split('T')[0] : '2026-07-14';

  // Category max scores vary per scenario/tier rubric (evaluation.service.ts derives
  // them dynamically at grading time) — the Evaluation record only stores achieved
  // scores, not the ceilings used, so re-derive them here from the actual graded
  // rubricResults instead of hardcoding the legacy 50/24/26 split.
  const categoryMaxFromRubric: Record<string, number> = {};
  for (const item of evalData.rubricResults || []) {
    if (item?.category) {
      categoryMaxFromRubric[item.category] = (categoryMaxFromRubric[item.category] || 0) + (item.maxScore || 0);
    }
  }
  const findCategoryMax = (needle: string, fallback: number) => {
    const key = Object.keys(categoryMaxFromRubric).find((k) => k.includes(needle));
    return key ? categoryMaxFromRubric[key] : fallback;
  };
  const basicMax = findCategoryMax('기본', 50);
  const essentialMax = findCategoryMax('필수요소', 24);
  const commMax = findCategoryMax('소통력', 26);
  const coreSkillMax = findCategoryMax('핵심', 0);
  const advancedSkillMax = findCategoryMax('고난도', 0);

  const formatDuration = () => {
    if (!session.createdAt || !session.endedAt) return '--:--';
    const totalSeconds = Math.max(0, Math.round((new Date(session.endedAt).getTime() - new Date(session.createdAt).getTime()) / 1000));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', fontFamily: 'Pretendard, -apple-system, sans-serif', color: '#1e293b', background: '#f8fafc', padding: '20px', borderRadius: '16px', position: 'relative' }}>
      
      {/* Header bar with Back button */}
      {onBack && (
        <div style={{ marginBottom: '15px' }}>
          <button 
            onClick={onBack} 
            style={{ padding: '6px 14px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
          >
            {t('back_to_list', language)}
          </button>
        </div>
      )}

      {/* 1. Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e293b 100%)', color: '#ffffff', padding: '28px', borderRadius: '12px', marginBottom: '20px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: '0.8rem', letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8, fontWeight: 700, marginBottom: '4px' }}>
          {t('report_badge', language)}
        </div>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>{t('report_title', language)}</h1>
        <p style={{ margin: '6px 0 14px 0', fontSize: '0.9rem', opacity: 0.9 }}>{t('report_sub', language)}</p>
        <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.15)', padding: '4px 10px', borderRadius: '20px' }}>
          {t('test_date', language)} · {dateStr}
        </span>
      </div>

      {/* 2. Metadata Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>{t('applicant_info', language)}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: '0.9rem' }}>
            <span style={{ color: '#64748b' }}>{t('col_name', language)}</span>
            <span style={{ fontWeight: 600 }}>{candidate?.name || 'Candidate'} <span style={{ fontSize: '0.8rem', color: '#64748b' }}>(ID: TM-2026-{candidate?.id || '0259'})</span></span>
            
            <span style={{ color: '#64748b' }}>{t('position', language)}</span>
            <span style={{ fontWeight: 600 }}>{t('position_sales', language)}</span>
            
            <span style={{ color: '#64748b' }}>{t('test_date', language)}</span>
            <span>{dateStr}</span>
          </div>
        </div>

        <div style={{ background: '#ffffff', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '1.05rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '8px' }}>{t('test_scenario', language)}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px', fontSize: '0.9rem' }}>
            <span style={{ color: '#64748b' }}>{t('difficulty', language)}</span>
            <span style={{ fontWeight: 600 }}>{candidate?.level || t('tier_beginner', language)}</span>
            
            <span style={{ color: '#64748b' }}>{t('channel', language)}</span>
            <span>{t('channel_realtime', language)}</span>
            
            <span style={{ color: '#64748b' }}>{t('call_duration', language)}</span>
            <span>{formatDuration()}</span>
          </div>
        </div>
      </div>

      {/* 3. Evaluation Summary */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a' }}>{t('eval_summary', language)}</h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('overall_score', language)}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#1e3a8a' }}>
              {evalData.overallScore}/100 <span style={{ fontSize: '1rem', fontWeight: 500, color: '#64748b' }}>({Math.round(evalData.overallScore)}%)</span>
            </div>
          </div>

          <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{t('final_grade', language)}</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: evalData.grade === 'Grade A' ? '#16a34a' : evalData.grade === 'Grade B' ? '#2563eb' : '#d97706' }}>
              {evalData.grade || 'Grade D'}
            </div>
          </div>
        </div>

        <div style={{ padding: '14px', background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: '8px', fontSize: '0.9rem', color: '#873800' }}>
          {evalData.verdictSummary || '최소한의 대화는 이어갔으나 TM 기본 오프닝과 질의응답 수행이 부족해 즉시 실전 투입은 어려워 보입니다.'}
        </div>
      </div>

      {/* 4. Core Hiring Perspective Summary */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>{t('hiring_summary', language)}</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8', fontSize: '0.9rem', color: '#334155' }}>
          {evalData.hiringSummary?.map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          )) || <li>짧은 대화에서도 응대 시도는 유지해 통화 자체가 완전히 중단되지는 않았습니다.</li>}
        </ul>
      </div>

      {/* 5. Risk & Coaching */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 14px 0', fontSize: '1.1rem', color: '#0f172a', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>{t('risk_coaching', language)}</h3>
        <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8', fontSize: '0.9rem', color: '#334155' }}>
          {evalData.riskAndCoaching?.map((item: string, idx: number) => (
            <li key={idx}>{item}</li>
          )) || <li>인사·성명·소속 안내가 전혀 없어 오프닝 신뢰 형성이 어렵습니다 &rarr; 첫 10초 인사 스크립트를 고정 연습해야 합니다 (E0001).</li>}
        </ul>
      </div>

      {/* 6. Interview Replacement Evidence (BANTCQ) */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a' }}>{t('bantcq_title', language)}</h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontWeight: 600, width: '140px', color: '#475569', background: '#f8fafc' }}>{t('bantcq_attitude', language)}</td>
                <td style={{ padding: '12px', color: '#334155' }}>{evalData.bantcq?.attitude || '통화 중 최소한의 응답은 있었으나 인사, 소속 소개, 감사 인사 등 기본 매너 요소는 확인되지 않았습니다(E0001/E0004).'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontWeight: 600, color: '#475569', background: '#f8fafc' }}>{t('bantcq_comm', language)}</td>
                <td style={{ padding: '12px', color: '#334155' }}>{evalData.bantcq?.communication || '고객이 자세한 설명을 요청했음에도 질문과 직접 연결된 답변이 이어지지 않아 경청과 질의응답 적합성이 낮게 평가됩니다(BS002/MC001).'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontWeight: 600, color: '#475569', background: '#f8fafc' }}>{t('bantcq_problem', language)}</td>
                <td style={{ padding: '12px', color: '#334155' }}>{evalData.bantcq?.problemSolving || '고객 니즈 확인이나 설명 확장이 없어 설득형 응대보다는 단편 응답에 머물렀습니다.'}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontWeight: 600, color: '#475569', background: '#f8fafc' }}>{t('bantcq_closing', language)}</td>
                <td style={{ padding: '12px', color: '#334155' }}>{evalData.bantcq?.closing || '리콜 제안, 다음 행동 합의, 종료 멘트가 없어 성과 지향적 클로징은 확인되지 않았습니다(E0004).'}</td>
              </tr>
              <tr>
                <td style={{ padding: '12px', fontWeight: 600, color: '#475569', background: '#f8fafc' }}>{t('bantcq_fit', language)}</td>
                <td style={{ padding: '12px', color: '#334155' }}>{evalData.bantcq?.fit || '현 단계에서는 TM 필수 절차 이행과 기본 응대 구조 보완이 선행되어야 하며, 교육형 온보딩 전제의 초급 수준으로 판단됩니다.'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. Score Dashboard & Itemized Evidence */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a' }}>{t('score_dashboard', language)}</h3>
        
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', marginBottom: '20px' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', color: '#475569' }}>{t('section', language)}</th>
              <th style={{ padding: '10px 14px', textAlign: 'right', color: '#475569' }}>{t('score', language)}</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px 14px', fontWeight: 600 }}>{t('cat_basic', language)}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>{evalData.basicScore ?? 30}/{basicMax}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '10px 14px', fontWeight: 600 }}>{t('cat_essential', language)}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>{evalData.essentialScore ?? 0}/{essentialMax}</td>
            </tr>
            <tr style={{ borderBottom: (coreSkillMax || advancedSkillMax) ? '1px solid #f1f5f9' : undefined }}>
              <td style={{ padding: '10px 14px', fontWeight: 600 }}>{t('cat_comm', language)}</td>
              <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>{evalData.commScore ?? 10.4}/{commMax}</td>
            </tr>
            {coreSkillMax > 0 && (
              <tr style={{ borderBottom: advancedSkillMax ? '1px solid #f1f5f9' : undefined }}>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{t('cat_core_skill', language)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>{evalData.coreSkillScore ?? 0}/{coreSkillMax}</td>
              </tr>
            )}
            {advancedSkillMax > 0 && (
              <tr>
                <td style={{ padding: '10px 14px', fontWeight: 600 }}>{t('cat_advanced_skill', language)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>{evalData.advancedSkillScore ?? 0}/{advancedSkillMax}</td>
              </tr>
            )}
          </tbody>
        </table>

        <h4 style={{ margin: '20px 0 12px 0', fontSize: '1rem', color: '#0f172a' }}>{t('rubric_evidence', language)}</h4>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {evalData.rubricResults?.map((item: any, i: number) => (
            <div key={i} style={{ padding: '14px 16px', background: '#fffbe6', borderRadius: '8px', borderLeft: '4px solid #f59e0b', border: '1px solid #ffe58f' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                  <span style={{ color: '#3b82f6', marginRight: '6px' }}>{item.code}</span> {item.title}
                </span>
                <span style={{ fontWeight: 800, color: item.achievedScore === item.maxScore ? '#16a34a' : '#d97706' }}>
                  {item.achievedScore}/{item.maxScore}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', lineHeight: '1.6', color: '#475569' }}>
                <div><strong style={{ color: '#64748b' }}>{t('current_state', language)}:</strong> {item.currentStatus}</div>
                <div><strong style={{ color: '#64748b' }}>{t('target_standard', language)}:</strong> {item.targetStandard}</div>
                <div><strong style={{ color: '#64748b' }}>{t('rationale', language)}:</strong> {item.rationale}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 8. Communication Metrics */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a' }}>{t('comm_metrics', language)}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '12px', fontSize: '0.85rem', lineHeight: '1.6' }}>
          <span style={{ color: '#64748b', fontWeight: 600 }}>{t('talk_ratio', language)}</span>
          <span style={{ fontWeight: 700 }}>{evalData.talkRatio || '50%:50%'}</span>

          <span style={{ color: '#64748b', fontWeight: 600 }}>{t('wpm', language)}</span>
          <span style={{ fontWeight: 700 }}>{evalData.wpm || 200}</span>

          <span style={{ color: '#64748b', fontWeight: 600 }}>{t('listening_qa', language)}</span>
          <span>{evalData.listeningNotes || '고객의 질문 요청이 있었으나 맞춘 답변이 이어지지 않았습니다.'}</span>

          <span style={{ color: '#64748b', fontWeight: 600 }}>{t('clarity', language)}</span>
          <span>{evalData.clarityNotes || '의미 전달이 선명하지 않았습니다.'}</span>
        </div>
      </div>

      {/* 9. Call Flow Analysis */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a' }}>{t('call_flow', language)}</h3>
        <div style={{ position: 'relative', paddingLeft: '20px', borderLeft: '2px solid #3b82f6', marginBottom: '20px' }}>
          {evalData.callFlowPhases?.map((phase: any, idx: number) => (
            <div key={idx} style={{ marginBottom: '16px', position: 'relative' }}>
              <div style={{ position: 'absolute', left: '-27px', top: '0', width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }} />
              <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>{phase.timeRange}</div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', margin: '2px 0' }}>{phase.phase}</div>
              <div style={{ fontSize: '0.85rem', color: '#475569' }}>{phase.summary}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 9b. Key Quotes / Speech Evidence */}
      {evalData.keyQuotes?.length > 0 && (
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a' }}>{t('key_quotes', language)}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {evalData.keyQuotes.map((q: any, idx: number) => (
              <div key={idx} style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                <div>
                  <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.8rem', marginRight: '8px' }}>{q.timestamp}</span>
                  <span style={{ fontStyle: 'italic', color: '#1e293b' }}>"{q.quote}"</span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', textAlign: 'right', flexShrink: 0 }}>{q.comment}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 10. Onboarding Plan */}
      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '30px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#0f172a' }}>{t('onboarding_plan', language)}</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <tbody>
            {evalData.onboardingPlan?.map((plan: any, i: number) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontWeight: 700, width: '100px', color: '#475569', background: '#f8fafc' }}>{plan.week}</td>
                <td style={{ padding: '12px', color: '#334155', lineHeight: '1.6' }}>{plan.plan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Floating VOISOR Coaching AI Widget */}
      <VoisorWidget session={session} language={language} token={token} allowManagerMode={!!token} />

    </div>
  );
}
