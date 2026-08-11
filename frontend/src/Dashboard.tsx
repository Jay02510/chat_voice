import { useState, useEffect } from 'react';
import AdminLayout from './admin/AdminLayout';
import { useToast } from './components/Toast';

interface DashboardProps {
  token: string;
  language?: string;
  userRole?: string;
  userName?: string;
  onSessionStart: (id: number) => void;
  onLogout: () => void;
}

export default function Dashboard({ token, language = 'ko', userRole = 'MANAGER', userName, onSessionStart, onLogout }: DashboardProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<'admin' | 'new_test'>('admin');

  // New session state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Scenario (Persona) picker
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [scenarioId, setScenarioId] = useState('');

  useEffect(() => {
    fetch('/api/personas/active', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setScenarios(list);
        if (list.length > 0) setScenarioId(String(list[0].id));
      })
      .catch((err) => console.error('Failed to fetch scenarios', err));
  }, [token]);

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const candRes = await fetch('/api/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, email, phone })
      });

      if (candRes.status === 401) {
        showToast(language === 'en' ? 'Your session has expired. Please log in again.' : '로그인 세션이 만료되었습니다. 다시 로그인 해주세요.', 'error', 'Session Expired');
        onLogout();
        return;
      }

      const candData = await candRes.json();
      if (!candRes.ok) {
        throw new Error(candData.message || (language === 'en' ? 'Failed to create candidate information.' : '지원자 정보 생성에 실패했습니다.'));
      }
      
      const sessRes = await fetch('/api/call-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ candidateId: candData.id, personaId: scenarioId ? Number(scenarioId) : undefined })
      });

      if (sessRes.status === 401) {
        showToast(language === 'en' ? 'Your session has expired. Please log in again.' : '로그인 세션이 만료되었습니다. 다시 로그인 해주세요.', 'error', 'Session Expired');
        onLogout();
        return;
      }

      const sessData = await sessRes.json();
      if (!sessRes.ok) {
        throw new Error(sessData.message || (language === 'en' ? 'Failed to create call session.' : '콜 세션 생성에 실패했습니다.'));
      }

      showToast(language === 'en' ? 'Call session connected.' : '콜 세션이 연결되었습니다.', 'success', 'Session Started');
      onSessionStart(sessData.id);
    } catch (err: any) {
      console.error('Session start error:', err);
      showToast(err.message || (language === 'en' ? 'Failed to start session.' : '세션을 시작하지 못했습니다.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'admin') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: '#0f172a', padding: '8px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Language: {language === 'ko' ? '🇰🇷 한국어' : '🇺🇸 English'}</span>
          <button
            onClick={() => setMode('new_test')}
            style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
          >
            + {language === 'en' ? 'Start Voice Roleplay Test' : '새 음성 롤콜 테스트 시작'}
          </button>
        </div>
        <AdminLayout token={token} language={language} userRole={userRole} userName={userName} onLogout={onLogout} onSessionStart={onSessionStart} />
      </div>
    );
  }

  return (
    <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto', flex: 1 }}>
      <div className="glass-panel" style={{ padding: '30px', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{language === 'en' ? 'New Voice Roleplay Test' : '새 음성 롤콜 테스트'}</h2>
          <button onClick={() => setMode('admin')} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
            &larr; {language === 'en' ? 'Back to Backoffice' : '백오피스로 이동'}
          </button>
        </div>

        <form onSubmit={handleStartSession}>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>{language === 'en' ? 'Candidate Name' : '지원자 이름'}</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="John Doe"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>{language === 'en' ? 'Candidate Email' : '지원자 이메일'}</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="applicant@example.com"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>{language === 'en' ? 'Candidate Phone' : '지원자 연락처'}</label>
            <input
              type="text"
              className="input-field"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem' }}>{language === 'en' ? 'Scenario / Persona' : '시나리오 / 페르소나'}</label>
            <select
              className="input-field"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
            >
              <option value="">{language === 'en' ? 'No scenario (default)' : '시나리오 없음 (기본값)'}</option>
              {scenarios.map((sc) => (
                <option key={sc.id} value={sc.id}>{sc.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn" style={{ width: '100%', padding: '12px' }} disabled={loading}>
            {loading ? (language === 'en' ? 'Connecting...' : '연결 중...') : (language === 'en' ? 'Start Voice Roleplay Test (Live Call)' : '음성 롤콜 테스트 시작 (Live Call)')}
          </button>
        </form>
      </div>
    </div>
  );
}
