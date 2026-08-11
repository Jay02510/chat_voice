import { useState, useEffect } from 'react';
import { t } from '../i18n';
import { useToast } from '../components/Toast';

interface ApplicantListProps {
  token: string;
  language?: string;
  onSelectSession: (session: any) => void;
  onStartSession?: (id: number) => void;
}

export default function ApplicantList({ token, language = 'ko', onSelectSession }: ApplicantListProps) {
  const { showToast } = useToast();
  const [sessions, setSessions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // New Candidate Modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState('초급');
  const [saving, setSaving] = useState(false);

  // Scenario (Persona) picker
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [scenarioId, setScenarioId] = useState('');

  useEffect(() => {
    fetchSessions();
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    try {
      const res = await fetch('/api/personas/active', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setScenarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch scenarios', err);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/call-session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch sessions', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, email, phone, level }),
      });
      if (res.ok) {
        const candData = await res.json();
        
        await fetch('/api/call-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ candidateId: candData.id, personaId: scenarioId ? Number(scenarioId) : undefined }),
        });

        setShowModal(false);
        setName('');
        setEmail('');
        setPhone('');
        showToast('지원자가 등록되고 고유 매직링크가 생성되었습니다.', 'success', '등록 완료');
        fetchSessions();
      } else {
        showToast(t('creating', language), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('에러가 발생했습니다.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyMagicLink = (candidate: any) => {
    const magicToken = candidate?.magicToken;
    if (!magicToken) {
      showToast(language === 'en' ? 'No magic token exists.' : '고유 토큰이 존재하지 않습니다.', 'error');
      return;
    }
    const link = `${window.location.origin}/?token=${magicToken}`;
    navigator.clipboard.writeText(link);
    showToast(
      language === 'en' ? `Magic link copied to clipboard!\n${link}` : `매직링크가 클립보드에 복사되었습니다!\n${link}`,
      'success',
      language === 'en' ? 'Link Copied' : '링크 복사'
    );
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm(t('confirm_delete', language))) return;
    try {
      await fetch(`/api/call-session/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      showToast('삭제되었습니다.', 'info');
      fetchSessions();
    } catch (err) {
      console.error(err);
      showToast('삭제하지 못했습니다.', 'error');
    }
  };

  const filtered = sessions.filter(s => {
    const term = search.toLowerCase();
    return (
      (s.candidate?.name || '').toLowerCase().includes(term) ||
      (s.candidate?.email || '').toLowerCase().includes(term)
    );
  });

  return (
    <div>
      {/* Header section */}
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>{t('applicant_management', language)}</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>{t('applicant_desc', language)}</p>
      </div>

      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        {/* Top actions bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>{t('applicant_list', language)}</h3>
          <button 
            onClick={() => setShowModal(true)}
            style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            {t('create_applicant', language)}
          </button>
        </div>

        {/* Search Input */}
        <div style={{ marginBottom: '20px' }}>
          <input
            type="text"
            placeholder={t('search_placeholder', language)}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '300px', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: '#0f172a', background: '#ffffff' }}
          />
        </div>

        {/* Applicants Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                <th style={{ padding: '12px 14px' }}>{t('col_name', language)}</th>
                <th style={{ padding: '12px 14px' }}>{t('col_email', language)}</th>
                <th style={{ padding: '12px 14px' }}>{t('col_tier', language)}</th>
                <th style={{ padding: '12px 14px' }}>{t('col_status', language)}</th>
                <th style={{ padding: '12px 14px' }}>{language === 'en' ? 'Test Link' : '테스트 링크'}</th>
                <th style={{ padding: '12px 14px' }}>{t('col_date', language)}</th>
                <th style={{ padding: '12px 14px' }}>{t('col_report', language)}</th>
                <th style={{ padding: '12px 14px' }}>{t('col_actions', language)}</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>...</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>-</td>
                </tr>
              )}
              {!loading && filtered.map((s) => {
                const dateStr = s.createdAt ? new Date(s.createdAt).toLocaleString() : '-';
                const statusStr = s.evaluation ? t('status_completed', language) : t('status_expired', language);
                const levelVal = s.candidate?.level || t('tier_unassigned', language);

                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>{s.candidate?.name || 'Candidate'}</td>
                    <td style={{ padding: '12px 14px', color: '#475569' }}>{s.candidate?.email || 'applicant@email.com'}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0284c7' }}>{levelVal}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '3px 8px', 
                        borderRadius: '12px', 
                        background: s.evaluation ? '#dcfce7' : '#f1f5f9',
                        color: s.evaluation ? '#15803d' : '#64748b',
                        fontWeight: 600
                      }}>
                        {statusStr}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => handleCopyMagicLink(s.candidate)}
                        style={{ padding: '4px 10px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                        title="Copy Candidate Unique Test Magic Link"
                      >
                        🔗 {language === 'en' ? 'Magic Link' : '매직링크 복사'}
                      </button>
                    </td>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8rem' }}>{dateStr}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {s.evaluation ? (
                        <button
                          onClick={() => onSelectSession(s)}
                          style={{ padding: '4px 10px', background: '#1e3a8a', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          {t('view', language)}
                        </button>
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => handleDeleteSession(s.id)}
                        style={{ padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {t('delete', language)}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Creating Candidate & Generating Magic Link */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#ffffff', color: '#0f172a', padding: '24px', borderRadius: '12px', width: '420px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.2rem', color: '#0f172a', fontWeight: 800 }}>{t('modal_create_applicant', language)}</h3>
            <form onSubmit={handleCreateCandidate}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{t('input_name', language)}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{t('input_email', language)}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{t('input_phone', language)}</label>
                <input
                  type="text"
                  placeholder="010-0000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', background: '#ffffff', fontSize: '0.85rem' }}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{language === 'en' ? 'Assigned Difficulty Level' : '지정 난이도 (Difficulty Level)'}</label>
                <select
                  value={level}
                  onChange={(e) => setLevel(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', background: '#ffffff', fontSize: '0.85rem' }}
                >
                  <option value="초급">{language === 'en' ? 'Beginner' : '초급 (Beginner)'}</option>
                  <option value="중급">{language === 'en' ? 'Intermediate' : '중급 (Intermediate)'}</option>
                  <option value="고급">{language === 'en' ? 'Advanced' : '고급 (Advanced)'}</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{t('scenario_management', language)}</label>
                <select
                  value={scenarioId}
                  onChange={(e) => setScenarioId(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', background: '#ffffff', fontSize: '0.85rem' }}
                >
                  <option value="">{language === 'en' ? 'No scenario (default)' : '시나리오 없음 (기본값)'}</option>
                  {scenarios.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                >
                  {t('cancel', language)}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ padding: '8px 16px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                >
                  {saving ? t('creating', language) : '생성 및 매직링크 발급'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
