'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { GripVertical, Trash2, X, Plus } from 'lucide-react';
import { saveExperience, saveProjects } from '../../_lib/actions-career';
import type { ExperienceRow, ProjectRow } from '../../_lib/actions-career';
import type { Profile } from './career-types';
import { Field, SaveButton } from './career-ui';

export function ExperienceSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<ExperienceRow[]>(data.work_experience || []);
  const [pending, setPending] = useState(false);

  const addItem = () => {
    setItems([...items, { company: '', position: '', location: '', date: '', end_date: '', current: false, description: [], achievements: [''], technologies: [] }]);
  };

  const updateItem = (idx: number, field: keyof ExperienceRow, value: ExperienceRow[keyof ExperienceRow]) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };

  const updateAchievement = (idx: number, aIdx: number, value: string) => {
    const copy = [...items];
    const achievements = [...(copy[idx].achievements || [])];
    achievements[aIdx] = value;
    copy[idx] = { ...copy[idx], achievements };
    setItems(copy);
  };

  const addAchievement = (idx: number) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], achievements: [...(copy[idx].achievements || []), ''] };
    setItems(copy);
  };

  const removeAchievement = (idx: number, aIdx: number) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], achievements: (copy[idx].achievements || []).filter((_, i: number) => i !== aIdx) };
    setItems(copy);
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const save = async () => {
    setPending(true);
    const clean = items.map((item) => ({
      ...item,
      achievements: (item.achievements || []).filter((a: string) => a.trim()),
      description: (item.description || []).filter((d: string) => d.trim()),
    }));
    const r = await saveExperience(clean);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Experience saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-3">
            <GripVertical className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>Role {idx + 1}</span>
            <button onClick={() => removeItem(idx)} className="ml-auto text-[11px] px-2 py-1 rounded-md" style={{ color: 'rgb(var(--eleva-danger))' }}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Company" value={item.company || ''} onChange={(v) => updateItem(idx, 'company', v)} />
            <Field label="Position" value={item.position || ''} onChange={(v) => updateItem(idx, 'position', v)} />
            <Field label="Location" value={item.location || ''} onChange={(v) => updateItem(idx, 'location', v)} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Start Date" value={item.date || ''} onChange={(v) => updateItem(idx, 'date', v)} placeholder="Jan 2023" />
              {!item.current && <Field label="End Date" value={item.end_date || ''} onChange={(v) => updateItem(idx, 'end_date', v)} placeholder="Present" />}
            </div>
          </div>
          <label className="flex items-center gap-2 mt-2 text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
            <input type="checkbox" checked={!!item.current} onChange={(e) => updateItem(idx, 'current', e.target.checked)} className="rounded" />
            Currently working here
          </label>
          <div className="mt-3">
            <div className="text-[10px] font-mono uppercase tracking-wider mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Achievements</div>
            {(item.achievements || []).map((a: string, aIdx: number) => (
              <div key={aIdx} className="flex items-start gap-2 mb-1.5">
                <span className="mt-2 text-[10px]" style={{ color: 'rgb(var(--eleva-primary))' }}>▸</span>
                <input
                  value={a}
                  onChange={(e) => updateAchievement(idx, aIdx, e.target.value)}
                  placeholder="Built a distributed system that..."
                  className="flex-1 px-3 py-1.5 rounded-md text-[13px] outline-none"
                  style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-fg))' }}
                />
                <button onClick={() => removeAchievement(idx, aIdx)} className="mt-1.5 text-[11px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button onClick={() => addAchievement(idx)} className="text-[11px] font-medium mt-1 inline-flex items-center gap-1" style={{ color: 'rgb(var(--eleva-primary))' }}>
              <Plus className="w-3 h-3" /> Add achievement
            </button>
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5 transition-colors" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Experience
        </button>
        <div className="ml-auto">
          <SaveButton pending={pending} onClick={save} />
        </div>
      </div>
    </div>
  );
}

// ─── Section: Projects ──────────────────────────────────────────────────────────

export function ProjectsSection({ data }: { data: Profile }) {
  const [items, setItems] = useState<ProjectRow[]>(data.projects || []);
  const [pending, setPending] = useState(false);

  const addItem = () => setItems([...items, { name: '', description: [''], technologies: [], url: '', github_url: '', date: '' }]);
  const updateItem = (idx: number, field: keyof ProjectRow, value: ProjectRow[keyof ProjectRow]) => {
    const copy = [...items];
    copy[idx] = { ...copy[idx], [field]: value };
    setItems(copy);
  };
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

  const save = async () => {
    setPending(true);
    const r = await saveProjects(items);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Projects saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 rounded-xl" style={{ background: 'rgb(var(--eleva-muted))' }}>
          <div className="flex items-center gap-2 mb-3">
            <GripVertical className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            <span className="text-[12px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{item.name || `Project ${idx + 1}`}</span>
            <button onClick={() => removeItem(idx)} className="ml-auto" style={{ color: 'rgb(var(--eleva-danger))' }}><Trash2 className="w-3 h-3" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Project Name" value={item.name || ''} onChange={(v) => updateItem(idx, 'name', v)} />
            <Field label="Date" value={item.date || ''} onChange={(v) => updateItem(idx, 'date', v)} placeholder="2024" />
            <Field label="GitHub URL" value={item.github_url || ''} onChange={(v) => updateItem(idx, 'github_url', v)} mono />
            <Field label="Live Demo URL" value={item.url || ''} onChange={(v) => updateItem(idx, 'url', v)} mono />
          </div>
          <div className="mt-3">
            <Field label="Description" value={(item.description || []).join('\n')} onChange={(v) => updateItem(idx, 'description', v.split('\n').filter(Boolean))} placeholder="Describe the project..." textarea />
          </div>
          <div className="mt-2">
            <Field label="Tech Stack (comma separated)" value={(item.technologies || []).join(', ')} onChange={(v) => updateItem(idx, 'technologies', v.split(',').map((s: string) => s.trim()).filter(Boolean))} placeholder="React, Go, PostgreSQL" />
          </div>
        </div>
      ))}
      <div className="flex items-center gap-3">
        <button onClick={addItem} className="text-[12px] font-medium px-4 py-2 rounded-lg inline-flex items-center gap-1.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-primary))' }}>
          <Plus className="w-3.5 h-3.5" /> Add Project
        </button>
        <div className="ml-auto"><SaveButton pending={pending} onClick={save} /></div>
      </div>
    </div>
  );
}

// ─── Section: Skills ────────────────────────────────────────────────────────────

