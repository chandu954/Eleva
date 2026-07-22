'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Building2, DollarSign, Calendar, Star, Loader2, GripVertical, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { DndContext, closestCorners, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent, DragOverlay, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Status = 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected' | 'archived';
type Priority = 'low' | 'medium' | 'high';

type Application = {
  id: string;
  company: string;
  role: string;
  status: Status;
  location?: string | null;
  salary?: string | null;
  recruiter?: string | null;
  deadline?: string | null;
  priority: Priority;
  job_description?: string | null;
  job_url?: string | null;
  notes?: string | null;
  resume_id?: string | null;
  created_at: string;
  updated_at: string;
};

const COLUMNS: { id: Status; name: string; color: string }[] = [
  { id: 'wishlist', name: 'Wishlist',  color: 'rgb(var(--eleva-muted-fg))' },
  { id: 'applied',  name: 'Applied',   color: 'rgb(var(--eleva-primary))' },
  { id: 'interview', name: 'Interview', color: 'rgb(var(--eleva-warning))' },
  { id: 'offer',    name: 'Offer',     color: 'rgb(var(--eleva-success))' },
  { id: 'rejected', name: 'Rejected',  color: 'rgb(239 68 68)' },
];

export function ApplicationsClient({ initial }: { initial: Application[] }) {
  const [apps, setApps] = useState<Application[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  async function save(form: Partial<Application>) {
    setSaving(true);
    try {
      if (editing?.id) {
        const res = await fetch('/eleva/api/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, patch: form }) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
        setApps((prev) => prev.map((a) => (a.id === editing.id ? j.application : a)));
        toast.success('Application updated');
      } else {
        const res = await fetch('/eleva/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
        setApps((prev) => [j.application, ...prev]);
        toast.success('Application added');
      }
      setOpen(false);
      setEditing(null);
    } catch (e) {
      toast.error('Save failed', { description: (e as Error).message });
    } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm('Delete this application?')) return;
    const res = await fetch(`/eleva/api/applications?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setApps((prev) => prev.filter((a) => a.id !== id));
      toast.success('Deleted');
    } else toast.error('Delete failed');
  }

  async function moveTo(id: string, status: Status) {
    const prev = apps;
    setApps((cur) => cur.map((a) => (a.id === id ? { ...a, status, updated_at: new Date().toISOString() } : a)));
    const res = await fetch('/eleva/api/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, patch: { status } }) });
    if (!res.ok) {
      setApps(prev);
      toast.error('Move failed');
    }
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    if (!e.over) return;
    const targetStatus = String(e.over.id).replace('col-', '') as Status;
    const draggingId = String(e.active.id);
    const app = apps.find((a) => a.id === draggingId);
    if (app && COLUMNS.some((c) => c.id === targetStatus) && app.status !== targetStatus) {
      moveTo(draggingId, targetStatus);
    }
  }

  const active = apps.find((a) => a.id === activeId);

  return (
    <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
      <div className="flex flex-wrap justify-between items-end gap-4 mb-8">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-[0.2em] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Career pipeline</div>
          <h1 className="font-display text-4xl font-semibold tracking-tighter" style={{ color: 'rgb(var(--eleva-fg))' }}>Applications</h1>
          <p className="mt-2 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{apps.length} tracked · Drag cards between columns.</p>
        </div>
        <button onClick={() => { setEditing(null); setOpen(true); }} className="eleva-btn-primary inline-flex items-center gap-2" data-testid="add-application"><Plus className="w-4 h-4" />Add job</button>
      </div>

      {apps.length === 0 && (
        <div className="eleva-card p-10 text-center mb-6">
          <div className="font-display text-xl font-semibold mb-1" style={{ color: 'rgb(var(--eleva-fg))' }}>No applications yet</div>
          <div className="text-[13px] mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>You don&apos;t have any applications tracked.</div>
          <div className="flex items-center justify-center gap-2 mb-4 text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
            <Sparkles className="w-3 h-3" style={{ color: 'rgb(var(--eleva-primary))' }} />
            AI Suggestion: Run the Studio pipeline. We&apos;ll automatically track applications here.
          </div>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => setOpen(true)} className="eleva-btn-primary inline-flex items-center gap-2"><Plus className="w-4 h-4" />Add first application</button>
            <Link href="/eleva/studio" className="eleva-btn-ghost inline-flex items-center gap-2 text-[12px]"><Sparkles className="w-4 h-4" />Run Pipeline</Link>
          </div>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setActiveId(null)}>
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {COLUMNS.map((col) => {
            const items = apps.filter((a) => a.status === col.id);
            return (
              <Column key={col.id} column={col} items={items} onAdd={() => { setEditing({ status: col.id } as Application); setOpen(true); }} onEdit={(app) => { setEditing(app); setOpen(true); }} onDelete={remove} />
            );
          })}
        </div>
        <DragOverlay>
          {active ? <Card app={active} onEdit={() => { }} onDelete={() => { }} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>{open && <ApplicationDialog editing={editing} saving={saving} onClose={() => { setOpen(false); setEditing(null); }} onSave={save} />}</AnimatePresence>
    </div>
  );
}

function Column({ column, items, onAdd, onEdit, onDelete }: { column: { id: Status; name: string; color: string }; items: Application[]; onAdd: () => void; onEdit: (app: Application) => void; onDelete: (id: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${column.id}` });
  return (
    <div>
      <div className="flex items-center justify-between px-1 pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: column.color }} />
          <span className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{column.name}</span>
          <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{items.length}</span>
        </div>
      </div>
      <div ref={setNodeRef} className="space-y-2 p-2 rounded-xl min-h-[300px] transition-colors" style={{ background: isOver ? 'rgba(37,99,235,0.10)' : 'rgb(var(--eleva-muted))' }}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((it) => <SortableCard key={it.id} app={it} onEdit={() => onEdit(it)} onDelete={() => onDelete(it.id)} />)}
        </SortableContext>
        <button onClick={onAdd} className="w-full py-2 rounded-md text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>+ Add</button>
      </div>
    </div>
  );
}

function SortableCard({ app, onEdit, onDelete }: { app: Application; onEdit: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <Card app={app} onEdit={onEdit} onDelete={onDelete} dragHandle={{ ...attributes, ...listeners }} />
    </div>
  );
}

function Card({ app, onEdit, onDelete, dragHandle, dragging }: { app: Application; onEdit: () => void; onDelete: () => void; dragHandle?: any; dragging?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} onClick={onEdit} className="p-3 rounded-lg cursor-pointer group" style={{ background: 'rgb(var(--eleva-card))', border: `1px solid ${dragging ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-border))'}`, boxShadow: dragging ? '0 20px 40px rgba(0,0,0,0.2)' : 'none' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold truncate" style={{ color: 'rgb(var(--eleva-fg))' }}>{app.role}</div>
          <div className="text-[11px] flex items-center gap-1 mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}><Building2 className="w-3 h-3" />{app.company}</div>
        </div>
        <div className="flex items-center gap-1">
          {app.priority === 'high' && <Star className="w-3.5 h-3.5" fill="rgb(var(--eleva-warning))" style={{ color: 'rgb(var(--eleva-warning))' }} />}
          <button {...dragHandle} onClick={(e) => e.stopPropagation()} className="p-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" title="Drag"><GripVertical className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /></button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 flex-wrap">
        {app.salary && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}><DollarSign className="w-2.5 h-2.5" />{app.salary}</span>}
        {app.deadline && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}><Calendar className="w-2.5 h-2.5" />{new Date(app.deadline).toLocaleDateString('en-US')}</span>}
        {app.location && <span className="text-[10px] px-1.5 py-0.5 rounded truncate max-w-[100px]" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>{app.location}</span>}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{new Date(app.updated_at).toLocaleDateString('en-US')}</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /></button>
      </div>
    </motion.div>
  );
}

function ApplicationDialog({ editing, saving, onClose, onSave }: { editing: Application | null; saving: boolean; onClose: () => void; onSave: (form: Partial<Application>) => void }) {
  const [form, setForm] = useState<Partial<Application>>(editing ?? { status: 'wishlist', priority: 'medium' });
  const set = (k: keyof Application, v: any) => setForm((prev) => ({ ...prev, [k]: v }));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <motion.div initial={{ scale: 0.96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: 'rgb(var(--eleva-card))', border: '1px solid rgb(var(--eleva-border))' }}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
          <div className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>{editing?.id ? 'Edit application' : 'New application'}</div>
          <button onClick={onClose} className="p-2 rounded-md"><X className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /></button>
        </div>
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          <FieldRow label="Company" required><input required autoFocus value={form.company ?? ''} onChange={(e) => set('company', e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} /></FieldRow>
          <FieldRow label="Role" required><input required value={form.role ?? ''} onChange={(e) => set('role', e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} /></FieldRow>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Status">
              <select value={form.status ?? 'wishlist'} onChange={(e) => set('status', e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                <option value="archived">Archived</option>
              </select>
            </FieldRow>
            <FieldRow label="Priority">
              <select value={form.priority ?? 'medium'} onChange={(e) => set('priority', e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                {['low','medium','high'].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </FieldRow>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Location"><input value={form.location ?? ''} onChange={(e) => set('location', e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} /></FieldRow>
            <FieldRow label="Salary"><input value={form.salary ?? ''} onChange={(e) => set('salary', e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} /></FieldRow>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Recruiter"><input value={form.recruiter ?? ''} onChange={(e) => set('recruiter', e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} /></FieldRow>
            <FieldRow label="Deadline"><input type="date" value={form.deadline ?? ''} onChange={(e) => set('deadline', e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} /></FieldRow>
          </div>
          <FieldRow label="Job URL"><input value={form.job_url ?? ''} onChange={(e) => set('job_url', e.target.value)} placeholder="https://…" className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} /></FieldRow>
          <FieldRow label="Notes"><textarea rows={3} value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none resize-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }} /></FieldRow>
        </div>
        <div className="flex items-center justify-end gap-2 p-4 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
          <button onClick={onClose} className="eleva-btn-ghost text-[12px]">Cancel</button>
          <button onClick={() => { if (!form.company || !form.role) { toast.error('Company and role required'); return; } onSave(form); }} disabled={saving} className="eleva-btn-primary inline-flex items-center gap-2 text-[12px]">{saving && <Loader2 className="w-3 h-3 animate-spin" />}{editing?.id ? 'Save' : 'Add application'}</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FieldRow({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="text-[11px] font-mono uppercase tracking-wider block mb-1.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{label}{required && <span style={{ color: 'rgb(220,38,38)' }}> *</span>}</label>
      {children}
    </div>
  );
}
