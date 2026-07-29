import { useState } from 'react';

interface AuthProps {
  onLogin: (token: string) => void;
}

export default function Auth({ onLogin }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.message || 'Authentication failed');

      if (!isLogin) {
        setIsLogin(true);
        setError('Registration successful! Please login.');
      } else {
        onLogin(data.access_token);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-container glass-panel">
      <h1>{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email Address</label>
          <input
            type="email"
            className="input-field"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            className="input-field"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        {error && <p style={{ color: 'var(--danger)', marginBottom: '15px', fontSize: '0.9rem' }}>{error}</p>}
        
        <button type="submit" className="btn" style={{ width: '100%', marginBottom: '15px' }}>
          {isLogin ? 'Sign In' : 'Sign Up'}
        </button>
        
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span 
            style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Register' : 'Login'}
          </span>
        </p>
      </form>
    </div>
  );
}
