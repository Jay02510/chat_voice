import { useState, useEffect, useRef } from 'react';
import { t } from '../i18n';

interface ScenarioManagerProps {
  token: string;
  language?: string;
}

// Mirrors the backend's defensive parsing (chat.service.ts) so non-JSON
// objectionProfile values (older seed data, manual DB edits) don't crash the modal.
function parseObjectionProfile(raw: string | null | undefined): string {
  if (!raw) return '';
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.join('\n') : String(parsed);
  } catch {
    return raw;
  }
}

const MODES = ['OUTBOUND_SALES', 'INBOUND_SALES', 'INTERVIEW'];
const VOICES = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'sage', 'shimmer', 'verse', 'marin', 'cedar'];

const emptyForm = {
  name: '',
  prompt: '',
  mode: 'OUTBOUND_SALES',
  voice: '',
  tierId: '',
  scenarioTypeId: '',
  industry: '',
  productContext: '',
  objectionProfile: '',
  openingLine: '',
  isActive: true,
};

export default function ScenarioManager({ token, language = 'ko' }: ScenarioManagerProps) {
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [tiers, setTiers] = useState<any[]>([]);
  const [scenarioTypes, setScenarioTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState<any>(null); // null = closed, 'new' = create mode, object = edit mode
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    fetchScenarios();
    fetchTiers();
    fetchScenarioTypes();
  }, []);

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/personas', { headers: authHeaders });
      const data = await res.json();
      setScenarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch scenarios', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTiers = async () => {
    try {
      const res = await fetch('/api/tiers', { headers: authHeaders });
      const data = await res.json();
      setTiers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch tiers', err);
    }
  };

  const fetchScenarioTypes = async () => {
    try {
      const res = await fetch('/api/scenario-types', { headers: authHeaders });
      const data = await res.json();
      setScenarioTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch scenario types', err);
    }
  };

  const previewVoice = async (voice: string) => {
    if (previewingVoice) return;
    setPreviewingVoice(voice);
    try {
      const res = await fetch(`/api/realtime/voice-preview?voice=${encodeURIComponent(voice)}`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error('Preview request failed');
      const { audioBase64, contentType } = await res.json();
      const audio = new Audio(`data:${contentType};base64,${audioBase64}`);
      previewAudioRef.current = audio;
      audio.onended = () => setPreviewingVoice(null);
      audio.onerror = () => setPreviewingVoice(null);
      await audio.play();
    } catch (err) {
      console.error('Voice preview failed', err);
      setPreviewingVoice(null);
    }
  };

  const openCreateModal = () => {
    setForm(emptyForm);
    setEditing('new');
  };

  const openEditModal = (scenario: any) => {
    setForm({
      name: scenario.name || '',
      prompt: scenario.prompt || '',
      mode: scenario.mode || 'OUTBOUND_SALES',
      voice: scenario.voice || '',
      tierId: scenario.tierId ? String(scenario.tierId) : '',
      scenarioTypeId: scenario.scenarioTypeId ? String(scenario.scenarioTypeId) : '',
      industry: scenario.industry || '',
      productContext: scenario.productContext || '',
      objectionProfile: parseObjectionProfile(scenario.objectionProfile),
      openingLine: scenario.openingLine || '',
      isActive: scenario.isActive,
    });
    setEditing(scenario);
  };

  const closeModal = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        prompt: form.prompt,
        mode: form.mode,
        voice: form.voice || null,
        tierId: form.tierId ? Number(form.tierId) : null,
        scenarioTypeId: form.scenarioTypeId ? Number(form.scenarioTypeId) : null,
        industry: form.industry || null,
        productContext: form.productContext || null,
        objectionProfile: JSON.stringify(
          form.objectionProfile.split('\n').map((s) => s.trim()).filter(Boolean),
        ),
        openingLine: form.openingLine || null,
        isActive: form.isActive,
      };

      const isNew = editing === 'new';
      const res = await fetch(isNew ? '/api/personas' : `/api/personas/${editing.id}`, {
        method: isNew ? 'POST' : 'PUT',
        headers: authHeaders,
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        closeModal();
        fetchScenarios();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (scenario: any) => {
    await fetch(`/api/personas/${scenario.id}/activate`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ isActive: !scenario.isActive }),
    });
    fetchScenarios();
  };

  const remove = async (scenario: any) => {
    if (!window.confirm(t('confirm_delete', language))) return;
    await fetch(`/api/personas/${scenario.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    fetchScenarios();
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>{t('scenario_management', language)}</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>{t('scenario_desc', language)}</p>
      </div>

      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>{t('scenario_list', language)}</h3>
          </div>
          <button
            onClick={openCreateModal}
            style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}
          >
            {t('add_scenario', language)}
          </button>
        </div>

        {loading && <p style={{ color: '#64748b', textAlign: 'center' }}>...</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {scenarios.map((s) => (
            <div key={s.id} style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{s.name} </span>
                  <span
                    style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                      background: '#e0e7ff', color: '#4338ca', marginLeft: '8px',
                    }}
                  >
                    {s.mode || 'OUTBOUND_SALES'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                      background: s.isActive ? '#dcfce7' : '#f1f5f9',
                      color: s.isActive ? '#16a34a' : '#94a3b8',
                      marginLeft: '6px',
                    }}
                  >
                    {s.isActive ? t('scenario_active', language) : t('scenario_inactive', language)}
                  </span>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>
                    {s.industry ? `${s.industry} · ` : ''}
                    {s.scenarioType ? `${s.scenarioType.label} · ` : `${t('no_scenario_type_linked', language)} · `}
                    {s.tier ? s.tier.label : t('no_tier_linked', language)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => toggleActive(s)}
                    style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '0.8rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {s.isActive ? t('scenario_inactive', language) : t('scenario_active', language)}
                  </button>
                  <button
                    onClick={() => openEditModal(s)}
                    style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '0.8rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {t('edit', language)}
                  </button>
                  <button
                    onClick={() => remove(s)}
                    style={{ padding: '6px 12px', background: '#ef4444', border: 'none', borderRadius: '6px', fontSize: '0.8rem', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {t('delete', language)}
                  </button>
                </div>
              </div>
              <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-line' }}>{s.prompt}</p>
              {s.productContext && (
                <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#64748b' }}>
                  {s.productContext}
                </div>
              )}
            </div>
          ))}
          {!loading && scenarios.length === 0 && (
            <p style={{ color: '#94a3b8', textAlign: 'center', padding: '24px 0' }}>—</p>
          )}
        </div>
      </div>

      {editing && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', color: '#0f172a', padding: '28px', borderRadius: '12px', width: '600px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>{editing === 'new' ? t('add_scenario', language) : `"${editing.name}" ${t('edit', language)}`}</h3>
              <button onClick={closeModal} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={save}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('scenario_name', language)}</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('scenario_tier', language)}</label>
                  <select value={form.tierId} onChange={(e) => setForm({ ...form, tierId: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <option value="">{t('no_tier_linked', language)}</option>
                    {tiers.map((tr) => (
                      <option key={tr.id} value={tr.id}>{tr.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('scenario_type', language)}</label>
                  <select
                    value={form.scenarioTypeId}
                    onChange={(e) => {
                      const scenarioTypeId = e.target.value;
                      const matched = scenarioTypes.find((st) => String(st.id) === scenarioTypeId);
                      setForm({
                        ...form,
                        scenarioTypeId,
                        mode: matched ? matched.workType : form.mode,
                      });
                    }}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <option value="">{t('no_scenario_type_linked', language)}</option>
                    {scenarioTypes.map((st) => (
                      <option key={st.id} value={st.id}>{st.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('scenario_mode', language)}</label>
                  <select value={form.mode} disabled={!!form.scenarioTypeId} onChange={(e) => setForm({ ...form, mode: e.target.value })}
                    style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', background: form.scenarioTypeId ? '#f1f5f9' : '#fff' }}>
                    {MODES.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('scenario_voice', language)}</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })}
                    style={{ flex: 1, padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}>
                    <option value="">{t('scenario_voice_default', language)}</option>
                    {VOICES.map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => previewVoice(form.voice || 'marin')}
                    disabled={previewingVoice !== null}
                    style={{ padding: '8px 14px', background: '#e0e7ff', color: '#4338ca', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: previewingVoice ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {previewingVoice === (form.voice || 'marin') ? `▶ ${t('scenario_voice_playing', language)}` : `▶ ${t('scenario_voice_preview', language)}`}
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('scenario_industry', language)}</label>
                <input type="text" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('scenario_persona_prompt', language)}</label>
                <textarea value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} required
                  style={{ width: '100%', height: '100px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('scenario_product_context', language)}</label>
                <textarea value={form.productContext} onChange={(e) => setForm({ ...form, productContext: e.target.value })}
                  style={{ width: '100%', height: '80px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('scenario_objections', language)}</label>
                <textarea value={form.objectionProfile} onChange={(e) => setForm({ ...form, objectionProfile: e.target.value })}
                  style={{ width: '100%', height: '80px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('scenario_opening_line', language)}</label>
                <input type="text" value={form.openingLine} onChange={(e) => setForm({ ...form, openingLine: e.target.value })}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                {t('scenario_active', language)}
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={closeModal} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>{t('cancel', language)}</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  {saving ? t('saving', language) : t('save', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
