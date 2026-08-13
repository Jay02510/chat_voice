import { useState, useEffect } from 'react';
import { t } from '../i18n';
import { useToast } from '../components/Toast';

interface SettingsViewProps {
  token: string;
  language?: string;
}

export default function SettingsView({ token, language = 'ko' }: SettingsViewProps) {
  const { showToast } = useToast();
  const [productName, setProductName] = useState('');
  const [productPrice, setProductPrice] = useState('');
  const [productPriceUnit, setProductPriceUnit] = useState('');
  const [productBenefits, setProductBenefits] = useState('');
  const [productCondition, setProductCondition] = useState('');
  const [evaluationPrompt, setEvaluationPrompt] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data) {
        setProductName(data.productName || '');
        setProductPrice(data.productPrice || '');
        setProductPriceUnit(data.productPriceUnit || '');
        setProductBenefits(data.productBenefits || '');
        setProductCondition(data.productCondition || '');
        setEvaluationPrompt(data.evaluationPrompt || '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productName,
          productPrice,
          productPriceUnit,
          productBenefits,
          productCondition,
          evaluationPrompt,
        }),
      });

      if (res.ok) {
        showToast(t('settings_saved', language), 'success', 'Saved');
      } else {
        showToast('Error saving settings.', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error saving settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast(language === 'en' ? 'New passwords do not match.' : '새 비밀번호가 일치하지 않습니다.', 'error');
      return;
    }
    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.ok) {
        showToast(language === 'en' ? 'Password updated.' : '비밀번호가 변경되었습니다.', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json().catch(() => ({}));
        showToast(data.message || (language === 'en' ? 'Error updating password.' : '비밀번호 변경 오류.'), 'error');
      }
    } catch (err) {
      console.error(err);
      showToast(language === 'en' ? 'Error updating password.' : '비밀번호 변경 오류.', 'error');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: '#64748b' }}>...</div>;
  }

  return (
    <div style={{ maxWidth: '840px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>{t('settings_title', language)}</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
          {t('settings_desc', language)}
        </p>
      </div>

      <form onSubmit={handleSave}>
        {/* 1. AI 채점 및 평가 엔진 프롬프트 설정 (Configurable Evaluation System Prompt) */}
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>{language === 'en' ? 'AI Evaluation & Scoring Prompt Settings (AI Evaluator Engine)' : 'AI 평가 분석 및 채점 프롬프트 설정 (AI Evaluator Engine)'}</h3>
            <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#1e40af', padding: '3px 8px', borderRadius: '12px', fontWeight: 600 }}>Dynamic Prompt</span>
          </div>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b' }}>
            {language === 'en'
              ? 'Edit and refine the evaluation guidelines the AI scoring engine references when analyzing call transcripts, live.'
              : 'AI 채점 엔진이 통화 녹취록을 분석할 때 참조할 평가 지침과 가이드라인 프롬프트를 실시간으로 편집하고 개선할 수 있습니다.'}
          </p>

          <div style={{ marginBottom: '8px' }}>
            <textarea
              value={evaluationPrompt}
              onChange={(e) => setEvaluationPrompt(e.target.value)}
              rows={6}
              placeholder="You are an expert Outbound Sales Evaluator..."
              style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'monospace', lineHeight: '1.5', background: '#f8fafc' }}
            />
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {language === 'en'
              ? '* Edited prompts take effect dynamically in the next call session evaluation as soon as they are saved.'
              : '* 수정된 프롬프트는 저장 즉시 다음 콜 세션 평가에 동적으로 반영됩니다.'}
          </span>
        </div>

        {/* 2. 상품 시나리오 Section */}
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#0f172a' }}>{t('product_scenario', language)}</h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b' }}>
            {t('product_scenario_sub', language)}
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {t('product_name', language)}
              </label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {t('product_price', language)}
              </label>
              <input
                type="text"
                value={productPrice}
                onChange={(e) => setProductPrice(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              {t('price_unit', language)}
            </label>
            <input
              type="text"
              value={productPriceUnit}
              onChange={(e) => setProductPriceUnit(e.target.value)}
              placeholder="e.g. USD, KRW"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              {t('benefits_list', language)}
            </label>
            <textarea
              value={productBenefits}
              onChange={(e) => setProductBenefits(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {t('benefits_help', language)}
            </span>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              {t('product_condition', language)}
            </label>
            <textarea
              value={productCondition}
              onChange={(e) => setProductCondition(e.target.value)}
              rows={2}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '10px 24px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            }}
          >
            {saving ? t('saving', language) : t('save', language)}
          </button>
        </div>
      </form>

      {/* Change Password Section */}
      <form onSubmit={handleChangePassword}>
        <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.1rem', color: '#0f172a' }}>
            {language === 'en' ? 'Change Password' : '비밀번호 변경'}
          </h3>
          <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#64748b' }}>
            {language === 'en' ? 'Update the password for your own account.' : '본인 계정의 비밀번호를 변경합니다.'}
          </p>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              {language === 'en' ? 'Current Password' : '현재 비밀번호'}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {language === 'en' ? 'New Password' : '새 비밀번호'}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {language === 'en' ? 'Confirm New Password' : '새 비밀번호 확인'}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
              />
            </div>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            {language === 'en' ? '* Minimum 8 characters.' : '* 최소 8자 이상.'}
          </span>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <button
              type="submit"
              disabled={changingPassword}
              style={{
                padding: '10px 24px',
                background: '#0f172a',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            >
              {changingPassword
                ? (language === 'en' ? 'Updating...' : '변경 중...')
                : (language === 'en' ? 'Update Password' : '비밀번호 변경')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
