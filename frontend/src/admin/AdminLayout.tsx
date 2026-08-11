import { useState } from 'react';
import ApplicantList from './ApplicantList';
import TierManager from './TierManager';
import ScenarioManager from './ScenarioManager';
import SettingsView from './SettingsView';
import UserManager from './UserManager';
import VodabiReport from '../report/VodabiReport';
import { t } from '../i18n';

interface AdminLayoutProps {
  token: string;
  language?: string;
  userRole?: string;
  userName?: string;
  onLogout: () => void;
  onSessionStart: (id: number) => void;
}

const NAV_ITEMS = [
  { key: 'applicants', icon: '👥', labelKo: '지원자 관리', labelEn: 'Applicants', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
  { key: 'scenarios', icon: '🗂️', labelKo: '시나리오', labelEn: 'Scenarios', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { key: 'tiers', icon: '🎯', labelKo: '난이도 & 채점', labelEn: 'Tiers & Scoring', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { key: 'users', icon: '🔐', labelKo: '사용자 권한', labelEn: 'User Access', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { key: 'usage', icon: '📊', labelKo: '사용 현황', labelEn: 'Usage', roles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER'] },
  { key: 'settings', icon: '⚙️', labelKo: '시스템 설정', labelEn: 'Settings', roles: ['SUPER_ADMIN', 'ADMIN'] },
];

export default function AdminLayout({ token, language = 'ko', userRole = 'MANAGER', userName, onLogout, onSessionStart }: AdminLayoutProps) {
  const [activeNav, setActiveNav] = useState<string>('applicants');
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  const visibleNav = NAV_ITEMS.filter(item => item.roles.includes(userRole));

  const getRoleBadge = (role: string) => {
    const badges: Record<string, { label: string; bg: string; color: string }> = {
      SUPER_ADMIN: { label: 'SUPER ADMIN', bg: '#7c3aed', color: '#fff' },
      ADMIN: { label: 'ADMIN', bg: '#2563eb', color: '#fff' },
      MANAGER: { label: 'MANAGER', bg: '#334155', color: '#94a3b8' },
    };
    return badges[role] || badges['MANAGER'];
  };

  const badge = getRoleBadge(userRole);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Pretendard, -apple-system, sans-serif', background: '#f1f5f9' }}>
      
      {/* Dark Sidebar */}
      <div style={{ width: '230px', background: '#1e293b', color: '#f8fafc', padding: '24px 16px', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ marginBottom: '28px', paddingLeft: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>VODABI</h2>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{language === 'en' ? 'Interview Backoffice' : '인터뷰 백오피스'}</span>
        </div>

        {/* Logged-in user info */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px', marginBottom: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>{userName || (language === 'en' ? 'User' : '사용자')}</div>
          <div style={{ marginTop: '4px' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '10px', background: badge.bg, color: badge.color }}>
              {badge.label}
            </span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          {visibleNav.map(item => {
            const isActive = activeNav === item.key;
            const label = language === 'en' ? item.labelEn : item.labelKo;
            return (
              <button
                key={item.key}
                onClick={() => { setActiveNav(item.key); setSelectedSession(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '11px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  background: isActive ? '#334155' : 'transparent',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                {label}
              </button>
            );
          })}
        </nav>

        <div style={{ paddingTop: '16px', borderTop: '1px solid #334155' }}>
          <button
            onClick={onLogout}
            style={{
              width: '100%', padding: '10px', background: 'rgba(239, 68, 68, 0.12)',
              color: '#f87171', border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
            }}
          >
            {t('logout', language)}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
        {selectedSession ? (
          <VodabiReport session={selectedSession} language={language} onBack={() => setSelectedSession(null)} token={token} />
        ) : (
          <>
            {activeNav === 'applicants' && (
              <ApplicantList
                token={token}
                language={language}
                onSelectSession={(sess) => setSelectedSession(sess)}
                onStartSession={onSessionStart}
              />
            )}
            {activeNav === 'scenarios' && (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
              <ScenarioManager token={token} language={language} />
            )}
            {activeNav === 'tiers' && (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
              <TierManager token={token} language={language} />
            )}
            {activeNav === 'users' && (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
              <UserManager token={token} currentUserRole={userRole} language={language} />
            )}
            {activeNav === 'usage' && (
              <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <h2 style={{ margin: '0 0 12px 0', fontSize: '1.3rem', color: '#0f172a' }}>{language === 'en' ? 'Usage Stats' : '사용 현황'}</h2>
                <p style={{ color: '#64748b', fontSize: '0.9rem' }}>{language === 'en' ? 'Total session calls, AI token usage, and call bandwidth overview.' : '총 세션 호출 수, AI 토큰 사용량 및 통화 대역폭 현황입니다.'}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginTop: '20px' }}>
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{language === 'en' ? 'Test Sessions This Month' : '이번 달 테스트 세션'}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>{language === 'en' ? '124 sessions' : '124 건'}</div>
                  </div>
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{language === 'en' ? 'Average Call Duration' : '평균 통화 시간'}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>02:45</div>
                  </div>
                  <div style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{language === 'en' ? 'Report Completion Rate' : '리포트 생성 완료율'}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: '4px' }}>99.2%</div>
                  </div>
                </div>
              </div>
            )}
            {activeNav === 'settings' && (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') && (
              <SettingsView token={token} language={language} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
