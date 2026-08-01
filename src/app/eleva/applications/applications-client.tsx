'use client';

import Link from 'next/link';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Building2, DollarSign, Calendar, Star, Loader2, GripVertical, Sparkles, Target, FileText, Mail, MapPin, User, ExternalLink, Clock, Edit3, StickyNote, Pin, Archive } from 'lucide-react';
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
  cover_letter_id?: string | null;
  source?: string | null;
  match_score?: number | null;
  ats_score?: number | null;
  applied_at?: string | null;
  interview_at?: string | null;
  pinned?: boolean;
  favorite?: boolean;
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

function statusColor(status: Status) {
  return COLUMNS.find((c) => c.id === status)?.color ?? 'rgb(var(--eleva-muted-fg))';
}

export function ApplicationsClient({ initial }: { initial: Application[] }) {
  const [apps, setApps] = useState<Application[]>(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Application | null>(null);
  const [viewing, setViewing] = useState<Application | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function patchApp(id: string, patch: Partial<Application>, target: Partial<Application>) {
    setApps((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    if (target) setViewing((cur) => (cur && cur.id === id ? { ...cur, ...target } : cur));
  }

  async function save(form: Partial<Application>) {
    setSaving(true);
    try {
      if (editing?.id) {
        const res = await fetch('/eleva/api/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, patch: form }) });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error);
        setApps((prev) => prev.map((a) => (a.id === editing.id ? j.application : a)));
        setViewing((cur) => (cur && cur.id === editing.id ? { ...cur, ...j.application } : cur));
        toast.success('Application updated');
      } else {
        const payload: Partial<Application> = { ...form };
        if (payload.status === 'applied' && !payload.applied_at) payload.applied_at = new Date().toISOString();
        const res = await fetch('/eleva/api/applications', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
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
      setViewing(null);
      toast.success('Deleted');
    } else toast.error('Delete failed');
  }

  async function moveTo(id: string, status: Status) {
    const prev = apps;
    const now = new Date().toISOString();
    const patch: Partial<Application> = { status, updated_at: now };
    if (status === 'applied' && !prev.find((a) => a.id === id)?.applied_at) patch.applied_at = now;
    patchApp(id, patch, patch);
    const res = await fetch('/eleva/api/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, patch: { status, ...(patch.applied_at ? { applied_at: patch.applied_at } : {}) } }) });
    if (!res.ok) {
      setApps(prev);
      toast.error('Move failed');
    }
  }

  async function toggleFlag(id: string, key: 'pinned' | 'favorite') {
    const app = apps.find((a) => a.id === id);
    if (!app) return;
    const next = !app[key];
    const patch: Partial<Application> = { [key]: next, updated_at: new Date().toISOString() };
    patchApp(id, patch, patch);
    fetch('/eleva/api/applications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, patch: { [key]: next } }) })
      .then((r) => { if (!r.ok) { patchApp(id, { [key]: !next }, { [key]: !next }); toast.error('Toggle failed'); } })
      .catch(() => { patchApp(id, { [key]: !next }, { [key]: !next }); toast.error('Toggle failed'); });
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
          <p className="mt-2 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{apps.length} tracked · Drag cards between columns · Click a card for details.</p>
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
            const items = apps.filter((a) => a.status === col.id).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || 0);
            return (
              <Column key={col.id} column={col} items={items} onAdd={() => { setEditing({ status: col.id } as Application); setOpen(true); }} onOpen={(app) => setViewing(app)} onDelete={remove} onToggle={(id, key) => toggleFlag(id, key)} onArchive={(id) => moveTo(id, 'archived')} />
            );
          })}
        </div>
        <DragOverlay>
          {active ? <Card app={active} onOpen={() => { }} onDelete={() => { }} dragging /> : null}
        </DragOverlay>
      </DndContext>

      <AnimatePresence>{open && <ApplicationDialog editing={editing} saving={saving} onClose={() => { setOpen(false); setEditing(null); }} onSave={save} />}</AnimatePresence>
      <AnimatePresence>
        {viewing && (
          <DetailDrawer
            app={viewing}
            onClose={() => setViewing(null)}
            onEdit={() => { setEditing(viewing); setOpen(true); }}
            onDelete={() => remove(viewing.id)}
            onStatus={(status) => moveTo(viewing.id, status)}
            onToggle={(k) => toggleFlag(viewing.id, k)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Column({ column, items, onAdd, onOpen, onDelete, onToggle, onArchive }: { column: { id: Status; name: string; color: string }; items: Application[]; onAdd: () => void; onOpen: (app: Application) => void; onDelete: (id: string) => void; onToggle: (id: string, key: 'pinned' | 'favorite') => void; onArchive: (id: string) => void }) {
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
          {items.map((it) => <SortableCard key={it.id} app={it} onOpen={() => onOpen(it)} onDelete={() => onDelete(it.id)} onToggle={(k) => onToggle(it.id, k)} onArchive={() => onArchive(it.id)} />)}
        </SortableContext>
        <button onClick={onAdd} className="w-full py-2 rounded-md text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>+ Add</button>
      </div>
    </div>
  );
}

function SortableCard({ app, onOpen, onDelete, onToggle, onArchive }: { app: Application; onOpen: () => void; onDelete: () => void; onToggle: (k: 'pinned' | 'favorite') => void; onArchive: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.3 : 1 };
  return (
    <div ref={setNodeRef} style={style}>
      <Card app={app} onOpen={onOpen} onDelete={onDelete} onToggle={onToggle} onArchive={onArchive} dragHandle={{ ...attributes, ...listeners }} />
    </div>
  );
}

function CompanyAvatar({ company }: { company: string }) {
  const initials = company.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
  const hue = (company.length * 47) % 360;
  return (
    <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 text-[10px] font-semibold" style={{ background: `hsl(${hue} 60% 22%)`, color: `hsl(${hue} 85% 78%)`, border: '1px solid rgba(var(--eleva-border),0.6)' }}>{initials || '?'}</div>
  );
}

function Card({ app, onOpen, onDelete, onToggle, onArchive, dragHandle, dragging }: { app: Application; onOpen: () => void; onDelete: () => void; onToggle?: (k: 'pinned' | 'favorite') => void; onArchive?: () => void; dragHandle?: any; dragging?: boolean }) {
  const score = (v?: number | null) => v == null ? null : v;
  const ats = score(app.ats_score);
  const match = score(app.match_score);
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} onClick={onOpen} className="p-3 rounded-lg cursor-pointer group" style={{ background: 'rgb(var(--eleva-card))', border: `1px solid ${dragging ? 'rgb(var(--eleva-primary))' : app.pinned ? 'rgba(var(--eleva-warning-rgb), 0.5)' : 'rgb(var(--eleva-border))'}`, boxShadow: dragging ? '0 20px 40px rgba(0,0,0,0.2)' : 'none' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <CompanyAvatar company={app.company} />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate" style={{ color: 'rgb(var(--eleva-fg))' }}>{app.role}</div>
            <div className="text-[11px] flex items-center gap-1 mt-0.5 truncate" style={{ color: 'rgb(var(--eleva-muted-fg))' }}><Building2 className="w-3 h-3 shrink-0" />{app.company}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onToggle && (
            <button onClick={(e) => { e.stopPropagation(); onToggle('favorite'); }} title={app.favorite ? 'Unfavorite' : 'Favorite'} className={`p-0.5 rounded ${app.favorite ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
              <Star className="w-3.5 h-3.5" fill={app.favorite ? 'rgb(var(--eleva-warning))' : 'none'} style={{ color: app.favorite ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-muted-fg))' }} />
            </button>
          )}
          {onToggle && (
            <button onClick={(e) => { e.stopPropagation(); onToggle('pinned'); }} title={app.pinned ? 'Unpin' : 'Pin'} className={`p-0.5 rounded ${app.pinned ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
              <Pin className="w-3.5 h-3.5" fill={app.pinned ? 'rgb(var(--eleva-primary))' : 'none'} style={{ color: app.pinned ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted-fg))' }} />
            </button>
          )}
          <button {...dragHandle} onClick={(e) => e.stopPropagation()} className="p-0.5 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" title="Drag"><GripVertical className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /></button>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
        {ats != null && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.12)', color: 'rgb(var(--eleva-primary))' }}><Target className="w-2.5 h-2.5" />ATS {ats}%</span>
        )}
        {match != null && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: 'rgba(var(--eleva-success-rgb), 0.12)', color: 'rgb(var(--eleva-success))' }}>Match {match}%</span>
        )}
        {app.applied_at && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}>{new Date(app.applied_at).toLocaleDateString('en-US')}</span>}
        {app.interview_at && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.12)', color: 'rgb(var(--eleva-warning))' }}><Calendar className="w-2.5 h-2.5" />{new Date(app.interview_at).toLocaleDateString('en-US')}</span>}
        {app.salary && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded inline-flex items-center gap-0.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}><DollarSign className="w-2.5 h-2.5" />{app.salary}</span>}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {app.cover_letter_id && <span title="Cover letter ready"><Mail className="w-3 h-3" style={{ color: 'rgb(var(--eleva-secondary))' }} /></span>}
          {app.resume_id && <span title="Tailored resume ready"><FileText className="w-3 h-3" style={{ color: 'rgb(var(--eleva-secondary))' }} /></span>}
          <span className="text-[10px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{new Date(app.updated_at).toLocaleDateString('en-US')}</span>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onArchive && <button onClick={(e) => { e.stopPropagation(); onArchive(); }} title="Archive" className="p-0.5"><Archive className="w-3 h-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /></button>}
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Delete" className="p-0.5"><Trash2 className="w-3 h-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /></button>
        </div>
      </div>
    </motion.div>
  );
}

function DetailDrawer({ app, onClose, onEdit, onDelete, onStatus, onToggle }: { app: Application; onClose: () => void; onEdit: () => void; onDelete: () => void; onStatus: (s: Status) => void; onToggle: (k: 'pinned' | 'favorite') => void }) {
  const match = app.match_score;
  const ats = app.ats_score;
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50" style={{ background: 'rgba(0,0,0,0.55)' }} onClick={onClose} />
      <motion.aside
        initial={{ x: 480, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 480, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-[420px] flex flex-col overflow-y-auto"
        style={{ background: 'rgb(var(--eleva-card))', borderLeft: '1px solid rgb(var(--eleva-border))', boxShadow: '-24px 0 60px rgba(0,0,0,0.25)' }}
      >
        <div className="flex items-start justify-between p-5 border-b sticky top-0 z-10" style={{ borderColor: 'rgb(var(--eleva-border))', background: 'rgb(var(--eleva-card))' }}>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono" style={{ background: 'rgba(37,99,235,0.12)', color: statusColor(app.status) }}>{app.status}</span>
              {app.source === 'studio' && <span className="px-2 py-0.5 rounded-full text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.12)', color: 'rgb(var(--eleva-primary))' }}><Sparkles className="w-2.5 h-2.5 inline mr-0.5" />Studio</span>}
              {app.pinned && <span className="px-2 py-0.5 rounded-full text-[10px] font-mono" style={{ background: 'rgba(var(--eleva-warning-rgb), 0.12)', color: 'rgb(var(--eleva-warning))' }}><Pin className="w-2.5 h-2.5 inline mr-0.5" />Pinned</span>}
            </div>
            <div className="font-display text-lg font-semibold mt-2 truncate" style={{ color: 'rgb(var(--eleva-fg))' }}>{app.role}</div>
            <div className="text-[12px] flex items-center gap-1 mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}><Building2 className="w-3 h-3" />{app.company}</div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={(e) => { e.stopPropagation(); onToggle?.('favorite'); }} title={app.favorite ? 'Unfavorite' : 'Favorite'} className="p-2 rounded-md hover:opacity-70">
              <Star className="w-4 h-4" fill={app.favorite ? 'rgb(var(--eleva-warning))' : 'none'} style={{ color: app.favorite ? 'rgb(var(--eleva-warning))' : 'rgb(var(--eleva-muted-fg))' }} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onToggle?.('pinned'); }} title={app.pinned ? 'Unpin' : 'Pin' } className="p-2 rounded-md hover:opacity-70">
              <Pin className="w-4 h-4" fill={app.pinned ? 'rgb(var(--eleva-primary))' : 'none'} style={{ color: app.pinned ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted-fg))' }} />
            </button>
            <button onClick={onClose} className="p-2 rounded-md hover:opacity-70"><X className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} /></button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {(match != null || ats != null) && (
            <div className="grid grid-cols-2 gap-3">
              {ats != null && (
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-primary-rgb), 0.08)' }}>
                  <div className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-primary))' }}>{ats}%</div>
                  <div className="text-[9px] font-mono mt-0.5 flex items-center justify-center gap-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}><Target className="w-2.5 h-2.5" />ATS Score</div>
                </div>
              )}
              {match != null && (
                <div className="p-3 rounded-xl text-center" style={{ background: 'rgba(var(--eleva-success-rgb), 0.08)' }}>
                  <div className="font-display text-2xl font-bold" style={{ color: 'rgb(var(--eleva-success))' }}>{match}%</div>
                  <div className="text-[9px] font-mono mt-0.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Job Match</div>
                </div>
              )}
            </div>
          )}

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Status</div>
            <select value={app.status} onChange={(e) => onStatus(e.target.value as Status)} className="w-full px-3 py-2 rounded-md text-[13px] outline-none" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
              {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              <option value="archived">Archived</option>
            </select>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Details</div>
            <div className="space-y-1.5 text-[12px]">
              {app.location && <Row icon={MapPin}>{app.location}</Row>}
              {app.salary && <Row icon={DollarSign}>{app.salary}</Row>}
              {app.recruiter && <Row icon={User}>{app.recruiter}</Row>}
              {app.deadline && <Row icon={Calendar}>Deadline {new Date(app.deadline).toLocaleDateString('en-US')}</Row>}
              {app.applied_at && <Row icon={Clock}>Applied {new Date(app.applied_at).toLocaleDateString('en-US')}</Row>}
              {app.interview_at && <Row icon={Calendar}>Interview {new Date(app.interview_at).toLocaleDateString('en-US')}</Row>}
              {!app.location && !app.salary && !app.recruiter && !app.deadline && !app.applied_at && !app.interview_at && <div style={{ color: 'rgb(var(--eleva-muted-fg))' }}>No details added.</div>}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Documents</div>
            <div className="space-y-1.5">
              <DocLink href="/eleva/resumes" icon={FileText} ready={!!app.resume_id} label="Tailored resume" />
              <DocLink href="/eleva/cover-letters" icon={Mail} ready={!!app.cover_letter_id} label="Cover letter" />
              <DocLink href="/eleva/ats" icon={Target} ready={!!app.resume_id} label="ATS report" />
              {app.job_url && (
                <a href={app.job_url} target="_blank" rel="noreferrer" className="flex items-center justify-between px-3 py-2 rounded-lg text-[12px] hover:opacity-80" style={{ background: 'rgb(var(--eleva-muted))' }}>
                  <span className="inline-flex items-center gap-2" style={{ color: 'rgb(var(--eleva-fg))' }}><ExternalLink className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />Original job post</span>
                  <ExternalLink className="w-3 h-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
                </a>
              )}
            </div>
          </div>

          {app.notes && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'rgb(var(--eleva-muted-fg))' }}><StickyNote className="w-3 h-3" />Notes</div>
              <div className="p-3 rounded-lg text-[12px] whitespace-pre-wrap" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>{app.notes}</div>
            </div>
          )}

          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider mb-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Timeline</div>
            <div className="space-y-0">
              <TimelineItem time={app.created_at} label="Application added" />
              {app.applied_at && <TimelineItem time={app.applied_at} label="Applied" />}
              <TimelineItem time={app.updated_at} label="Last updated" last />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 p-5 border-t sticky bottom-0" style={{ borderColor: 'rgb(var(--eleva-border))', background: 'rgb(var(--eleva-card))' }}>
          <button onClick={onDelete} className="eleva-btn-ghost text-[12px] inline-flex items-center gap-1.5" style={{ color: 'rgb(239 68 68)' }}><Trash2 className="w-3.5 h-3.5" />Delete</button>
          <button onClick={onEdit} className="eleva-btn-primary text-[12px] inline-flex items-center gap-1.5"><Edit3 className="w-3.5 h-3.5" />Edit details</button>
        </div>
      </motion.aside>
    </>
  );
}

function Row({ icon: Icon, children }: { icon: any; children: React.ReactNode }) {
  return <div className="flex items-center gap-2" style={{ color: 'rgb(var(--eleva-fg))' }}><Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />{children}</div>;
}

function DocLink({ href, icon: Icon, ready, label }: { href: string; icon: any; ready: boolean; label: string }) {
  return (
    <Link href={href} className="flex items-center justify-between px-3 py-2 rounded-lg text-[12px] hover:opacity-80" style={{ background: 'rgb(var(--eleva-muted))' }}>
      <span className="inline-flex items-center gap-2" style={{ color: 'rgb(var(--eleva-fg))' }}>
        <Icon className="w-3.5 h-3.5" style={{ color: ready ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted-fg))' }} />
        {label}
      </span>
      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: ready ? 'rgba(var(--eleva-success-rgb), 0.12)' : 'rgba(239,68,68,0.10)', color: ready ? 'rgb(var(--eleva-success))' : 'rgb(239 68 68)' }}>{ready ? 'Ready' : 'Not created'}</span>
    </Link>
  );
}

function TimelineItem({ time, label, last }: { time: string; label: string; last?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="w-2.5 h-2.5 rounded-full mt-1" style={{ background: 'rgb(var(--eleva-primary))' }} />
        {!last && <div className="w-px flex-1 min-h-[18px]" style={{ background: 'rgb(var(--eleva-border))' }} />}
      </div>
      <div className="pb-3">
        <div className="text-[12px]" style={{ color: 'rgb(var(--eleva-fg))' }}>{label}</div>
        <div className="text-[10px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{new Date(time).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>
      </div>
    </div>
  );
}

function ApplicationDialog({ editing, saving, onClose, onSave }: { editing: Application | null; saving: boolean; onClose: () => void; onSave: (form: Partial<Application>) => void }) {
  const [form, setForm] = useState<Partial<Application>>(editing ?? { status: 'wishlist', priority: 'medium' });
  const set = (k: keyof Application, v: any) => setForm((prev) => ({ ...prev, [k]: v }));
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
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
