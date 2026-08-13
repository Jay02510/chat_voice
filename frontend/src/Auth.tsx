import { useState } from 'react';

interface AuthProps {
  onLogin: (token: string, user?: any) => void;
  language?: string;
}

export default function Auth({ onLogin, language = 'ko' }: AuthProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || (language === 'en' ? 'Invalid email or password.' : '이메일 또는 비밀번호가 올바르지 않습니다.'));
      onLogin(data.access_token, data.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container glass-panel">
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🎤</div>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>{language === 'en' ? 'VODABI Admin Login' : 'VODABI 관리자 로그인'}</h1>
        <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          {language === 'en' ? 'Enter your account email and password' : '계정 이메일과 비밀번호를 입력하세요'}
        </p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>{language === 'en' ? 'Email' : '이메일 (Email)'}</label>
          <input
            type="email"
            className="input-field"
            placeholder={language === 'en' ? 'you@company.com' : '이메일을 입력하세요'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>{language === 'en' ? 'Password' : '비밀번호 (Password)'}</label>
          <input
            type="password"
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p style={{ color: 'var(--danger)', marginBottom: '15px', fontSize: '0.85rem', background: 'rgba(239,68,68,0.1)', padding: '8px 12px', borderRadius: '6px' }}>{error}</p>}

        <button type="submit" className="btn" style={{ width: '100%', marginBottom: '12px' }} disabled={loading}>
          {loading ? (language === 'en' ? 'Signing in...' : '로그인 중...') : (language === 'en' ? 'Sign In' : '로그인 (Sign In)')}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.6 }}>
          {language === 'en' ? "Don't have an account? Contact your system administrator." : '계정이 없으신가요? 시스템 관리자에게 문의하세요.'}
        </p>
      </form>
    </div>
  );
}
