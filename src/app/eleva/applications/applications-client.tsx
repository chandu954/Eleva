'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { DndContext, closestCorners, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent, DragOverlay } from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Column, Card, DetailDrawer, ApplicationDialog } from './_components/applications-board';

export type Status = 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected' | 'archived';

export type Application = {
  id: string;
  company: string;
  role: string;
  status: Status;
  location?: string | null;
  salary?: string | null;
  recruiter?: string | null;
  deadline?: string | null;
  priority: 'low' | 'medium' | 'high';
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

export const COLUMNS: { id: Status; name: string; color: string }[] = [
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
      const previousApp = prev.find((application) => application.id === id);
      if (previousApp) {
        setViewing((current) => current?.id === id ? { ...current, ...previousApp } : current);
      }
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
          {COLUMNS.map((col: { id: Status; name: string; color: string }) => {
            const items = apps.filter((a) => a.status === col.id).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0) || 0);
            return (
              <Column key={col.id} column={col} items={items} onAdd={() => { setEditing({ status: col.id } as Application); setOpen(true); }} onOpen={(app: Application) => setViewing(app)} onDelete={remove} onToggle={(id: string, key: 'pinned' | 'favorite') => toggleFlag(id, key)} onArchive={(id: string) => moveTo(id, 'archived')} />
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
