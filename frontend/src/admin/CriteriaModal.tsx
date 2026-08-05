import { useState } from 'react';
import { t } from '../i18n';

interface CriteriaModalProps {
  tier: any;
  token: string;
  language?: string;
  onClose: () => void;
}

export default function CriteriaModal({ tier, token, language = 'ko', onClose }: CriteriaModalProps) {
  const [criteria, setCriteria] = useState<any[]>(tier.criteria || []);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Item Form State
  const [category, setCategory] = useState('필수요소 [Essential]');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState(1);
  const [maxScore, setMaxScore] = useState(2);
  const [saving, setSaving] = useState(false);

  // Edit Item Form State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editCategory, setEditCategory] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWeight, setEditWeight] = useState(1);
  const [editMaxScore, setEditMaxScore] = useState(2);

  const handleAddCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const scoreSteps = [
        { step: 0, label: 'Not met', score: 0 },
        { step: 1, label: 'Partially met', score: 1 },
        { step: 2, label: 'Fully met', score: maxScore },
      ];

      const res = await fetch(`/api/tiers/${tier.id}/criteria`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          category,
          code,
          title,
          description,
          weight: Number(weight),
          maxScore: Number(maxScore),
          scoreSteps,
        }),
      });

      if (res.ok) {
        const newItem = await res.json();
        setCriteria([...criteria, newItem]);
        setShowAddForm(false);
        setCode('');
        setTitle('');
        setDescription('');
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
  };

  const handleUpdateCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setSaving(true);
    try {
      let existingSteps: any[] = [];
      try {
        existingSteps = typeof editingItem.scoreSteps === 'string'
          ? JSON.parse(editingItem.scoreSteps)
          : editingItem.scoreSteps || [];
      } catch (e) {
        existingSteps = [];
      }

      if (existingSteps.length === 0) {
        existingSteps = [
          { step: 0, label: 'Not met', score: 0 },
          { step: 1, label: 'Partially met', score: 1 },
          { step: 2, label: 'Fully met', score: editMaxScore },
        ];
      } else {
        existingSteps[existingSteps.length - 1].score = editMaxScore;
      }

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
          scoreSteps: existingSteps,
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
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>"{tier.label}" {t('criteria_subdesc', language)}</span>
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Category</label>
                <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }}>
                  <option value="기본점수">{t('cat_basic', language)}</option>
                  <option value="필수요소 [Essential]">{t('cat_essential', language)}</option>
                  <option value="소통력">{t('cat_comm', language)}</option>
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
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#334155' }}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', background: '#fff', color: '#0f172a' }}>
                  <option value="기본점수">{t('cat_basic', language)}</option>
                  <option value="필수요소 [Essential]">{t('cat_essential', language)}</option>
                  <option value="소통력">{t('cat_comm', language)}</option>
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

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              <button type="button" onClick={() => setShowAddForm(false)} style={{ padding: '6px 12px', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer', color: '#475569' }}>{t('cancel', language)}</button>
              <button type="submit" disabled={saving} style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>{t('save', language)}</button>
            </div>
          </form>
        )}

        {/* Categories Breakdown */}
        {categories.map((cat) => {
          const items = criteria.filter(c => c.category === cat);
          const catName = cat === '기본점수' ? t('cat_basic', language) : cat === '필수요소 [Essential]' ? t('cat_essential', language) : cat === '소통력' ? t('cat_comm', language) : cat;

          return (
            <div key={cat} style={{ marginBottom: '20px' }}>
              <div style={{ padding: '8px 12px', background: '#eff6ff', borderRadius: '6px', color: '#1e40af', fontWeight: 700, fontSize: '0.9rem', marginBottom: '12px' }}>
                {catName} ({items.length})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {items.map((item) => {
                  let steps: any[] = [];
                  try {
                    steps = typeof item.scoreSteps === 'string' ? JSON.parse(item.scoreSteps) : item.scoreSteps || [];
                  } catch (e) {
                    steps = [];
                  }

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
                          <span>{steps.length} {t('steps_count', language)}</span> &middot; <span>{t('max_score_text', language)} <strong>{item.maxScore}</strong></span> &middot; <span style={{ color: '#2563eb', fontWeight: 700 }}>{t('weight_text', language)} x{item.weight}</span>
                        </div>
                      </div>

                      <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#475569' }}>{item.description}</p>

                      {/* Step choices */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '10px' }}>
                        {steps.map((st: any, idx: number) => (
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
