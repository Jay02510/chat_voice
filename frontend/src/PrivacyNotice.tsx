interface PrivacyNoticeProps {
  onClose: () => void;
  language?: string;
}

// Draft adapted from the reference project's legal-reviewed consent template
// (views/v3/privacy.hbs in ai_interview_poc-main), updated for this system's
// actual data flow. NOT yet legal-approved for this project — the "VOISOR"
// item below is new content with no equivalent in the source template and
// needs explicit legal review before this goes live.
//
// Korean-only for now: this is a legally binding notice, so it's shown as-is
// rather than machine-translated — an inaccurate auto-translation of consent
// language is worse than admitting no English version exists yet.
export default function PrivacyNotice({ onClose, language = 'ko' }: PrivacyNoticeProps) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#ffffff', color: '#1a1a2e', maxWidth: '720px', width: '100%', maxHeight: '85vh', overflowY: 'auto', borderRadius: '16px', padding: '32px' }}>
        <div style={{ background: '#fff8e1', border: '1px solid #ffc107', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.85rem', fontWeight: 700, color: '#873800' }}>
          초안 — 법무 검토 및 승인 전 (DRAFT — pending legal review, not yet approved for use)
        </div>
        {language === 'en' && (
          <div style={{ background: '#eef3ff', border: '1px solid #b6c9f7', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.85rem', color: '#1e3a5f' }}>
            This notice is currently available in Korean only. Please contact HR if you need an English translation before consenting.
          </div>
        )}

        <h2 style={{ marginBottom: '4px' }}>개인정보 수집·이용 동의서</h2>
        <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '24px' }}>AI 대화 역량 롤콜 서비스 (VOTEST)</p>

        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>1. 개인정보 수집·이용 목적</h3>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
            채용 전형의 일환으로 AI 롤콜을 통한 지원자의 대화 역량 평가 및 채용 여부 결정에 활용합니다.
          </p>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>2. 수집하는 개인정보 항목</h3>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#eef3ff' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #dde4f0' }}>구분</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #dde4f0' }}>수집 항목</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ padding: '6px 10px', border: '1px solid #eee' }}>필수</td><td style={{ padding: '6px 10px', border: '1px solid #eee' }}>성명, 이메일 주소</td></tr>
              <tr><td style={{ padding: '6px 10px', border: '1px solid #eee' }}>자동 수집</td><td style={{ padding: '6px 10px', border: '1px solid #eee' }}>롤콜 음성 데이터(텍스트 변환본), 롤콜 대화 로그, AI 평가 결과, 롤콜 동의 일시</td></tr>
            </tbody>
          </table>
          <div style={{ background: '#fff8e1', borderLeft: '4px solid #ffc107', padding: '10px 14px', marginTop: '10px', fontSize: '0.85rem' }}>
            음성 데이터는 OpenAI API를 통해 텍스트로 변환되어 처리되며, 원본 음성 파일은 서버에 저장되지 않습니다.
          </div>
          <div style={{ background: '#fee2e2', borderLeft: '4px solid #ef4444', padding: '10px 14px', marginTop: '10px', fontSize: '0.85rem' }}>
            <strong>[신규 — 법무 검토 필요 / NEW, not in source template]</strong> 평가 결과와 대화 기록은 지원자용 AI 코칭 도우미(VOISOR)에서도 활용되어, 지원자에게 평가 피드백을 설명하고 관리자에게 채용 리스크 분석을 제공하는 데 사용됩니다.
          </div>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>3. 개인정보 보유·이용 기간</h3>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
            [법무 확정 필요] 채용 지원자 정보 및 롤콜 대화 로그·평가 결과는 채용 전형 종료 후 6개월간 보유 후 지체 없이 파기합니다. 관련 법령상 별도 보존 의무가 있는 경우 해당 기간 동안 보관 후 파기합니다.
          </p>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>4. 개인정보의 제3자 제공(처리위탁)</h3>
          <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#eef3ff' }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #dde4f0' }}>수탁 업체</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', border: '1px solid #dde4f0' }}>위탁 업무</th>
              </tr>
            </thead>
            <tbody>
              <tr><td style={{ padding: '6px 10px', border: '1px solid #eee' }}>OpenAI, L.L.C.</td><td style={{ padding: '6px 10px', border: '1px solid #eee' }}>음성-텍스트 변환(STT), AI 대화 처리, 역량 평가, AI 코칭(VOISOR)</td></tr>
            </tbody>
          </table>
        </section>

        <section style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: '8px' }}>5. 동의 거부 권리 및 불이익</h3>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
            개인정보 수집·이용에 동의하지 않으실 수 있습니다. 다만, 동의를 거부하실 경우 AI 롤콜 진행이 불가하며, 채용 전형에 참여하지 못할 수 있습니다.
          </p>
        </section>

        <p style={{ fontSize: '0.75rem', color: '#888', marginBottom: '20px' }}>
          본 동의서는 「개인정보 보호법」 제15조 및 제22조에 따라 작성되었습니다. (초안 — 법무 검토 전)
        </p>

        <button onClick={onClose} className="btn" style={{ width: '100%', padding: '12px' }}>닫기</button>
      </div>
    </div>
  );
}
