import { useState, useEffect } from 'react';

interface DashboardProps {
  token: string;
  onSessionStart: (id: number) => void;
  onLogout: () => void;
}

export default function Dashboard({ token, onSessionStart, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'personas'>('new');
  
  // New session state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  // History state
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionLogs, setSelectedSessionLogs] = useState<any[] | null>(null);

  // Personas state
  const [personas, setPersonas] = useState<any[]>([]);
  const [editingPersona, setEditingPersona] = useState<any>(null);
  const [personaName, setPersonaName] = useState('');
  const [personaPrompt, setPersonaPrompt] = useState('');
  const [personaSaving, setPersonaSaving] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchSessions();
    } else if (activeTab === 'personas') {
      fetchPersonas();
    }
  }, [activeTab]);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/call-session', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    }
  };

  const fetchLogs = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/call-log/session/${sessionId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setSelectedSessionLogs(data);
    } catch (err) {
      console.error('Failed to fetch logs', err);
    }
  };

  const fetchPersonas = async () => {
    try {
      const res = await fetch('/api/personas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setPersonas(data);
    } catch (err) {
      console.error('Failed to fetch personas', err);
    }
  };

  const savePersona = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonaSaving(true);
    try {
      const method = editingPersona ? 'PUT' : 'POST';
      const url = editingPersona ? `/api/personas/${editingPersona.id}` : '/api/personas';
      await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: personaName, prompt: personaPrompt })
      });
      setEditingPersona(null);
      setPersonaName('');
      setPersonaPrompt('');
      fetchPersonas();
    } catch (err) {
      console.error(err);
      alert('Failed to save persona');
    } finally {
      setPersonaSaving(false);
    }
  };

  const activatePersona = async (id: number) => {
    try {
      await fetch(`/api/personas/${id}/activate`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchPersonas();
    } catch (err) {
      console.error(err);
      alert('Failed to activate persona');
    }
  };

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
        body: JSON.stringify({ name, email })
      });
      const candData = await candRes.json();
      
      const sessRes = await fetch('/api/call-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ candidateId: candData.id })
      });
      const sessData = await sessRes.json();
      
      onSessionStart(sessData.id);
    } catch (err) {
      console.error(err);
      alert('Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container glass-panel" style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Dashboard</h2>
        <button onClick={onLogout} className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
          Logout
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '1px solid var(--border)' }}>
        <button 
          onClick={() => setActiveTab('new')} 
          style={{ padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'new' ? '2px solid var(--primary)' : 'none', color: activeTab === 'new' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
        >
          New Session
        </button>
        <button 
          onClick={() => setActiveTab('history')} 
          style={{ padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'history' ? '2px solid var(--primary)' : 'none', color: activeTab === 'history' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
        >
          Session History
        </button>
        <button 
          onClick={() => {
            setActiveTab('personas');
            setEditingPersona(null);
            setPersonaName('');
            setPersonaPrompt('');
          }} 
          style={{ padding: '10px', background: 'none', border: 'none', borderBottom: activeTab === 'personas' ? '2px solid var(--primary)' : 'none', color: activeTab === 'personas' ? 'var(--primary)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}
        >
          Personas
        </button>
      </div>

      {activeTab === 'new' && (
        <form onSubmit={handleStartSession}>
          <div className="form-group">
            <label>Candidate Name</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="John Doe"
            />
          </div>
          <div className="form-group">
            <label>Candidate Email</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="john@example.com"
            />
          </div>
          <button type="submit" className="btn" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Starting...' : 'Connect Live Session'}
          </button>
        </form>
      )}

      {activeTab === 'history' && (
        <div>
          {selectedSessionLogs ? (
            <div>
              <button className="btn btn-outline" onClick={() => setSelectedSessionLogs(null)} style={{ marginBottom: '20px', fontSize: '0.8rem', padding: '4px 8px' }}>
                &larr; Back to Sessions
              </button>
              <div style={{ maxHeight: '400px', overflowY: 'auto', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px' }}>
                {selectedSessionLogs.length === 0 && <p>No logs found for this session.</p>}
                {selectedSessionLogs.map((log, i) => (
                  <div key={i} style={{ marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginBottom: '4px' }}>
                      {log.type} • {new Date(log.createdAt).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.9rem' }}>{log.message}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {sessions.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No past sessions found.</p>}
              {sessions.map(session => (
                <div key={session.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '10px' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{session.candidate?.name || 'Unknown Candidate'}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{session.candidate?.email || 'N/A'}</div>
                    <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>
                      Status: <span style={{ color: session.status === 'ACTIVE' ? 'green' : 'gray' }}>{session.status}</span>
                      {' • '} {new Date(session.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <button className="btn btn-outline" onClick={() => fetchLogs(session.id)} style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                    View Transcript
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'personas' && (
        <div style={{ display: 'flex', gap: '20px' }}>
          {/* Personas List */}
          <div style={{ flex: 1, maxHeight: '500px', overflowY: 'auto' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>Existing Personas</h3>
            {personas.length === 0 && <p style={{ color: 'var(--text-secondary)' }}>No personas found.</p>}
            {personas.map(p => (
              <div key={p.id} style={{ padding: '15px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', marginBottom: '10px', border: p.isActive ? '1px solid var(--primary)' : '1px solid transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600 }}>
                    {p.name}
                    {p.isActive && <span style={{ marginLeft: '10px', fontSize: '0.7rem', padding: '2px 6px', background: 'var(--primary)', color: 'white', borderRadius: '12px' }}>ACTIVE</span>}
                  </div>
                  <div>
                    {!p.isActive && (
                      <button className="btn btn-outline" onClick={() => activatePersona(p.id)} style={{ fontSize: '0.7rem', padding: '4px 8px', marginRight: '5px' }}>
                        Set Active
                      </button>
                    )}
                    <button className="btn btn-outline" onClick={() => {
                      setEditingPersona(p);
                      setPersonaName(p.name);
                      setPersonaPrompt(p.prompt);
                    }} style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Persona Editor */}
          <div style={{ flex: 1, padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '15px' }}>{editingPersona ? 'Edit Persona' : 'Create New Persona'}</h3>
            <form onSubmit={savePersona}>
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={personaName}
                  onChange={(e) => setPersonaName(e.target.value)}
                  required
                  placeholder="e.g. Sales Evaluator"
                />
              </div>
              <div className="form-group">
                <label>System Prompt</label>
                <textarea
                  className="input-field"
                  value={personaPrompt}
                  onChange={(e) => setPersonaPrompt(e.target.value)}
                  required
                  placeholder="Enter the instructions and framework (e.g., BANTCQ) here..."
                  style={{ height: '200px', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn" style={{ flex: 1 }} disabled={personaSaving}>
                  {personaSaving ? 'Saving...' : (editingPersona ? 'Save Changes' : 'Create Persona')}
                </button>
                {editingPersona && (
                  <button type="button" className="btn btn-outline" onClick={() => {
                    setEditingPersona(null);
                    setPersonaName('');
                    setPersonaPrompt('');
                  }}>
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
