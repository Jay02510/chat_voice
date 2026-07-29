import { useState } from 'react';
import Auth from './Auth';
import Dashboard from './Dashboard';
import LiveSession from './LiveSession';
import './index.css';

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [sessionId, setSessionId] = useState<number | null>(null);

  const handleLogin = (token: string) => {
    localStorage.setItem('token', token);
    setToken(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setSessionId(null);
  };

  if (!token) {
    return <Auth onLogin={handleLogin} />;
  }

  if (!sessionId) {
    return <Dashboard token={token} onSessionStart={setSessionId} onLogout={handleLogout} />;
  }

  return <LiveSession token={token} sessionId={sessionId} onEndSession={() => setSessionId(null)} />;
}
