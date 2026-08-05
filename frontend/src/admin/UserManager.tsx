import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

interface UserManagerProps {
  token: string;
  currentUserRole: string;
  language?: string;
}

type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER';

interface AppUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

const ROLE_LABELS: Record<UserRole, { labelKo: string; labelEn: string; color: string; bg: string }> = {
  SUPER_ADMIN: { labelKo: '슈퍼 관리자', labelEn: 'Super Admin', color: '#fff', bg: '#7c3aed' },
  ADMIN: { labelKo: '관리자', labelEn: 'Admin', color: '#fff', bg: '#2563eb' },
  MANAGER: { labelKo: '매니저', labelEn: 'Manager', color: '#0f172a', bg: '#e2e8f0' },
};

export default function UserManager({ token, currentUserRole, language = 'ko' }: UserManagerProps) {
  const { showToast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('MANAGER');
  const [saving, setSaving] = useState(false);

  const canCreateAdmin = currentUserRole === 'SUPER_ADMIN';
  const canChangeRole = currentUserRole === 'SUPER_ADMIN';

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: newEmail, password: newPassword, name: newName, role: newRole }),
      });
      if (res.ok) {
        showToast(
          language === 'en' ? `User '${newName || newEmail}' was created.` : `사용자 '${newName || newEmail}'이 생성되었습니다.`,
          'success',
          language === 'en' ? 'User Created' : '사용자 생성 완료'
        );
        setShowModal(false);
        setNewEmail(''); setNewPassword(''); setNewName(''); setNewRole('MANAGER');
        fetchUsers();
      } else {
        const err = await res.json();
        showToast(err.message || (language === 'en' ? 'Failed to create user' : '사용자 생성 실패'), 'error');
      }
    } catch {
      showToast(language === 'en' ? 'Error while creating user' : '사용자 생성 중 오류', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRole = async (userId: number, role: UserRole) => {
    try {
      const res = await fetch(`/api/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        showToast(language === 'en' ? 'Role updated.' : '역할이 변경되었습니다.', 'success');
        fetchUsers();
      } else {
        showToast(language === 'en' ? 'Failed to update role' : '역할 변경 실패', 'error');
      }
    } catch {
      showToast(language === 'en' ? 'An error occurred.' : '오류가 발생했습니다.', 'error');
    }
  };

  const handleDeleteUser = async (userId: number, email: string) => {
    if (!confirm(language === 'en' ? `Delete the account ${email}?` : `${email} 계정을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        showToast(language === 'en' ? 'User deleted.' : '사용자가 삭제되었습니다.', 'info');
        fetchUsers();
      } else {
        showToast(language === 'en' ? 'Failed to delete' : '삭제 실패', 'error');
      }
    } catch {
      showToast(language === 'en' ? 'An error occurred.' : '오류가 발생했습니다.', 'error');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>{language === 'en' ? 'User Access Management' : '사용자 권한 관리'}</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          {language === 'en' ? 'Manage admin and manager accounts. Access permissions vary by role.' : '관리자 및 매니저 계정을 관리합니다. 역할에 따라 접근 권한이 다릅니다.'}
        </p>
      </div>

      {/* Roles legend */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(Object.entries(ROLE_LABELS) as [UserRole, typeof ROLE_LABELS[UserRole]][]).map(([role, meta]) => (
          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.78rem' }}>
            <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: meta.bg }} />
            <strong style={{ color: '#0f172a' }}>{role}</strong>
            <span style={{ color: '#64748b' }}>— {language === 'en' ? meta.labelEn : meta.labelKo}</span>
          </div>
        ))}
        <div style={{ fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center', paddingLeft: '4px' }}>
          SUPER_ADMIN &gt; ADMIN &gt; MANAGER
        </div>
      </div>

      <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: '#0f172a', fontWeight: 700 }}>{language === 'en' ? 'User List' : '사용자 목록'}</h3>
          {(currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMIN') && (
            <button onClick={() => setShowModal(true)} style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>
              + {language === 'en' ? 'Add User' : '사용자 추가'}
            </button>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>{language === 'en' ? 'Name' : '이름'}</th>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>{language === 'en' ? 'Email' : '이메일'}</th>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>Role</th>
              <th style={{ padding: '12px 14px', textAlign: 'left' }}>{language === 'en' ? 'Registered' : '등록일'}</th>
              {canChangeRole && <th style={{ padding: '12px 14px', textAlign: 'left' }}>{language === 'en' ? 'Change Role' : '역할 변경'}</th>}
              {currentUserRole === 'SUPER_ADMIN' && <th style={{ padding: '12px 14px', textAlign: 'left' }}>{language === 'en' ? 'Delete' : '삭제'}</th>}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>{language === 'en' ? 'Loading...' : '로딩 중...'}</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>{language === 'en' ? 'No users found' : '사용자가 없습니다'}</td></tr>
            )}
            {!loading && users.map(user => {
              const roleMeta = ROLE_LABELS[user.role] || { label: user.role, color: '#000', bg: '#ccc' };
              return (
                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a' }}>{user.name}</td>
                  <td style={{ padding: '12px 14px', color: '#475569' }}>{user.email}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, background: roleMeta.bg, color: roleMeta.color }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8rem' }}>
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  {canChangeRole && (
                    <td style={{ padding: '12px 14px' }}>
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                        style={{ padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', color: '#0f172a', background: '#fff' }}
                      >
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MANAGER">MANAGER</option>
                      </select>
                    </td>
                  )}
                  {currentUserRole === 'SUPER_ADMIN' && (
                    <td style={{ padding: '12px 14px' }}>
                      <button
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        style={{ padding: '4px 10px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {language === 'en' ? 'Delete' : '삭제'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '28px', borderRadius: '14px', width: '420px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '1.1rem', color: '#0f172a', fontWeight: 800 }}>{language === 'en' ? 'Add New User' : '새 사용자 추가'}</h3>
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{language === 'en' ? 'Name' : '이름'}</label>
                <input type="text" value={newName} onChange={e => setNewName(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', background: '#fff', fontSize: '0.85rem' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{language === 'en' ? 'Email *' : '이메일 *'}</label>
                <input type="email" required value={newEmail} onChange={e => setNewEmail(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', background: '#fff', fontSize: '0.85rem' }} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>{language === 'en' ? 'Temporary Password *' : '임시 비밀번호 *'}</label>
                <input type="password" required value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', background: '#fff', fontSize: '0.85rem' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Role</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value as UserRole)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#0f172a', background: '#fff', fontSize: '0.85rem' }}>
                  {canCreateAdmin && <option value="ADMIN">{language === 'en' ? 'ADMIN — Admin' : 'ADMIN — 관리자'}</option>}
                  <option value="MANAGER">{language === 'en' ? 'MANAGER — Manager' : 'MANAGER — 매니저'}</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowModal(false)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#475569', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>{language === 'en' ? 'Cancel' : '취소'}</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
                  {saving ? (language === 'en' ? 'Creating...' : '생성 중...') : (language === 'en' ? 'Create User' : '사용자 생성')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
