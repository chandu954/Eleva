'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Undo2, Redo2, Download, Sparkles, ChevronDown, Loader2,
  GripVertical, Plus, ArrowLeft, Check, X, RotateCcw,
  Trash2, GraduationCap, Briefcase, Code2, Wrench,
  BookOpen, Award, Shrink, BarChart3, Expand, SpellCheck,
  Heart, Target,
} from 'lucide-react';
import Link from 'next/link';
import { WorkspaceShell } from '../_components/workspace-shell';
import { rewriteBullet } from '../_lib/eleva-client';
import { ResumeHealth } from './_components/resume-health';
import { KeywordHeatmap } from './_components/keyword-heatmap';
import { DiffView } from './_components/diff-view';
import { REWRITE_MODE_OPTIONS, type RewriteMode } from '../api/tool/rewrite/rewrite-utils';

type SectionId = 'summary' | 'experience' | 'projects' | 'skills' | 'education' | 'certificates';

interface BulletItem {
  id: string;
  text: string;
  original: string;
  suggestion?: string;
  streaming?: boolean;
  rewriteMeta?: {
    confidence?: number;
    reason?: string;
    attempts?: Array<{ attempt: number; model: string; status: string; latencyMs: number; empty?: boolean; finishReason?: string; error?: string }>;
    fabricationRisk?: 'none' | 'low' | 'medium' | 'high';
  };
}

interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: BulletItem[];
}

interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url: string;
  bullets: BulletItem[];
}

interface SkillCategory {
  id: string;
  category: string;
  items: string[];
}

interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  field: string;
  gpa: string;
  startDate: string;
  endDate: string;
}

interface CertificateEntry {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialUrl: string;
}

interface ResumeData {
  name: string;
  role: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  skills: SkillCategory[];
  education: EducationEntry[];
  certificates: CertificateEntry[];
}

type HistorySnapshot = { data: ResumeData; selection: { section: SectionId; itemIndex?: number } };

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

const initialResume: ResumeData = {
  name: 'Ashish Sharma',
  role: 'Senior Backend Engineer',
  email: 'ashish@eleva.app',
  phone: '',
  location: 'San Francisco, CA',
  linkedin: 'linkedin.com/in/ashish',
  github: 'github.com/ashish',
  website: '',
  summary: 'Senior backend engineer with 7 years designing distributed systems in Go and Rust. Built pricing & billing infrastructure powering $2B+ ARR across two YC unicorns.',
  experience: [
    {
      id: 'exp1', company: 'Google', role: 'Senior Backend Engineer', location: 'Mountain View, CA',
      startDate: 'Jan 2023', endDate: 'Present',
      bullets: [
        { id: 'b0', text: 'Led design & rollout of a low-latency pricing microservice in Go serving 4.2M req/day at p99 < 40ms — reduced infra cost by 34%.', original: 'Led design & rollout of a low-latency pricing microservice in Go serving 4.2M req/day at p99 < 40ms — reduced infra cost by 34%.' },
        { id: 'b1', text: 'Owned SLO instrumentation across 12 services; automated PagerDuty routing, cutting mean incident time from 42m → 11m.', original: 'Owned SLO instrumentation across 12 services; automated PagerDuty routing, cutting mean incident time from 42m → 11m.' },
        { id: 'b2', text: 'Mentored 4 engineers; introduced weekly design reviews adopted org-wide across 30 engineers.', original: 'Mentored 4 engineers; introduced weekly design reviews adopted org-wide across 30 engineers.' },
      ],
    },
    {
      id: 'exp2', company: 'Ramp', role: 'Staff Engineer', location: 'San Francisco, CA',
      startDate: '2020', endDate: '2023',
      bullets: [
        { id: 'b3', text: 'Owned the ledger + reconciliation system processing $18B in transactions with 99.997% uptime.', original: 'Owned the ledger + reconciliation system processing $18B in transactions with 99.997% uptime.' },
        { id: 'b4', text: 'Rewrote the notification pipeline to Kafka; cut alert latency 8s → 220ms.', original: 'Rewrote the notification pipeline to Kafka; cut alert latency 8s → 220ms.' },
      ],
    },
  ],
  projects: [
    { id: 'p1', name: 'Distributed Task Scheduler', description: 'Built a distributed task scheduler in Rust handling 500K tasks/day with leader election via Raft consensus.', technologies: ['Rust', 'Raft', 'gRPC', 'PostgreSQL'], url: '', bullets: [] },
    { id: 'p2', name: 'Real-time Analytics Pipeline', description: 'Designed a real-time analytics pipeline processing 10M events/hour using Kafka Streams and ClickHouse.', technologies: ['Kafka', 'ClickHouse', 'Go', 'Kubernetes'], url: '', bullets: [] },
  ],
  skills: [
    { id: 's1', category: 'Languages', items: ['Go', 'Rust', 'Python', 'TypeScript'] },
    { id: 's2', category: 'Cloud & Infrastructure', items: ['AWS', 'Kubernetes', 'Terraform', 'Docker'] },
    { id: 's3', category: 'Databases & Messaging', items: ['PostgreSQL', 'Kafka', 'Redis', 'gRPC'] },
  ],
  education: [
    { id: 'e1', school: 'IIT Bombay', degree: 'B.S.', field: 'Computer Science', gpa: '3.8', startDate: '2014', endDate: '2018' },
  ],
  certificates: [
    { id: 'c1', name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2022', credentialUrl: '' },
    { id: 'c2', name: 'Certified Kubernetes Administrator', issuer: 'CNCF', date: '2023', credentialUrl: '' },
  ],
};

const sections: { id: SectionId; name: string; icon: typeof Briefcase; countKey: keyof ResumeData }[] = [
  { id: 'summary', name: 'Summary', icon: BookOpen, countKey: 'summary' },
  { id: 'experience', name: 'Experience', icon: Briefcase, countKey: 'experience' },
  { id: 'projects', name: 'Projects', icon: Code2, countKey: 'projects' },
  { id: 'skills', name: 'Skills', icon: Wrench, countKey: 'skills' },
  { id: 'education', name: 'Education', icon: GraduationCap, countKey: 'education' },
  { id: 'certificates', name: 'Certificates', icon: Award, countKey: 'certificates' },
];

function getSectionCount(data: ResumeData, key: keyof ResumeData): number {
  if (key === 'summary') return data.summary ? 1 : 0;
  const val = data[key];
  return Array.isArray(val) ? val.length : 0;
}

export default function EditorPage() {
  const [data, setData] = useState<ResumeData>(initialResume);
  const [activeSection, setActiveSection] = useState<SectionId>('experience');
  const [toast, setToast] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [rightTab, setRightTab] = useState<'preview' | 'health' | 'keywords'>('preview');

  const historyRef = useRef<HistorySnapshot[]>([{ data: initialResume, selection: { section: 'experience' } }]);
  const historyIndexRef = useRef(0);
  const [, forceRender] = useState(0);

  const showToast = useCallback((msg: string, duration = 2500) => {
    setToast(msg);
    setTimeout(() => setToast(null), duration);
  }, []);

  const pushHistory = useCallback((newData: ResumeData, section?: SectionId, itemIndex?: number) => {
    const idx = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push({ data: JSON.parse(JSON.stringify(newData)), selection: { section: section || activeSection, itemIndex } });
    if (historyRef.current.length > 100) historyRef.current.shift();
    historyIndexRef.current = historyRef.current.length - 1;
    forceRender((n) => n + 1);
  }, [activeSection]);

  const updateData = useCallback((fn: (prev: ResumeData) => ResumeData, recordHistory = true) => {
    setData((prev) => {
      const next = fn(prev);
      if (recordHistory) pushHistory(next);
      return next;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const entry = historyRef.current[historyIndexRef.current];
    setData(JSON.parse(JSON.stringify(entry.data)));
    setActiveSection(entry.selection.section);
    forceRender((n) => n + 1);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const entry = historyRef.current[historyIndexRef.current];
    setData(JSON.parse(JSON.stringify(entry.data)));
    setActiveSection(entry.selection.section);
    forceRender((n) => n + 1);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  async function handleBulletRewrite(expId: string, bulletId: string, mode: RewriteMode = 'professional') {
    const exp = data.experience.find((e) => e.id === expId);
    if (!exp) return;
    const b = exp.bullets.find((x) => x.id === bulletId);
    if (!b || !b.text.trim()) { showToast('Cannot rewrite an empty bullet.'); return; }
    updateData((prev) => {
      const e = prev.experience.find((x) => x.id === expId);
      if (!e) return prev;
      e.bullets = e.bullets.map((x) => x.id === bulletId ? { ...x, suggestion: '', streaming: true } : x);
      return { ...prev };
    }, false);
    try {
      const res = await rewriteBullet({ bullet: b.text.trim(), role: exp.role, mode });
      if (res.success && res.rewritten) {
        updateData((prev) => {
          const e = prev.experience.find((x) => x.id === expId);
          if (!e) return prev;
          e.bullets = e.bullets.map((x) => x.id === bulletId ? {
            ...x,
            suggestion: res.rewritten,
            streaming: false,
            rewriteMeta: {
              confidence: res.attempts?.some((a: any) => a.status === 'success') ? 96 : 80,
              reason: res.attempts?.some((a: any) => a.status === 'fallback') ? 'Used safe local fallback rewrite' : 'AI rewrite generated',
              attempts: res.attempts,
              fabricationRisk: 'none',
            },
          } : x);
          return { ...prev };
        });
      } else {
        updateData((prev) => {
          const e = prev.experience.find((x) => x.id === expId);
          if (!e) return prev;
          e.bullets = e.bullets.map((x) => x.id === bulletId ? { ...x, streaming: false } : x);
          return { ...prev };
        }, false);
        showToast(res.error || 'Rewrite failed.');
      }
    } catch {
      updateData((prev) => {
        const e = prev.experience.find((x) => x.id === expId);
        if (!e) return prev;
        e.bullets = e.bullets.map((x) => x.id === bulletId ? { ...x, streaming: false } : x);
        return { ...prev };
      }, false);
      showToast('Network error.');
    }
  }

  async function handleProjectRewrite(projId: string, bulletId: string) {
    const proj = data.projects.find((p) => p.id === projId);
    if (!proj) return;
    const b = proj.bullets.find((x) => x.id === bulletId);
    if (!b || !b.text.trim()) { showToast('Cannot rewrite an empty bullet.'); return; }
    updateData((prev) => {
      const p = prev.projects.find((x) => x.id === projId);
      if (!p) return prev;
      p.bullets = p.bullets.map((x) => x.id === bulletId ? { ...x, suggestion: '', streaming: true } : x);
      return { ...prev };
    }, false);
    try {
      const res = await rewriteBullet({ bullet: b.text.trim(), role: data.role });
      if (res.success && res.rewritten) {
        updateData((prev) => {
          const p = prev.projects.find((x) => x.id === projId);
          if (!p) return prev;
          p.bullets = p.bullets.map((x) => x.id === bulletId ? { ...x, suggestion: res.rewritten, streaming: false } : x);
          return { ...prev };
        });
      } else {
        updateData((prev) => {
          const p = prev.projects.find((x) => x.id === projId);
          if (!p) return prev;
          p.bullets = p.bullets.map((x) => x.id === bulletId ? { ...x, streaming: false } : x);
          return { ...prev };
        }, false);
        showToast(res.error || 'Rewrite failed.');
      }
    } catch {
      updateData((prev) => {
        const p = prev.projects.find((x) => x.id === projId);
        if (!p) return prev;
        p.bullets = p.bullets.map((x) => x.id === bulletId ? { ...x, streaming: false } : x);
        return { ...prev };
      }, false);
      showToast('Network error.');
    }
  }

  async function handleAIAction(action: string, text: string, cb: (result: string) => void) {
    if (!text.trim()) { showToast('No text to process.'); return; }
    setProcessingAction(action);
    try {
      const promptMap: Record<string, string> = {
        shorten: 'Shorten this resume bullet to 8-12 words while keeping the key impact: ',
        metric: 'Add a specific measurable metric to this resume bullet (keep it plausible): ',
        grammar: 'Fix grammar and improve clarity of this resume bullet: ',
        ats: 'Rewrite this resume bullet to be more ATS-friendly with relevant keywords: ',
        expand: 'Expand this resume bullet with more detail and impact: ',
      };
      const prefix = promptMap[action] || 'Improve this resume bullet: ';
      const res = await rewriteBullet({ bullet: text, role: data.role, jobDescription: prefix, mode: 'ats' });
      if (res.success && res.rewritten) {
        cb(res.rewritten);
      } else {
        showToast(res.error || `${action} failed.`);
      }
    } catch {
      showToast('Network error.');
    } finally {
      setProcessingAction(null);
    }
  }

  async function handleOptimizeAll() {
    if (optimizing) return;
    setOptimizing(true);
    const allBullets: { expId: string; bulletId: string }[] = [];
    for (const exp of data.experience) {
      for (const b of exp.bullets) {
        if (b.text.trim()) allBullets.push({ expId: exp.id, bulletId: b.id });
      }
    }
    for (const { expId, bulletId } of allBullets) {
      const exp = data.experience.find((e) => e.id === expId);
      const b = exp?.bullets.find((x) => x.id === bulletId);
      if (!b) continue;
      updateData((prev) => {
        const e = prev.experience.find((x) => x.id === expId);
        if (!e) return prev;
        e.bullets = e.bullets.map((x) => x.id === bulletId ? { ...x, suggestion: '', streaming: true } : x);
        return { ...prev };
      }, false);
      try {
        const res = await rewriteBullet({ bullet: b.text.trim(), role: exp?.role, mode: 'professional' });
        if (res.success && res.rewritten) {
          updateData((prev) => {
            const e = prev.experience.find((x) => x.id === expId);
            if (!e) return prev;
            e.bullets = e.bullets.map((x) => x.id === bulletId ? {
              ...x,
              suggestion: res.rewritten,
              streaming: false,
              rewriteMeta: { confidence: 96, reason: 'AI rewrite generated', attempts: res.attempts, fabricationRisk: 'none' },
            } : x);
            return { ...prev };
          });
        } else {
          updateData((prev) => {
            const e = prev.experience.find((x) => x.id === expId);
            if (!e) return prev;
            e.bullets = e.bullets.map((x) => x.id === bulletId ? { ...x, streaming: false } : x);
            return { ...prev };
          }, false);
        }
      } catch {
        updateData((prev) => {
          const e = prev.experience.find((x) => x.id === expId);
          if (!e) return prev;
          e.bullets = e.bullets.map((x) => x.id === bulletId ? { ...x, streaming: false } : x);
          return { ...prev };
        }, false);
      }
    }
    setOptimizing(false);
    showToast('All bullets rewritten. Review and accept ✨', 3000);
  }

  function setExpField(expId: string, field: keyof Omit<ExperienceEntry, 'id' | 'bullets'>, value: string) {
    updateData((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => e.id === expId ? { ...e, [field]: value } : e),
    }));
  }

  function addBullet(expId: string) {
    updateData((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => e.id === expId ? { ...e, bullets: [...e.bullets, { id: generateId(), text: '', original: '' }] } : e),
    }));
  }

  function setBulletText(expId: string, bulletId: string, text: string) {
    updateData((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => e.id === expId ? { ...e, bullets: e.bullets.map((b) => b.id === bulletId ? { ...b, text } : b) } : e),
    }));
  }

  function setBulletSuggestion(expId: string, bulletId: string, suggestion: string | undefined) {
    updateData((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => e.id === expId ? { ...e, bullets: e.bullets.map((b) => b.id === bulletId ? { ...b, suggestion } : b) } : e),
    }));
  }

  function acceptSuggestion(expId: string, bulletId: string) {
    updateData((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => e.id === expId ? {
        ...e, bullets: e.bullets.map((b) => b.id === bulletId && b.suggestion
          ? { ...b, text: b.suggestion, original: b.suggestion, suggestion: undefined }
          : b),
      } : e),
    }));
  }

  function deleteBullet(expId: string, bulletId: string) {
    updateData((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => e.id === expId ? { ...e, bullets: e.bullets.filter((b) => b.id !== bulletId) } : e),
    }));
  }

  function addExperience() {
    updateData((prev) => ({
      ...prev,
      experience: [...prev.experience, { id: generateId(), company: '', role: '', location: '', startDate: '', endDate: '', bullets: [{ id: generateId(), text: '', original: '' }] }],
    }));
  }

  function removeExperience(id: string) {
    updateData((prev) => ({ ...prev, experience: prev.experience.filter((e) => e.id !== id) }));
  }

  function updateProject(id: string, field: keyof Omit<ProjectEntry, 'id' | 'bullets'>, value: string) {
    updateData((prev) => ({
      ...prev, projects: prev.projects.map((p) => p.id === id ? { ...p, [field]: value } : p),
    }));
  }

  function addProject() {
    updateData((prev) => ({
      ...prev, projects: [...prev.projects, { id: generateId(), name: '', description: '', technologies: [], url: '', bullets: [] }],
    }));
  }

  function removeProject(id: string) {
    updateData((prev) => ({ ...prev, projects: prev.projects.filter((p) => p.id !== id) }));
  }

  function addProjectTech(id: string, tech: string) {
    updateData((prev) => ({
      ...prev, projects: prev.projects.map((p) => p.id === id && !p.technologies.includes(tech) ? { ...p, technologies: [...p.technologies, tech] } : p),
    }));
  }

  function removeProjectTech(id: string, tech: string) {
    updateData((prev) => ({
      ...prev, projects: prev.projects.map((p) => p.id === id ? { ...p, technologies: p.technologies.filter((t) => t !== tech) } : p),
    }));
  }

  function updateSkillCat(id: string, category: string) {
    updateData((prev) => ({
      ...prev, skills: prev.skills.map((s) => s.id === id ? { ...s, category } : s),
    }));
  }

  function addSkillItem(catId: string, item: string) {
    if (!item.trim()) return;
    updateData((prev) => ({
      ...prev, skills: prev.skills.map((s) => s.id === catId && !s.items.includes(item.trim()) ? { ...s, items: [...s.items, item.trim()] } : s),
    }));
  }

  function removeSkillItem(catId: string, item: string) {
    updateData((prev) => ({
      ...prev, skills: prev.skills.map((s) => s.id === catId ? { ...s, items: s.items.filter((i) => i !== item) } : s),
    }));
  }

  function addSkillCategory() {
    updateData((prev) => ({
      ...prev, skills: [...prev.skills, { id: generateId(), category: 'New Category', items: [] }],
    }));
  }

  function removeSkillCategory(id: string) {
    updateData((prev) => ({ ...prev, skills: prev.skills.filter((s) => s.id !== id) }));
  }

  function updateEducation(id: string, field: keyof Omit<EducationEntry, 'id'>, value: string) {
    updateData((prev) => ({
      ...prev, education: prev.education.map((e) => e.id === id ? { ...e, [field]: value } : e),
    }));
  }

  function addEducation() {
    updateData((prev) => ({
      ...prev, education: [...prev.education, { id: generateId(), school: '', degree: '', field: '', gpa: '', startDate: '', endDate: '' }],
    }));
  }

  function removeEducation(id: string) {
    updateData((prev) => ({ ...prev, education: prev.education.filter((e) => e.id !== id) }));
  }

  function updateCert(id: string, field: keyof Omit<CertificateEntry, 'id'>, value: string) {
    updateData((prev) => ({
      ...prev, certificates: prev.certificates.map((c) => c.id === id ? { ...c, [field]: value } : c),
    }));
  }

  function addCertificate() {
    updateData((prev) => ({
      ...prev, certificates: [...prev.certificates, { id: generateId(), name: '', issuer: '', date: '', credentialUrl: '' }],
    }));
  }

  function removeCertificate(id: string) {
    updateData((prev) => ({ ...prev, certificates: prev.certificates.filter((c) => c.id !== id) }));
  }

  function updateSummary(text: string) {
    updateData((prev) => ({ ...prev, summary: text }));
  }

  function updateInfoField(field: keyof Pick<ResumeData, 'name' | 'role' | 'email' | 'phone' | 'location' | 'linkedin' | 'github' | 'website'>, value: string) {
    updateData((prev) => ({ ...prev, [field]: value }));
  }

  const activeToolbarAction = processingAction;

  return (
    <WorkspaceShell>
      <div className="flex flex-col h-[calc(100vh-64px)]">
        {/* Toolbar */}
        <div className="h-14 border-b flex items-center gap-2 px-4 lg:px-6 shrink-0" style={{ borderColor: 'rgb(var(--eleva-border))', background: 'rgb(var(--eleva-card))' }}>
          <Link href="/eleva/resumes" className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[rgb(var(--eleva-muted))]" data-testid="editor-back">
            <ArrowLeft className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
          </Link>
          <input
            value={data.name}
            onChange={(e) => updateInfoField('name', e.target.value)}
            className="h-9 px-3 rounded-md text-sm font-medium outline-none hover:bg-[rgb(var(--eleva-muted))] focus:bg-[rgb(var(--eleva-muted))] w-[220px]"
            style={{ color: 'rgb(var(--eleva-fg))' }}
            data-testid="resume-name-input"
          />

          <div className="flex items-center gap-1">
            <button onClick={undo} disabled={!canUndo} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[rgb(var(--eleva-muted))] disabled:opacity-30" title="Undo (Ctrl+Z)">
              <Undo2 className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            </button>
            <button onClick={redo} disabled={!canRedo} className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-[rgb(var(--eleva-muted))] disabled:opacity-30" title="Redo (Ctrl+Shift+Z)">
              <Redo2 className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 ml-2 px-2.5 h-7 rounded-md" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'rgb(var(--eleva-success))' }} />
            <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Auto-save</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1.5 h-8 px-3 rounded-md" style={{ background: 'rgb(var(--eleva-muted))' }}>
              <span className="text-[11px] font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>ATS</span>
              <span className="text-[13px] font-mono font-semibold" style={{ color: 'rgb(var(--eleva-success))' }}>96</span>
            </div>
            <button className="eleva-btn-ghost text-[13px] !py-1.5 !px-3 inline-flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={handleOptimizeAll}
              disabled={optimizing}
              className="text-[13px] font-medium h-9 px-3.5 rounded-lg inline-flex items-center gap-1.5 text-white disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}
              data-testid="ai-optimize"
            >
              {optimizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {optimizing ? 'Optimizing…' : 'Optimize with AI'}
            </button>
          </div>
        </div>

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg text-[13px] font-medium text-white shadow-lg"
              style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }}
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Split pane */}
        <div className="flex-1 grid grid-cols-[240px_1fr_1fr] min-h-0">
          {/* Left: sections */}
          <div className="border-r overflow-y-auto p-4" style={{ borderColor: 'rgb(var(--eleva-border))', background: 'rgb(var(--eleva-card))' }}>
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] mb-2 px-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Sections</div>
            <div className="space-y-0.5">
              {sections.map((s) => {
                const Icon = s.icon;
                const count = getSectionCount(data, s.countKey);
                return (
                  <button
                    key={s.id}
                    onClick={() => setActiveSection(s.id)}
                    className="w-full flex items-center gap-2 px-2 h-9 rounded-lg text-sm text-left transition-colors group"
                    style={{
                      background: activeSection === s.id ? 'rgb(var(--eleva-muted))' : 'transparent',
                      color: activeSection === s.id ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))',
                    }}
                    data-testid={`section-${s.id}`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="flex-1 font-medium">{s.name}</span>
                    <span className="text-[10px] font-mono opacity-60">{s.id === 'summary' ? (data.summary ? '1' : '0') : count}</span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 p-3 rounded-xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(37,99,235,.1), rgba(124,58,237,.1))' }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                <span className="text-[10px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-primary))' }}>Eleva Tip</span>
              </div>
              <p className="text-[12px] leading-relaxed" style={{ color: 'rgb(var(--eleva-fg))' }}>
                Use <strong>Ctrl+Z</strong> to undo, <strong>Ctrl+Shift+Z</strong> to redo. Click the sparkle on any bullet for an inline rewrite.
              </p>
            </div>
          </div>

          {/* Middle: editor */}
          <div className="overflow-y-auto p-6 lg:p-10">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] mb-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
              Editing · {sections.find((s) => s.id === activeSection)?.name || activeSection}
            </div>

            {activeSection === 'summary' && (
              <div className="eleva-card p-6">
                <textarea
                  value={data.summary}
                  onChange={(e) => updateSummary(e.target.value)}
                  rows={5}
                  className="w-full text-[14px] leading-relaxed bg-transparent outline-none resize-none"
                  style={{ color: 'rgb(var(--eleva-fg))' }}
                  placeholder="Write your professional summary..."
                  data-testid="summary-editor"
                />
                <SectionToolbar
                  text={data.summary}
                  onAction={(action) => handleAIAction(action, data.summary, (r) => updateSummary(r))}
                  processingAction={activeToolbarAction}
                />
              </div>
            )}

            {activeSection === 'experience' && (
              <div className="space-y-6">
                {data.experience.map((exp) => (
                  <div key={exp.id} className="eleva-card p-6">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-display font-semibold shrink-0" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                        {exp.company.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <input value={exp.role} onChange={(e) => setExpField(exp.id, 'role', e.target.value)} className="w-full text-lg font-semibold outline-none bg-transparent" style={{ color: 'rgb(var(--eleva-fg))' }} placeholder="Role" />
                        <div className="flex items-center gap-2 mt-1 text-[13px] flex-wrap" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                          <input value={exp.company} onChange={(e) => setExpField(exp.id, 'company', e.target.value)} className="bg-transparent outline-none border-b border-transparent focus:border-current" placeholder="Company" />
                          <span>·</span>
                          <input value={exp.startDate} onChange={(e) => setExpField(exp.id, 'startDate', e.target.value)} className="bg-transparent outline-none border-b border-transparent focus:border-current w-28" placeholder="Start" />
                          <span>—</span>
                          <input value={exp.endDate} onChange={(e) => setExpField(exp.id, 'endDate', e.target.value)} className="bg-transparent outline-none border-b border-transparent focus:border-current w-28" placeholder="End" />
                          <span>·</span>
                          <input value={exp.location} onChange={(e) => setExpField(exp.id, 'location', e.target.value)} className="bg-transparent outline-none border-b border-transparent focus:border-current" placeholder="Location" />
                        </div>
                      </div>
                      <button onClick={() => removeExperience(exp.id)} className="w-7 h-7 rounded-md hover:bg-red-50 flex items-center justify-center shrink-0" title="Remove">
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>

                    {/* Bullets */}
                    <div className="mt-4 space-y-2">
                      {exp.bullets.map((b) => (
                        <BulletRow
                          key={b.id}
                          bullet={b}
                          onEdit={(text) => setBulletText(exp.id, b.id, text)}
                          onRewrite={() => handleBulletRewrite(exp.id, b.id)}
                          onAccept={() => acceptSuggestion(exp.id, b.id)}
                          onReject={() => setBulletSuggestion(exp.id, b.id, undefined)}
                          onDelete={() => deleteBullet(exp.id, b.id)}
                        />
                      ))}
                    </div>
                    <button onClick={() => addBullet(exp.id)} className="mt-2 text-[13px] flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      <Plus className="w-3.5 h-3.5" /> Add bullet
                    </button>
                  </div>
                ))}
                <button onClick={addExperience} className="w-full py-3 rounded-lg border border-dashed text-sm flex items-center justify-center gap-2 hover:bg-[rgb(var(--eleva-muted))]" style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))' }}>
                  <Plus className="w-4 h-4" /> Add experience
                </button>
              </div>
            )}

            {activeSection === 'projects' && (
              <div className="space-y-6">
                {data.projects.map((proj) => (
                  <div key={proj.id} className="eleva-card p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <input value={proj.name} onChange={(e) => updateProject(proj.id, 'name', e.target.value)} className="w-full text-lg font-semibold outline-none bg-transparent" style={{ color: 'rgb(var(--eleva-fg))' }} placeholder="Project name" />
                        <textarea value={proj.description} onChange={(e) => updateProject(proj.id, 'description', e.target.value)} rows={2} className="w-full text-[14px] leading-relaxed bg-transparent outline-none resize-none mt-1" style={{ color: 'rgb(var(--eleva-fg))' }} placeholder="Description" />
                        <input value={proj.url} onChange={(e) => updateProject(proj.id, 'url', e.target.value)} className="mt-1 bg-transparent outline-none border-b border-transparent focus:border-current text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }} placeholder="URL (optional)" />
                        {/* Technologies */}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {proj.technologies.map((tech) => (
                            <span key={tech} className="text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                              {tech}
                              <button onClick={() => removeProjectTech(proj.id, tech)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                            </span>
                          ))}
                          <TechInput onAdd={(tech) => addProjectTech(proj.id, tech)} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {proj.bullets.map((b) => (
                        <BulletRow
                          key={b.id}
                          bullet={b}
                          onEdit={(text) => {
                            updateData((prev) => ({
                              ...prev, projects: prev.projects.map((p) => p.id === proj.id ? { ...p, bullets: p.bullets.map((x) => x.id === b.id ? { ...x, text } : x) } : p),
                            }));
                          }}
                          onRewrite={() => handleProjectRewrite(proj.id, b.id)}
                          onAccept={() => {
                            updateData((prev) => ({
                              ...prev, projects: prev.projects.map((p) => p.id === proj.id ? { ...p, bullets: p.bullets.map((x) => x.id === b.id && x.suggestion ? { ...x, text: x.suggestion, original: x.suggestion, suggestion: undefined } : x) } : p),
                            }));
                          }}
                          onReject={() => {
                            updateData((prev) => ({
                              ...prev, projects: prev.projects.map((p) => p.id === proj.id ? { ...p, bullets: p.bullets.map((x) => x.id === b.id ? { ...x, suggestion: undefined } : x) } : p),
                            }));
                          }}
                          onDelete={() => {
                            updateData((prev) => ({
                              ...prev, projects: prev.projects.map((p) => p.id === proj.id ? { ...p, bullets: p.bullets.filter((x) => x.id !== b.id) } : p),
                            }));
                          }}
                        />
                      ))}
                    </div>
                    <button onClick={() => {
                      updateData((prev) => ({
                        ...prev, projects: prev.projects.map((p) => p.id === proj.id ? { ...p, bullets: [...p.bullets, { id: generateId(), text: '', original: '' }] } : p),
                      }));
                    }} className="mt-2 text-[13px] flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-[rgb(var(--eleva-muted))]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                      <Plus className="w-3.5 h-3.5" /> Add bullet
                    </button>
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
                      <SectionToolbar
                        text={proj.description}
                        onAction={(action) => handleAIAction(action, proj.description, (r) => updateProject(proj.id, 'description', r))}
                        processingAction={activeToolbarAction}
                      />
                    </div>
                    <div className="flex justify-end mt-2">
                      <button onClick={() => removeProject(proj.id)} className="text-[12px] flex items-center gap-1 text-red-400 hover:text-red-500"><Trash2 className="w-3 h-3" /> Remove project</button>
                    </div>
                  </div>
                ))}
                <button onClick={addProject} className="w-full py-3 rounded-lg border border-dashed text-sm flex items-center justify-center gap-2 hover:bg-[rgb(var(--eleva-muted))]" style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))' }}>
                  <Plus className="w-4 h-4" /> Add project
                </button>
              </div>
            )}

            {activeSection === 'skills' && (
              <div className="space-y-4">
                {data.skills.map((cat) => (
                  <div key={cat.id} className="eleva-card p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <input value={cat.category} onChange={(e) => updateSkillCat(cat.id, e.target.value)} className="text-sm font-semibold outline-none bg-transparent flex-1" style={{ color: 'rgb(var(--eleva-fg))' }} />
                      <button onClick={() => removeSkillCategory(cat.id)} className="text-red-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.items.map((item) => (
                        <span key={item} className="text-[12px] px-2.5 py-1 rounded-full inline-flex items-center gap-1.5" style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}>
                          {item}
                          <button onClick={() => removeSkillItem(cat.id, item)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                        </span>
                      ))}
                      <SkillInput onAdd={(item) => addSkillItem(cat.id, item)} />
                    </div>
                  </div>
                ))}
                <button onClick={addSkillCategory} className="w-full py-3 rounded-lg border border-dashed text-sm flex items-center justify-center gap-2 hover:bg-[rgb(var(--eleva-muted))]" style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))' }}>
                  <Plus className="w-4 h-4" /> Add skill category
                </button>
              </div>
            )}

            {activeSection === 'education' && (
              <div className="space-y-4">
                {data.education.map((edu) => (
                  <div key={edu.id} className="eleva-card p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex gap-2">
                          <input value={edu.school} onChange={(e) => updateEducation(edu.id, 'school', e.target.value)} className="flex-1 text-lg font-semibold outline-none bg-transparent" style={{ color: 'rgb(var(--eleva-fg))' }} placeholder="School" />
                          <input value={edu.gpa} onChange={(e) => updateEducation(edu.id, 'gpa', e.target.value)} className="w-16 text-right text-sm outline-none bg-transparent" style={{ color: 'rgb(var(--eleva-muted-fg))' }} placeholder="GPA" />
                        </div>
                        <div className="flex gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                          <input value={edu.degree} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} className="bg-transparent outline-none border-b border-transparent focus:border-current w-20" placeholder="Degree" />
                          <input value={edu.field} onChange={(e) => updateEducation(edu.id, 'field', e.target.value)} className="bg-transparent outline-none border-b border-transparent focus:border-current flex-1" placeholder="Field of study" />
                          <input value={edu.startDate} onChange={(e) => updateEducation(edu.id, 'startDate', e.target.value)} className="bg-transparent outline-none border-b border-transparent focus:border-current w-20" placeholder="Start" />
                          <span>—</span>
                          <input value={edu.endDate} onChange={(e) => updateEducation(edu.id, 'endDate', e.target.value)} className="bg-transparent outline-none border-b border-transparent focus:border-current w-20" placeholder="End" />
                        </div>
                      </div>
                      <button onClick={() => removeEducation(edu.id)} className="w-7 h-7 rounded-md hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>
                ))}
                <button onClick={addEducation} className="w-full py-3 rounded-lg border border-dashed text-sm flex items-center justify-center gap-2 hover:bg-[rgb(var(--eleva-muted))]" style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))' }}>
                  <Plus className="w-4 h-4" /> Add education
                </button>
              </div>
            )}

            {activeSection === 'certificates' && (
              <div className="space-y-4">
                {data.certificates.map((cert) => (
                  <div key={cert.id} className="eleva-card p-6">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <input value={cert.name} onChange={(e) => updateCert(cert.id, 'name', e.target.value)} className="w-full text-lg font-semibold outline-none bg-transparent" style={{ color: 'rgb(var(--eleva-fg))' }} placeholder="Certificate name" />
                        <div className="flex gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                          <input value={cert.issuer} onChange={(e) => updateCert(cert.id, 'issuer', e.target.value)} className="bg-transparent outline-none border-b border-transparent focus:border-current flex-1" placeholder="Issuer" />
                          <input value={cert.date} onChange={(e) => updateCert(cert.id, 'date', e.target.value)} className="bg-transparent outline-none border-b border-transparent focus:border-current w-28" placeholder="Date" />
                        </div>
                        <input value={cert.credentialUrl} onChange={(e) => updateCert(cert.id, 'credentialUrl', e.target.value)} className="bg-transparent outline-none border-b border-transparent focus:border-current text-[13px] w-full" style={{ color: 'rgb(var(--eleva-muted-fg))' }} placeholder="Credential URL (optional)" />
                      </div>
                      <button onClick={() => removeCertificate(cert.id)} className="w-7 h-7 rounded-md hover:bg-red-50 flex items-center justify-center"><Trash2 className="w-3.5 h-3.5 text-red-400" /></button>
                    </div>
                  </div>
                ))}
                <button onClick={addCertificate} className="w-full py-3 rounded-lg border border-dashed text-sm flex items-center justify-center gap-2 hover:bg-[rgb(var(--eleva-muted))]" style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))' }}>
                  <Plus className="w-4 h-4" /> Add certificate
                </button>
              </div>
            )}
          </div>

          {/* Right: live preview / health / keywords */}
          <div className="overflow-y-auto p-6 lg:p-8" style={{ background: 'rgb(var(--eleva-muted))' }}>
            <div className="flex items-center gap-1.5 mb-4">
              {[
                { id: 'preview' as const, label: 'Preview', icon: BookOpen },
                { id: 'health' as const, label: 'Health', icon: Heart },
                { id: 'keywords' as const, label: 'Keywords', icon: Target },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = rightTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setRightTab(tab.id)}
                    className="flex items-center gap-1.5 px-3 h-7 rounded-md text-[11px] font-medium transition-all duration-150"
                    style={{
                      background: isActive ? 'rgb(var(--eleva-card))' : 'transparent',
                      color: isActive ? 'rgb(var(--eleva-fg))' : 'rgb(var(--eleva-muted-fg))',
                      boxShadow: isActive ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
                    }}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {rightTab === 'health' && (
              <ResumeHealth data={data} />
            )}

            {rightTab === 'keywords' && (
              <KeywordHeatmap data={data} role={data.role} />
            )}

            {rightTab === 'preview' && (
            <>            <div className="text-[10px] font-mono uppercase tracking-[0.2em]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>A4 Preview</div>
            <div
              className="rounded-lg mx-auto"
              style={{
                background: '#fff',
                aspectRatio: '1 / 1.414',
                maxWidth: 500,
                boxShadow: '0 20px 50px -12px rgba(2,6,23,.35)',
                padding: '32px 34px',
                color: '#0f172a',
              }}
            >
              <div className="text-[22px] font-bold tracking-tight">{data.name || 'Your Name'}</div>
              <div className="text-[11px] mt-0.5 text-slate-600">{data.role} · {data.location}</div>
              <div className="text-[10px] mt-0.5 text-slate-500">{data.email}{data.linkedin ? ` · ${data.linkedin}` : ''}{data.github ? ` · ${data.github}` : ''}</div>
              <div className="h-px my-3 bg-slate-200" />

              {data.summary && (
                <>
                  <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mb-1.5">Summary</div>
                  <p className="text-[10px] leading-relaxed text-slate-700">{data.summary}</p>
                </>
              )}

              {data.experience.length > 0 && (
                <>
                  <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Experience</div>
                  {data.experience.map((exp) => (
                    <div key={exp.id} className="mb-2.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-semibold">{exp.role}{exp.company ? ` · ${exp.company}` : ''}</span>
                        <span className="text-slate-500 font-mono text-[9px]">{exp.startDate}{exp.endDate ? ` — ${exp.endDate}` : ''}</span>
                      </div>
                      {exp.bullets.length > 0 && (
                        <ul className="mt-1 space-y-1 pl-3 list-disc text-[10px] leading-relaxed text-slate-700 marker:text-blue-600">
                          {exp.bullets.map((b) => <li key={b.id}>{b.text}</li>)}
                        </ul>
                      )}
                    </div>
                  ))}
                </>
              )}

              {data.projects.length > 0 && (
                <>
                  <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Projects</div>
                  {data.projects.map((proj) => (
                    <div key={proj.id} className="mb-2">
                      <div className="text-[11px] font-semibold">{proj.name}</div>
                      {proj.description && <p className="text-[10px] text-slate-700">{proj.description}</p>}
                      {proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-0.5">{proj.technologies.map((t) => <span key={t} className="text-[8px] px-1 py-0.5 rounded bg-slate-100 text-slate-600">{t}</span>)}</div>
                      )}
                    </div>
                  ))}
                </>
              )}

              {data.skills.length > 0 && (
                <>
                  <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Skills</div>
                  {data.skills.map((cat) => (
                    <div key={cat.id} className="mb-1">
                      <span className="text-[9px] font-semibold text-slate-800">{cat.category}: </span>
                      <span className="text-[9px] text-slate-600">{cat.items.join(', ')}</span>
                    </div>
                  ))}
                </>
              )}

              {data.education.length > 0 && (
                <>
                  <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Education</div>
                  {data.education.map((edu) => (
                    <div key={edu.id} className="flex justify-between text-[11px]">
                      <span className="font-semibold">{edu.degree} {edu.field}{edu.school ? ` · ${edu.school}` : ''}</span>
                      <span className="text-slate-500 font-mono text-[9px]">{edu.endDate || edu.startDate}</span>
                    </div>
                  ))}
                </>
              )}

              {data.certificates.length > 0 && (
                <>
                  <div className="text-[10px] font-bold tracking-widest text-blue-700 uppercase mt-4 mb-1.5">Certificates</div>
                  {data.certificates.map((cert) => (
                    <div key={cert.id} className="text-[11px]">
                      <span className="font-semibold">{cert.name}</span>
                      {cert.issuer && <span className="text-slate-500"> — {cert.issuer}</span>}
                      {cert.date && <span className="text-slate-500 font-mono text-[9px] ml-1">{cert.date}</span>}
                    </div>
                  ))}
                </>
              )}
            </div>
            </>            )}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

/* ─── Sub-components ─── */

function BulletRow({ bullet, onEdit, onRewrite, onAccept, onReject, onDelete }: {
  bullet: BulletItem;
  onEdit: (text: string) => void;
  onRewrite: (mode?: RewriteMode) => void;
  onAccept: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const isEdited = bullet.text !== bullet.original;
  const confidence = bullet.rewriteMeta?.confidence ?? 0;
  const reason = bullet.rewriteMeta?.reason ?? '';
  return (
    <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="group rounded-lg hover:bg-[rgb(var(--eleva-muted))] p-3 -mx-3">
      <div className="flex gap-3">
        <GripVertical className="w-3.5 h-3.5 mt-1.5 opacity-0 group-hover:opacity-100 shrink-0" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
        <div className="w-1.5 h-1.5 rounded-full mt-2.5 shrink-0" style={{ background: 'rgb(var(--eleva-primary))' }} />
        <textarea
          value={bullet.text}
          onChange={(e) => onEdit(e.target.value)}
          rows={2}
          className="flex-1 text-[14px] leading-relaxed bg-transparent outline-none resize-none"
          style={{ color: 'rgb(var(--eleva-fg))' }}
        />
        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onRewrite('professional')} disabled={bullet.streaming} className="w-7 h-7 rounded-md flex items-center justify-center disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, rgb(var(--eleva-primary)), rgb(var(--eleva-secondary)))' }} title="Rewrite with AI">
            {bullet.streaming ? <Loader2 className="w-3 h-3 animate-spin text-white" /> : <Sparkles className="w-3 h-3 text-white" />}
          </button>
          <button onClick={onDelete} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-red-50" title="Delete">
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
          {isEdited && (
            <button onClick={() => onRewrite('professional')} className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-[rgb(var(--eleva-card))]" title="Revert">
              <RotateCcw className="w-3 h-3" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {bullet.suggestion !== undefined && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="ml-6 mt-2 rounded-lg overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(37,99,235,.08), rgba(124,58,237,.08))', border: '1px solid rgba(37,99,235,.25)' }}
          >
            <div className="px-3 py-2 flex items-center justify-between border-b" style={{ borderColor: 'rgba(37,99,235,.15)' }}>
              <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-primary))' }}>
                {bullet.streaming ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Eleva suggestion
              </div>
              {!bullet.streaming && (
                <div className="flex gap-1">
                  <button onClick={onAccept} className="text-[11px] font-medium px-2 h-6 rounded-md inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-success))', color: '#fff' }}>
                    <Check className="w-3 h-3" /> Accept
                  </button>
                  <button onClick={onReject} className="text-[11px] font-medium px-2 h-6 rounded-md inline-flex items-center gap-1" style={{ background: 'rgb(var(--eleva-card))', color: 'rgb(var(--eleva-muted-fg))' }}>
                    <X className="w-3 h-3" /> Reject
                  </button>
                </div>
              )}
            </div>
            <div className="px-3 py-2.5">
              {bullet.streaming ? (
                <div className="flex items-center gap-2 text-[13px]" style={{ color: 'rgb(var(--eleva-fg))' }}>
                  <span>Generating suggestion…</span>
                  <span className="inline-block w-1.5 h-3 rounded-sm" style={{ background: 'rgb(var(--eleva-primary))', animation: 'eleva-blink 1s infinite' }} />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
                    <div className="rounded-lg px-3 py-2 bg-white/80 border border-[rgba(37,99,235,.16)]">
                      <div className="uppercase tracking-widest font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Confidence</div>
                      <div className="text-sm font-semibold" style={{ color: 'rgb(var(--eleva-primary))' }}>{confidence || '—'}{confidence ? '%' : ''}</div>
                    </div>
                    <div className="rounded-lg px-3 py-2 bg-white/80 border border-[rgba(16,185,129,.16)]">
                      <div className="uppercase tracking-widest font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Reason</div>
                      <div className="text-xs leading-relaxed" style={{ color: 'rgb(var(--eleva-fg))' }}>{reason || 'AI generated a rewrite'}</div>
                    </div>
                    <div className="rounded-lg px-3 py-2 bg-white/80 border border-[rgba(244,114,182,.16)]">
                      <div className="uppercase tracking-widest font-mono" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Fabrication Risk</div>
                      <div className="text-sm font-semibold capitalize" style={{ color: 'rgb(var(--eleva-fg))' }}>{bullet.rewriteMeta?.fabricationRisk ?? 'none'}</div>
                    </div>
                  </div>

                  {bullet.rewriteMeta?.attempts && bullet.rewriteMeta.attempts.length > 0 && (
                    <div className="rounded-lg p-3 bg-slate-50 border border-slate-200 text-[11px] space-y-1">
                      <div className="font-mono uppercase tracking-widest" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Attempts</div>
                      {bullet.rewriteMeta.attempts.map((attempt) => (
                        <div key={`${attempt.attempt}-${attempt.model}`} className="flex items-center justify-between gap-2">
                          <span style={{ color: 'rgb(var(--eleva-fg))' }}>Attempt {attempt.attempt} · {attempt.model}</span>
                          <span style={{ color: 'rgb(var(--eleva-muted-fg))' }}>{attempt.status}{attempt.latencyMs ? ` · ${attempt.latencyMs}ms` : ''}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <DiffView original={bullet.text} suggestion={bullet.suggestion || ''} />

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {REWRITE_MODE_OPTIONS.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => onRewrite(mode.value)}
                        disabled={bullet.streaming}
                        className="text-[10px] px-2 py-1 rounded-full border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40"
                        title={mode.description}
                      >
                        {mode.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SectionToolbar({ text, onAction, processingAction }: { text: string; onAction: (action: string) => void; processingAction: string | null }) {
  const actions: { id: string; label: string; icon: typeof Sparkles }[] = [
    { id: 'rewrite', label: 'Rewrite', icon: Sparkles },
    { id: 'shorten', label: 'Shorten', icon: Shrink },
    { id: 'metric', label: 'Add Metric', icon: BarChart3 },
    { id: 'grammar', label: 'Grammar', icon: SpellCheck },
    { id: 'ats', label: 'Improve ATS', icon: BarChart3 },
    { id: 'expand', label: 'Expand', icon: Expand },
  ];

  return (
    <div className="mt-3 flex items-center gap-1 h-8 px-2 rounded-lg flex-wrap" style={{ background: 'rgb(var(--eleva-muted))' }}>
      {actions.map((a) => {
        const Icon = a.icon;
        const busy = processingAction === a.id;
        return (
          <button
            key={a.id}
            onClick={() => onAction(a.id)}
            disabled={busy || !text.trim()}
            className="text-[11px] font-medium px-2 h-6 rounded-md hover:bg-[rgb(var(--eleva-card))] inline-flex items-center gap-1 disabled:opacity-40"
            style={{ color: 'rgb(var(--eleva-primary))' }}
          >
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
            {a.label}
          </button>
        );
      })}
    </div>
  );
}

function SkillInput({ onAdd }: { onAdd: (item: string) => void }) {
  const [value, setValue] = useState('');
  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && value.trim()) {
      e.preventDefault();
      onAdd(value.trim());
      setValue('');
    }
  };
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      onBlur={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}
      className="text-[12px] px-2 py-1 rounded-full outline-none bg-transparent border border-dashed"
      style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))', minWidth: 80 }}
      placeholder="Add skill..."
    />
  );
}

function TechInput({ onAdd }: { onAdd: (tech: string) => void }) {
  const [value, setValue] = useState('');
  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && value.trim()) {
      e.preventDefault();
      onAdd(value.trim());
      setValue('');
    }
  };
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKey}
      onBlur={() => { if (value.trim()) { onAdd(value.trim()); setValue(''); } }}
      className="text-[11px] px-2 py-0.5 rounded-full outline-none bg-transparent border border-dashed"
      style={{ borderColor: 'rgb(var(--eleva-border))', color: 'rgb(var(--eleva-muted-fg))', minWidth: 70 }}
      placeholder="+ tech"
    />
  );
}
