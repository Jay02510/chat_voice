import { useState, useEffect } from 'react';
import Auth from './Auth';
import Dashboard from './Dashboard';
import RealtimeSession from './RealtimeSession';
import VodabiReport from './report/VodabiReport';
import './index.css';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<{ id: number; email: string; name: string; role: string } | null>(
    (() => {
      const u = localStorage.getItem('current_user');
      return u ? JSON.parse(u) : null;
    })()
  );
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [language, setLanguage] = useState<string>(localStorage.getItem('app_language') || 'ko');

  // Magic Link state
  const [magicCandidate, setMagicCandidate] = useState<any | null>(null);
  const [magicLoading, setMagicLoading] = useState<boolean>(false);
  const [magicError, setMagicError] = useState<string | null>(null);
  const [magicSessionStarted, setMagicSessionStarted] = useState<boolean>(false);
  const [magicCompletedSession, setMagicCompletedSession] = useState<any | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const magicToken = params.get('token');
    if (magicToken) {
      fetchMagicCandidate(magicToken);
    }
  }, []);

  const fetchMagicCandidate = async (magicToken: string) => {
    setMagicLoading(true);
    setMagicError(null);
    try {
      const res = await fetch(`/api/candidates/public/magic/${magicToken}`);
      if (!res.ok) throw new Error(language === 'en' ? 'Invalid or expired magic link.' : '유효하지 않거나 만료된 매직링크입니다.');
      const data = await res.json();
      setMagicCandidate(data);
      if (data.callSessions && data.callSessions.length > 0) {
        const lastSession = data.callSessions[0];
        setSessionId(lastSession.id);
        if (lastSession.evaluation) setMagicCompletedSession(lastSession);
      }
    } catch (e: any) {
      setMagicError(e.message || (language === 'en' ? 'Magic link authentication failed' : '매직링크 인증 실패'));
    } finally {
      setMagicLoading(false);
    }
  };

  const handleLanguageChange = (newLang: string) => {
    localStorage.setItem('app_language', newLang);
    setLanguage(newLang);
  };

  const handleLogin = (token: string, user?: any) => {
    localStorage.setItem('token', token);
    setToken(token);
    if (user) {
      localStorage.setItem('current_user', JSON.stringify(user));
      setCurrentUser(user);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('current_user');
    setToken(null);
    setCurrentUser(null);
    setSessionId(null);
    setMagicCandidate(null);
  };

  const startMagicSession = async () => {
    if (!magicCandidate) return;
    try {
      const res = await fetch('/api/call-session/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateMagicToken: magicCandidate.magicToken }),
      });
      const data = await res.json();
      if (data && data.id) {
        setSessionId(data.id);
        setSessionToken(data.magicToken || null);
        setMagicSessionStarted(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Global Header */}
      <header style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 24px', borderBottom: '1px solid var(--glass-border)',
        background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ fontWeight: 700, fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🎤</span> VODABI Voice Evaluation System
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {currentUser && (
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ color: '#e2e8f0' }}>{currentUser.name}</span>
              <span style={{
                padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem', fontWeight: 800,
                background: currentUser.role === 'SUPER_ADMIN' ? '#7c3aed' : currentUser.role === 'ADMIN' ? '#2563eb' : '#334155',
                color: '#fff'
              }}>
                {currentUser.role}
              </span>
            </div>
          )}
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>🌐</label>
          <select
            value={language}
            onChange={(e) => handleLanguageChange(e.target.value)}
            style={{
              padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--glass-border)',
              backgroundColor: 'rgba(30, 41, 59, 0.9)', color: 'var(--text-primary)',
              cursor: 'pointer', outline: 'none', fontSize: '0.85rem',
            }}
          >
            <option value="ko">🇰🇷 한국어</option>
            <option value="en">🇺🇸 English</option>
          </select>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Magic Link Screen */}
        {magicLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <h2>🔍 Validating Candidate Magic Link...</h2>
          </div>
        ) : magicError ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#ef4444' }}>
            <h2>⚠️ {magicError}</h2>
            <p>{language === 'en' ? 'Please contact your administrator or request a new link.' : '관리자에게 문의하시거나 새로운 링크를 발급받아주세요.'}</p>
          </div>
        ) : magicCandidate && magicCompletedSession ? (
          <div style={{ padding: '30px 15px' }}>
            <VodabiReport session={magicCompletedSession} language={language} />
          </div>
        ) : magicCandidate && !magicSessionStarted && !sessionId ? (
          <div style={{ padding: '60px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
            <div className="glass-panel" style={{ padding: '40px', borderRadius: '16px' }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📋</div>
              <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>{language === 'en' ? 'VODABI Outbound Voice Roleplay Test' : 'VODABI 아웃바운드 음성 롤콜 테스트'}</h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                {language === 'en' ? (
                  <>Hello <strong>{magicCandidate.name}</strong>! Your voice roleplay test at the assigned difficulty (<strong>{magicCandidate.level}</strong>) is ready.</>
                ) : (
                  <>안녕하세요 <strong>{magicCandidate.name}</strong>님! 지정된 난이도(<strong>{magicCandidate.level}</strong>)로 음성 롤콜 테스트가 준비되었습니다.</>
                )}
              </p>
              <div style={{ background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '10px', textAlign: 'left', marginBottom: '24px', fontSize: '0.85rem', lineHeight: '1.6' }}>
                <div><strong>{language === 'en' ? 'Candidate Name:' : '지원자 이름:'}</strong> {magicCandidate.name}</div>
                <div><strong>{language === 'en' ? 'Email:' : '이메일:'}</strong> {magicCandidate.email}</div>
                <div><strong>{language === 'en' ? 'Assigned Difficulty:' : '지정 난이도:'}</strong> {magicCandidate.level}</div>
              </div>
              <button className="btn" onClick={startMagicSession} style={{ width: '100%', padding: '14px', fontSize: '1rem' }}>
                🎤 {language === 'en' ? 'Start Voice Roleplay Test' : '음성 롤콜 테스트 시작 (Start Voice Test)'}
              </button>
            </div>
          </div>
        ) : magicCandidate && sessionId ? (
          <RealtimeSession token="" sessionId={sessionId} sessionToken={sessionToken || undefined} language={language} onEndSession={() => setSessionId(null)} />
        ) : !token ? (
          <Auth onLogin={handleLogin} language={language} />
        ) : !sessionId ? (
          <Dashboard
            token={token}
            language={language}
            userRole={currentUser?.role}
            userName={currentUser?.name}
            onSessionStart={setSessionId}
            onLogout={handleLogout}
          />
        ) : (
          <RealtimeSession token={token || ''} sessionId={sessionId} language={language} onEndSession={() => setSessionId(null)} />
        )}
      </main>
    </div>
  );
}
