import { useState, useEffect } from 'react';
import CriteriaModal from './CriteriaModal';
import { t } from '../i18n';

interface TierManagerProps {
  token: string;
  language?: string;
}

export default function TierManager({ token, language = 'ko' }: TierManagerProps) {
  const [tiers, setTiers] = useState<any[]>([]);
  const [scenarioCounts, setScenarioCounts] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);

  // Edit Tier Modal state
  const [editingTier, setEditingTier] = useState<any>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [fixedBasePrompt, setFixedBasePrompt] = useState('');
  const [instructions, setInstructions] = useState('');
  const [savingTier, setSavingTier] = useState(false);

  // Criteria Modal state
  const [criteriaTier, setCriteriaTier] = useState<any>(null);

  // Rubric scope selector — "" = legacy generic rubric (scenario-agnostic),
  // otherwise a ScenarioType id whose (scenarioType × tier) rubric is edited instead.
  const [scenarioTypes, setScenarioTypes] = useState<any[]>([]);
  const [selectedScenarioTypeId, setSelectedScenarioTypeId] = useState('');

  useEffect(() => {
    fetchTiers();
    fetchScenarioCounts();
    fetchScenarioTypes();
  }, []);

  const fetchScenarioTypes = async () => {
    try {
      const res = await fetch('/api/scenario-types', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setScenarioTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch scenario types', err);
    }
  };

  const fetchTiers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tiers', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setTiers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch tiers', err);
    } finally {
      setLoading(false);
    }
  };

  // How many scenarios currently share each tier's rubric — edits to shared
  // criteria affect every scenario counted here, not just one.
  const fetchScenarioCounts = async () => {
    try {
      const res = await fetch('/api/personas', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const counts: Record<number, number> = {};
      if (Array.isArray(data)) {
        for (const p of data) {
          if (p.tierId) counts[p.tierId] = (counts[p.tierId] || 0) + 1;
        }
      }
      setScenarioCounts(counts);
    } catch (err) {
      console.error('Failed to fetch scenario counts', err);
    }
  };

  const openEditModal = (tier: any) => {
    setEditingTier(tier);
    setLabel(tier.label);
    setDescription(tier.description);
    setFixedBasePrompt(tier.fixedBasePrompt || '');
    setInstructions(tier.additionalInstructions || '');
  };

  const saveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTier(true);
    try {
      const res = await fetch(`/api/tiers/${editingTier.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          label,
          description,
          fixedBasePrompt,
          additionalInstructions: instructions,
        }),
      });
      if (res.ok) {
        setEditingTier(null);
        fetchTiers();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingTier(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#0f172a' }}>{t('tier_management', language)}</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>{t('tier_desc', language)}</p>
      </div>

      <div style={{ background: '#ffffff', padding: '24px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>{t('tier_list', language)}</h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>{t('tier_subdesc', language)}</p>
          </div>
          <button style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>
            {t('add_tier', language)}
          </button>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: '#334155' }}>{t('scenario_type', language)}</label>
          <select
            value={selectedScenarioTypeId}
            onChange={(e) => setSelectedScenarioTypeId(e.target.value)}
            style={{ width: '100%', maxWidth: '360px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }}
          >
            <option value="">{t('no_scenario_type_linked', language)}</option>
            {scenarioTypes.map((st) => (
              <option key={st.id} value={st.id}>{st.label}</option>
            ))}
          </select>
        </div>

        {loading && <p style={{ color: '#64748b', textAlign: 'center' }}>...</p>}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tiers.map((tItem) => (
            <div key={tItem.id} style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{tItem.label} </span>
                  <span style={{ fontSize: '0.85rem', color: '#64748b' }}>({tItem.key})</span>
                  <span
                    style={{
                      marginLeft: '10px', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px',
                      background: scenarioCounts[tItem.id] ? '#fef3c7' : '#f1f5f9',
                      color: scenarioCounts[tItem.id] ? '#b45309' : '#94a3b8',
                    }}
                    title={scenarioCounts[tItem.id] ? t('tier_used_by', language) : t('tier_used_by_none', language)}
                  >
                    {scenarioCounts[tItem.id] ? `${scenarioCounts[tItem.id]} ${t('tier_used_by', language)}` : t('tier_used_by_none', language)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => setCriteriaTier(tItem)}
                    style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '0.8rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {t('criteria', language)}
                  </button>
                  <button
                    onClick={() => openEditModal(tItem)}
                    style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '6px', fontSize: '0.8rem', color: '#334155', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {t('edit', language)}
                  </button>
                  <button
                    style={{ padding: '6px 12px', background: '#ef4444', border: 'none', borderRadius: '6px', fontSize: '0.8rem', color: '#fff', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {t('delete', language)}
                  </button>
                </div>
              </div>
              <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#475569' }}>{tItem.description}</p>
              
              <div style={{ background: '#ffffff', padding: '12px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'pre-line' }}>
                {tItem.additionalInstructions ? tItem.additionalInstructions.substring(0, 150) + '...' : '-'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Tier Modal */}
      {editingTier && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', color: '#0f172a', padding: '28px', borderRadius: '12px', width: '560px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>"{editingTier.label}" {t('edit', language)}</h3>
              <button onClick={() => setEditingTier(null)} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>&times;</button>
            </div>

            <form onSubmit={saveTier}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('tier_key', language)}</label>
                  <input type="text" disabled value={editingTier.key} style={{ width: '100%', padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('tier_label', language)}</label>
                  <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('tier_description', language)}</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem' }} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px', color: '#0f172a' }}>{t('fixed_prompt_label', language)}</label>
                <textarea
                  value={fixedBasePrompt}
                  onChange={(e) => setFixedBasePrompt(e.target.value)}
                  style={{ width: '100%', height: '140px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Roleplay guardrails and anti-jailbreak system rules. Editable by admin.</span>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '4px' }}>{t('additional_instructions', language)}</label>
                <textarea
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  style={{ width: '100%', height: '160px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" onClick={() => setEditingTier(null)} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>{t('cancel', language)}</button>
                <button type="submit" disabled={savingTier} style={{ padding: '8px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>
                  {savingTier ? t('saving', language) : t('save', language)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Criteria Modal */}
      {criteriaTier && (
        <CriteriaModal
          tier={criteriaTier}
          scenarioTypeId={selectedScenarioTypeId ? Number(selectedScenarioTypeId) : null}
          scenarioTypeLabel={scenarioTypes.find((st) => String(st.id) === selectedScenarioTypeId)?.label}
          token={token}
          language={language}
          onClose={() => {
            setCriteriaTier(null);
            fetchTiers();
          }}
        />
      )}
    </div>
  );
}
