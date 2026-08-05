import { useState } from 'react';
import { useToast } from './Toast';

interface VoisorWidgetProps {
  session: any;
  language?: string;
  token?: string;
}

export default function VoisorWidget({ session, language = 'ko', token }: VoisorWidgetProps) {
  const { showToast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'voisor'; text: string }>>([
    {
      sender: 'voisor',
      text: language === 'en'
        ? `👋 Hello ${session.candidate?.name || 'Candidate'}! I am VOISOR, your AI Sales Coach. I analyzed your test score (${session.evaluation?.overallScore ?? 40.4}/100 - ${session.evaluation?.grade ?? 'Grade D'}). How can I help you improve?`
        : `👋 안녕하세요 ${session.candidate?.name || '지원자'}님! VODABI AI 롤콜 코치 VOISOR입니다. 고객님의 평가 점수(${session.evaluation?.overallScore ?? 40.4}점 - ${session.evaluation?.grade ?? 'Grade D'})를 분석했습니다. 개선점이나 감점 원인에 대해 물어보세요!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const quickChips = [
    { label: language === 'en' ? '🎯 Fix Greeting (E0001)' : '🎯 인사/소속 감점 원인 (E0001)', prompt: '오프닝 인사 및 소속 안내 감점 원인과 개선 스크립트를 알려줘.' },
    { label: language === 'en' ? '💬 Handle Price Objections' : '💬 가격 반론 대응법', prompt: '고객 가격 반론에 대한 효과적인 3단계 응대법을 알려줘.' },
    { label: language === 'en' ? '📈 Speech Speed (WPM)' : '📈 말하기 속도(WPM) 조절법', prompt: '말하기 속도가 빠른 편인데 어떻게 호흡과 속도를 조절해야 할까?' },
    { label: language === 'en' ? '🚀 2-Week Coaching Plan' : '🚀 2주 집중 훈련 가이드', prompt: '내 점수를 바탕으로 우선순위 훈련 과제를 설명해줘.' },
  ];

  const sendMessage = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim()) return;

    setMessages((prev) => [...prev, { sender: 'user', text: textToSend }]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/voisor/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          sessionId: session.id || session.callSessionId,
          sessionToken: session.magicToken,
          message: textToSend,
        }),
      });
      const data = await res.json();
      if (data && data.reply) {
        setMessages((prev) => [...prev, { sender: 'voisor', text: data.reply }]);
      } else {
        showToast('VOISOR 응답을 불러오지 못했습니다.', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('VOISOR 서비스에 접속할 수 없습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9000, fontFamily: 'Pretendard, -apple-system, sans-serif' }}>
      {/* Floating Button Avatar */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2563eb, #1e3a8a)',
            color: '#ffffff',
            border: 'none',
            fontSize: '2rem',
            cursor: 'pointer',
            boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'transform 0.2s ease',
          }}
          title="Open VOISOR AI Sales Coach"
        >
          🤖
        </button>
      )}

      {/* Slide-Out Coaching Widget Panel */}
      {isOpen && (
        <div
          style={{
            width: '380px',
            height: '540px',
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #cbd5e1',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{ background: '#1e293b', padding: '16px', color: '#ffffff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>🤖 VOISOR</span>
                <span style={{ fontSize: '0.65rem', padding: '2px 6px', background: '#2563eb', borderRadius: '10px' }}>AI Coach</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                {language === 'en' ? 'Context-Aware Score Assistant' : '맞춤형 AI 실시간 성과 코치'}
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.2rem', cursor: 'pointer' }}
            >
              &times;
            </button>
          </div>

          {/* Quick Category Prompt Chips */}
          <div style={{ padding: '12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(chip.prompt)}
                disabled={loading}
                style={{
                  padding: '5px 10px',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '14px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Chat Messages */}
          <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                style={{
                  alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: m.sender === 'user' ? '#2563eb' : '#f1f5f9',
                  color: m.sender === 'user' ? '#ffffff' : '#0f172a',
                  padding: '10px 14px',
                  borderRadius: m.sender === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  fontSize: '0.82rem',
                  lineHeight: '1.5',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf: 'flex-start', color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic' }}>
                🤖 VOISOR is auditing transcript details...
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            style={{ padding: '12px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '8px', background: '#ffffff' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={language === 'en' ? 'Ask VOISOR about your score...' : 'VOISOR에게 피드백을 물어보세요...'}
              style={{ flex: 1, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.82rem' }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{ padding: '8px 14px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
