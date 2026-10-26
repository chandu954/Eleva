'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Trash2, X, Plus } from 'lucide-react';
import {
  saveSkills, saveEducation, saveCertifications, saveAchievements,
  saveLanguages, savePreferences,
} from '../../_lib/actions-career';
import type {
  SkillCategory, EducationRow, CertificationRow,
  AchievementRow, LanguageRow,
} from '../../_lib/actions-career';
import type { Profile } from './career-types';
import { Field, SaveButton } from './career-ui';

const DEFAULT_CATEGORIES = ['Languages', 'Frameworks', 'Cloud & Infrastructure', 'Databases', 'AI & ML', 'DevOps & Tools', 'Design'];

export function SkillsSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<SkillCategory[]>(data.skills || []);
  const [pending, setPending] = useState(false);

  const addCategory = (cat: string) => {
    if (!cat.trim() || items.some((i) => i.category === cat)) return;
    setItems([...items, { category: cat, items: [] }]);
  };

  const addSkill = (idx: number, skill: string) => {
    if (!skill.trim()) return;
    const copy = [...items];
    copy[idx] = { ...copy[idx], items: [...(copy[idx].items || []), skill.trim()] };
    setItems(copy);
  };

  const removeSkill = (idx: number, sIdx: number) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], items: (copy[idx].items || []).filter((_, i: number) => i !== sIdx) };
    setItems(copy);
  };

  const removeCategory = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveSkills(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Skills saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((cat, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{cat.category}</span>
            <button onClick={() => removeCategory(idx)} className="ml-auto" style={{ color: 'rgb(var(--eleva-muted-fg))' }}><X className="w-3 h-3" /></button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(cat.items || []).map((skill: string, sIdx: number) => (
              <span key={sIdx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}>
                {skill}
                <button onClick={() => removeSkill(idx, sIdx)} className="hover:opacity-60"><X className="w-2.5 h-2.5" /></button>
              </span>
            ))}
          </div>
          <SkillInput onAdd={(s) => addSkill(idx, s)} placeholder={`Add skill to ${cat.category}...`} />
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {DEFAULT_CATEGORIES.filter((c) => !items.some((i) => i.category === c)).map((cat) => (
          <button key={cat} onClick={() => addCategory(cat)} className="text-[10px] font-mono px-2.5 py-1 rounded-full" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>
            + {cat}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <SaveButton pending={pending} onClick={save} />
      </div>
    </div>
  );
}

function SkillInput({ onAdd, placeholder }: { onAdd: (s: string) => void; placeholder: string }) {
  const [val, setVal] = useState('');
  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && val.trim()) {
      e.preventDefault();
      onAdd(val);
      setVal('');
    }
  };
  return (
    <input
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={handleKey}
      placeholder={placeholder}
      className="w-full px-3 py-1.5 rounded-md text-[12px] outline-none"
      style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}
    />
  );
}

// ─── Section: Education ─────────────────────────────────────────────────────────

export function EducationSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<EducationRow[]>(data.education || []);
  const [pending, setPending] = useState(false);

  const addItem = () => setItems([...items, { school: '', degree: '', field: '', location: '', date: '', gpa: '', achievements: [] }]);
  const updateItem = (idx: number, field: keyof EducationRow, value: EducationRow[keyof EducationRow]) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveEducation(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Education saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{item.school || `School ${idx + 1}`}</span>
            <button onClick={() => removeItem(idx)} className="ml-auto" style={{ color: 'rgb(var(--eleva-danger))' }}><Trash2 className="w-3 h-3" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="School" value={item.school || ''} onChange={(v) => updateItem(idx, 'school', v)} />
            <Field label="Degree" value={item.degree || ''} onChange={(v) => updateItem(idx, 'degree', v)} placeholder="Bachelor of Science" />
            <Field label="Field of Study" value={item.field || ''} onChange={(v) => updateItem(idx, 'field', v)} placeholder="Computer Science" />
            <Field label="Location" value={item.location || ''} onChange={(v) => updateItem(idx, 'location', v)} />
            <Field label="Graduation Date" value={item.date || ''} onChange={(v) => updateItem(idx, 'date', v)} placeholder="2020" />
            <Field label="GPA" value={item.gpa || ''} onChange={(v) => updateItem(idx, 'gpa', v)} placeholder="3.8/4.0" />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Education
        </button>
        <div className="ml-auto"><SaveButton pending={pending} onClick={save} /></div>
      </div>
    </div>
  );
}

// ─── Section: Certifications ────────────────────────────────────────────────────

export function CertificationsSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<CertificationRow[]>(data.certifications || []);
  const [pending, setPending] = useState(false);

  const addItem = () => setItems([...items, { name: '', issuer: '', date: '', url: '' }]);
  const updateItem = (idx: number, field: keyof CertificationRow, value: CertificationRow[keyof CertificationRow]) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveCertifications(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Certifications saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{item.name || `Cert ${idx + 1}`}</span>
            <button onClick={() => removeItem(idx)} className="ml-auto" style={{ color: 'rgb(var(--eleva-danger))' }}><Trash2 className="w-3 h-3" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Name" value={item.name || ''} onChange={(v) => updateItem(idx, 'name', v)} placeholder="AWS Solutions Architect" />
            <Field label="Issuer" value={item.issuer || ''} onChange={(v) => updateItem(idx, 'issuer', v)} placeholder="Amazon Web Services" />
            <Field label="Date" value={item.date || ''} onChange={(v) => updateItem(idx, 'date', v)} placeholder="2024" />
            <Field label="Credential URL" value={item.url || ''} onChange={(v) => updateItem(idx, 'url', v)} mono />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Certification
        </button>
        <div className="ml-auto"><SaveButton pending={pending} onClick={save} /></div>
      </div>
    </div>
  );
}

// ─── Section: Achievements ──────────────────────────────────────────────────────

export function AchievementsSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<AchievementRow[]>(data.achievements || []);
  const [pending, setPending] = useState(false);

  const addItem = () => setItems([...items, { title: '', description: '', date: '', type: 'achievement' }]);
  const updateItem = (idx: number, field: keyof AchievementRow, value: AchievementRow[keyof AchievementRow]) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveAchievements(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Achievements saved');
    setPending(false);
  };

  const typeOptions = ['achievement', 'award', 'hackathon', 'publication', 'patent'];

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{item.title || `Achievement ${idx + 1}`}</span>
            <button onClick={() => removeItem(idx)} className="ml-auto" style={{ color: 'rgb(var(--eleva-danger))' }}><Trash2 className="w-3 h-3" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Title" value={item.title || ''} onChange={(v) => updateItem(idx, 'title', v)} placeholder="1st Place Hackathon" />
            <Field label="Date" value={item.date || ''} onChange={(v) => updateItem(idx, 'date', v)} placeholder="2024" />
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Type</label>
              <select
                value={item.type || 'achievement'}
                onChange={(e) => updateItem(idx, 'type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}
              >
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-2">
            <Field label="Description" value={item.description || ''} onChange={(v) => updateItem(idx, 'description', v)} placeholder="Describe the achievement..." textarea />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Achievement
        </button>
        <div className="ml-auto"><SaveButton pending={pending} onClick={save} /></div>
      </div>
    </div>
  );
}

// ─── Section: Languages ─────────────────────────────────────────────────────────

const PROFICIENCIES = ['native', 'fluent', 'advanced', 'intermediate', 'basic'];

export function LanguagesSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<LanguageRow[]>(data.languages || []);
  const [pending, setPending] = useState(false);

  const addItem = () => setItems([...items, { language: '', proficiency: 'native' }]);
  const updateItem = (idx: number, field: keyof LanguageRow, value: LanguageRow[keyof LanguageRow]) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveLanguages(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Languages saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-end gap-3 p-3 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex-1">
            <Field label="Language" value={item.language || ''} onChange={(v) => updateItem(idx, 'language', v)} placeholder="English" />
          </div>
          <div className="w-40">
            <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Proficiency</label>
            <select
              value={item.proficiency || 'native'}
              onChange={(e) => updateItem(idx, 'proficiency', e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
              style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}
            >
              {PROFICIENCIES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={() => removeItem(idx)} className="mb-1" style={{ color: 'rgb(var(--eleva-danger))' }}><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Language
        </button>
        <div className="ml-auto"><SaveButton pending={pending} onClick={save} /></div>
      </div>
    </div>
  );
}

// ─── Section: Preferences ───────────────────────────────────────────────────────

export function PreferencesSection({ data }: { data: Profile }) {
  const prefs = data.preferences || {};
  const [d, setD] = useState({
    preferred_role: prefs.preferred_role || '',
    preferred_location: prefs.preferred_location || '',
    work_preference: prefs.work_preference || 'remote',
    salary_expectation: prefs.salary_expectation || '',
    visa_required: prefs.visa_required || false,
    open_to_relocation: prefs.open_to_relocation || false,
    employment_types: prefs.employment_types || [],
    target_industries: prefs.target_industries || [],
  });
  const [industriesInput, setIndustriesInput] = useState((d.target_industries || []).join(', '));
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    const payload = {
      ...d,
      target_industries: industriesInput.split(',').map((s: string) => s.trim()).filter(Boolean),
    };
    const r = await savePreferences(payload);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Preferences saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Preferred Role" value={d.preferred_role} onChange={(v) => setD({ ...d, preferred_role: v })} placeholder="Backend Engineer" />
        <Field label="Preferred Location" value={d.preferred_location} onChange={(v) => setD({ ...d, preferred_location: v })} placeholder="San Francisco, CA" />
        <Field label="Salary Expectation" value={d.salary_expectation} onChange={(v) => setD({ ...d, salary_expectation: v })} placeholder="$150,000 - $200,000" />
        <div>
          <label className="text-[10px] font-mono uppercase tracking-wider block mb-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Work Preference</label>
          <select
            value={d.work_preference}
            onChange={(e) => setD({ ...d, work_preference: e.target.value })}
            className="w-full px-3 py-2 rounded-lg text-[13px] outline-none"
            style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
          >
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="in_person">In Person</option>
            <option value="any">Any</option>
          </select>
        </div>
      </div>
      <Field label="Target Industries (comma separated)" value={industriesInput} onChange={setIndustriesInput} placeholder="Fintech, HealthTech, AI" />
      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
          <input type="checkbox" checked={d.visa_required} onChange={(e) => setD({ ...d, visa_required: e.target.checked })} className="rounded" />
          Visa sponsorship required
        </label>
        <label className="flex items-center gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
          <input type="checkbox" checked={d.open_to_relocation} onChange={(e) => setD({ ...d, open_to_relocation: e.target.checked })} className="rounded" />
          Open to relocation
        </label>
      </div>
      <div className="flex justify-end pt-2">
        <SaveButton pending={pending} onClick={save} />
      </div>
    </div>
  );
}
