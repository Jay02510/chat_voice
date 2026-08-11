import { useState, useEffect } from 'react';
import { t } from '../i18n';

interface CriteriaModalProps {
  tier: any;
  scenarioTypeId?: number | null;
  scenarioTypeLabel?: string;
  token: string;
  language?: string;
  onClose: () => void;
}

type Step = { label: string; score: number };

const defaultSteps = (maxScore: number): Step[] => [
  { label: 'Not met', score: 0 },
  { label: 'Partially met', score: 1 },
  { label: 'Fully met', score: maxScore },
];

function parseSteps(raw: any): Step[] {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(parsed) && parsed.length) {
      return parsed.map((s: any) => ({ label: s.label ?? '', score: Number(s.score) || 0 }));
    }
  } catch {
    // fall through to default
  }
  return defaultSteps(2);
}

// Scoring buckets are hardcoded output fields in evaluation.service.ts
// (basicScore/essentialScore/commScore/coreSkillScore/advancedSkillScore), matched
// against ScoringCriteriaItem.category by substring. Constraining category to this
// list guarantees the matching substring ('기본'/'필수요소'/'소통력'/'핵심'/'고난도')
// is always present — free text here previously let a typo or new category silently
// fall through to the wrong default score ceiling.
const CATEGORY_OPTIONS = ['기본점수', '필수요소 [Essential]', '소통력', '핵심 스킬', '고난도 스킬 [Advanced]'];

function StepsEditor({ steps, setSteps, language }: { steps: Step[]; setSteps: (s: Step[]) => void; language: string }) {
  const updateStep = (idx: number, field: 'label' | 'score', value: string) => {
    const next = steps.map((s, i) => i === idx ? { ...s, [field]: field === 'score' ? Number(value) : value } : s);
    setSteps(next);
  };
  const removeStep = (idx: number) => setSteps(steps.filter((_, i) => i !== idx));
  const addStep = () => setSteps([...steps, { label: '', score: 0 }]);

  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
        {t('scoring_steps', language)}
      </label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {steps.map((step, idx) => (
          <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder={t('step_label_placeholder', language)}
              value={step.label}
              onChange={(e) => updateStep(idx, 'label', e.target.value)}
              style={{ flex: 1, padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }}
            />
            <input
              type="number"
              placeholder={t('step_score_placeholder', language)}
              value={step.score}
              onChange={(e) => updateStep(idx, 'score', e.target.value)}
              style={{ width: '80px', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }}
            />
            <button
              type="button"
              onClick={() => removeStep(idx)}
              disabled={steps.length <= 1}
              style={{ padding: '6px 10px', background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: '4px', cursor: steps.length <= 1 ? 'not-allowed' : 'pointer', opacity: steps.length <= 1 ? 0.5 : 1, fontSize: '0.8rem' }}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addStep}
        style={{ marginTop: '6px', padding: '4px 10px', background: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
      >
        {t('add_step', language)}
      </button>
    </div>
  );
}

export default function CriteriaModal({ tier, scenarioTypeId, scenarioTypeLabel, token, language = 'ko', onClose }: CriteriaModalProps) {
  const [criteria, setCriteria] = useState<any[]>(scenarioTypeId ? [] : (tier.criteria || []));
  const [showAddForm, setShowAddForm] = useState(false);

  // When a scenario type is selected in TierManager, load that (scenarioType × tier)
  // rubric instead of the tier's legacy generic criteria passed in via props.
  useEffect(() => {
    if (!scenarioTypeId) return;
    fetch(`/api/scenario-types/${scenarioTypeId}/criteria?tierId=${tier.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setCriteria(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Failed to fetch scenario rubric', err));
  }, [scenarioTypeId, tier.id]);

  // New Item Form State
  const [category, setCategory] = useState('');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(1);
  const [maxScore, setMaxScore] = useState(2);
  const [steps, setSteps] = useState<Step[]>(defaultSteps(2));
  const [saving, setSaving] = useState(false);

  // Edit Item Form State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWeight, setEditWeight] = useState(1);
  const [editMaxScore, setEditMaxScore] = useState(2);
  const [editSteps, setEditSteps] = useState<Step[]>(defaultSteps(2));

  const handleAddCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Keep the top ("fully met") step in sync with Max Score so the saved
      // scoreSteps JSON and maxScore never disagree in the grading prompt.
      const syncedSteps = steps.length
        ? steps.map((s, i) => i === steps.length - 1 ? { ...s, score: Number(maxScore) } : s)
        : steps;
      const res = await fetch(`/api/tiers/${tier.id}/criteria`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          scenarioTypeId: scenarioTypeId ?? null,
          category,
          code,
          title,
          description,
          weight: Number(weight),
          maxScore: Number(maxScore),
          scoreSteps: syncedSteps,
        }),
      });

      if (res.ok) {
        const newItem = await res.json();
        setCriteria([...criteria, newItem]);
        setShowAddForm(false);
        setCategory('');
        setCode('');
        setTitle('');
        setDescription('');
        setWeight(1);
        setMaxScore(2);
        setSteps(defaultSteps(2));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    setEditCategory(item.category);
    setEditCode(item.code);
    setEditTitle(item.title);
    setEditDescription(item.description);
    setEditWeight(item.weight);
    setEditMaxScore(item.maxScore);
    setEditSteps(parseSteps(item.scoreSteps));
  };

  const handleUpdateCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSaving(true);
    try {
      // Keep the top ("fully met") step in sync with Max Score so the saved
      // scoreSteps JSON and maxScore never disagree in the grading prompt.
      const syncedSteps = editSteps.length
        ? editSteps.map((s, i) => i === editSteps.length - 1 ? { ...s, score: Number(editMaxScore) } : s)
        : editSteps;
      const res = await fetch(`/api/tiers/criteria/${editingItem.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category: editCategory,
          code: editCode,
          title: editTitle,
          description: editDescription,
          weight: Number(editWeight),
          maxScore: Number(editMaxScore),
          scoreSteps: syncedSteps,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setCriteria(criteria.map(c => c.id === editingItem.id ? updated : c));
        setEditingItem(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('confirm_delete', language))) return;
    try {
      await fetch(`/api/tiers/criteria/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setCriteria(criteria.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const categories = Array.from(new Set(criteria.map(c => c.category)));

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div style={{ background: '#fff', padding: '28px', borderRadius: '12px', width: '680px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>{t('criteria_title', language)}</h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              {scenarioTypeLabel ? `"${scenarioTypeLabel}" · ` : ''}"{tier.label}" {t('criteria_subdesc', language)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => { setShowAddForm(!showAddForm); setEditingItem(null); }}
              style={{ padding: '6px 14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
            >
              {t('add_criteria', language)}
            </button>
            <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: '1.4rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
          </div>
        </div>

        {/* Edit Criteria Form */}
        {editingItem && (
          <form onSubmit={handleUpdateCriteria} style={{ background: '#f0fdf4', padding: '16px', borderRadius: '8px', border: '1px solid #86efac', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#166534', fontWeight: 700 }}>✏️ Edit Criteria Item ({editingItem.code})</h4>
              <button type="button" onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>&times;</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>{t('category_label', language)}</label>
                <select
                  required
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }}
                >
                  <option value="" disabled>{t('category_placeholder', language)}</option>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Code</label>
                <input type="text" required value={editCode} onChange={(e) => setEditCode(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Weight / Max Score</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="number" placeholder="Weight" value={editWeight} onChange={(e) => setEditWeight(Number(e.target.value))} style={{ width: '50%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }} />
                  <input type="number" placeholder="Max" value={editMaxScore} onChange={(e) => setEditMaxScore(Number(e.target.value))} style={{ width: '50%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Title</label>
              <input type="text" required value={editTitle} onChange={(e) => setEditTitle(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Description</label>
              <textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} style={{ width: '100%', height: '60px', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }} />
            </div>

            <StepsEditor steps={editSteps} setSteps={setEditSteps} language={language} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              <button type="button" onClick={() => setEditingItem(null)} style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}>{t('cancel', language)}</button>
              <button type="submit" disabled={saving} style={{ padding: '6px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
                {saving ? 'Saving...' : t('save', language)}
              </button>
            </div>
          </form>
        )}

        {/* Add Form Collapse */}
        {showAddForm && (
          <form onSubmit={handleAddCriteria} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1', marginBottom: '20px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#0f172a' }}>{t('add_criteria', language)}</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>{t('category_label', language)}</label>
                <select
                  required
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }}
                >
                  <option value="" disabled>{t('category_placeholder', language)}</option>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Code (e.g. BS003)</label>
                <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Weight / Max Score</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <input type="number" placeholder="Weight" value={weight} onChange={(e) => setWeight(Number(e.target.value))} style={{ width: '50%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }} />
                  <input type="number" placeholder="Max" value={maxScore} onChange={(e) => setMaxScore(Number(e.target.value))} style={{ width: '50%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }} />
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Title</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }} />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', height: '60px', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }} />
            </div>

            <StepsEditor steps={steps} setSteps={setSteps} language={language} />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}>{t('cancel', language)}</button>
              <button type="submit" disabled={saving} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>{t('save', language)}</button>
            </div>
          </form>
        )}

        {/* Categories Breakdown */}
        {categories.map((cat) => {
          const items = criteria.filter(c => c.category === cat);

          return (
            <div key={cat} style={{ marginBottom: '20px' }}>
              <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: '6px', color: '#1e40af', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>
                {cat} ({items.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map((item) => {
                  const stepsForItem = parseSteps(item.scoreSteps);

                  return (
                    <div key={item.id} style={{ background: '#ffffff', padding: '16px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <div>
                          <span style={{ padding: '2px 6px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700, borderRadius: '4px', fontSize: '0.75rem', marginRight: '6px' }}>
                            {item.code}
                          </span>
                          <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{item.title}</strong>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          <span>{stepsForItem.length} {t('steps_count', language)}</span> &middot; <span>{t('max_score_text', language)} <strong>{item.maxScore}</strong></span> &middot; <span style={{ color: '#2563eb', fontWeight: 700 }}>{t('weight_text', language)} x{item.weight}</span>
                        </div>
                      </div>

                      <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#475569' }}>{item.description}</p>

                      {/* Step choices */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '10px' }}>
                        {stepsForItem.map((st, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#334155' }}>
                            <span>{st.label}</span>
                            <span style={{ fontWeight: 600, color: '#64748b' }}>{st.score}pt</span>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button onClick={() => startEdit(item)} style={{ padding: '4px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>{t('edit', language)}</button>
                        <button onClick={() => handleDelete(item.id)} style={{ padding: '4px 12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>{t('delete', language)}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', background: '#334155', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>{t('close', language)}</button>
        </div>
      </div>
    </div>
  );
}
