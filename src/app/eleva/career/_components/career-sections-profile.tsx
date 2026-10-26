'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Target, Shrink, ArrowUpDown, Zap, type LucideIcon } from 'lucide-react';
import { savePersonal, saveSummary } from '../../_lib/actions-career';
import type { Profile } from './career-types';
import { Field, SaveButton } from './career-ui';

export function PersonalSection({ data }: { data: Profile }) {
  const [d, setD] = useState({
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    headline: data.headline || '',
    email: data.email || '',
    phone_number: data.phone_number || '',
    location: data.location || '',
    website: data.website || '',
    linkedin_url: data.linkedin_url || '',
    github_url: data.github_url || '',
    portfolio_url: data.portfolio_url || '',
    leetcode_url: data.leetcode_url || '',
    hackerrank_url: data.hackerrank_url || '',
    twitter_url: data.twitter_url || '',
  });
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    const r = await savePersonal(d);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Personal info saved');
    setPending(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="First Name" value={d.first_name} onChange={(v) => setD({ ...d, first_name: v })} />
        <Field label="Last Name" value={d.last_name} onChange={(v) => setD({ ...d, last_name: v })} />
      </div>
      <Field label="Headline" value={d.headline} onChange={(v) => setD({ ...d, headline: v })} placeholder="Staff Backend Engineer @ Stripe" />
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Email" value={d.email} onChange={(v) => setD({ ...d, email: v })} type="email" />
        <Field label="Phone" value={d.phone_number} onChange={(v) => setD({ ...d, phone_number: v })} />
        <Field label="Location" value={d.location} onChange={(v) => setD({ ...d, location: v })} placeholder="San Francisco, CA" />
        <Field label="Website" value={d.website} onChange={(v) => setD({ ...d, website: v })} />
      </div>
      <div className="border-t pt-4" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
        <div className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Links</div>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="LinkedIn" value={d.linkedin_url} onChange={(v) => setD({ ...d, linkedin_url: v })} placeholder="https://linkedin.com/in/..." mono />
          <Field label="GitHub" value={d.github_url} onChange={(v) => setD({ ...d, github_url: v })} placeholder="https://github.com/..." mono />
          <Field label="Portfolio" value={d.portfolio_url} onChange={(v) => setD({ ...d, portfolio_url: v })} placeholder="https://..." mono />
          <Field label="LeetCode" value={d.leetcode_url} onChange={(v) => setD({ ...d, leetcode_url: v })} placeholder="https://leetcode.com/..." mono />
          <Field label="HackerRank" value={d.hackerrank_url} onChange={(v) => setD({ ...d, hackerrank_url: v })} placeholder="https://hackerrank.com/..." mono />
          <Field label="Twitter / X" value={d.twitter_url} onChange={(v) => setD({ ...d, twitter_url: v })} placeholder="https://x.com/..." mono />
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <SaveButton pending={pending} onClick={save} />
      </div>
    </div>
  );
}

// ─── Section: Summary ───────────────────────────────────────────────────────────

export function SummarySection({ data }: { data: Profile }) {
  const [summary, setSummary] = useState(data.professional_summary || '');
  const [pending, setPending] = useState(false);

  const save = async () => {
    setPending(true);
    const r = await saveSummary(summary);
    if (r?.error) toast.error('Failed to save', { description: r.error });
    else toast.success('Summary saved');
    setPending(false);
  };

  return (
    <div className="space-y-3">
      <Field label="Professional Summary" value={summary} onChange={setSummary} placeholder="Write a brief professional summary..." textarea />
      <div className="flex items-center gap-2 flex-wrap">
        <AIAction icon={Sparkles} label="Improve" />
        <AIAction icon={Target} label="ATS Optimize" />
        <AIAction icon={Shrink} label="Shorten" />
        <AIAction icon={ArrowUpDown} label="Senior Tone" />
        <AIAction icon={Zap} label="Executive Tone" />
      </div>
      <div className="flex justify-end pt-1">
        <SaveButton pending={pending} onClick={save} />
      </div>
    </div>
  );
}

function AIAction({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button
      className="text-[11px] font-medium px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors hover:opacity-80"
      style={{ background: 'rgba(37,99,235,.08)', color: 'rgb(var(--eleva-primary))' }}
      onClick={() => toast.info(`AI ${label} — coming soon`)}
    >
      <Icon className="w-3 h-3" />
      {label}
    </button>
  );
}

// ─── Section: Experience ────────────────────────────────────────────────────────
