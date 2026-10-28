'use client';

/**
 * Editor state + business logic, extracted from page.tsx so it can be unit
 * tested in isolation. The page component consumes this hook and stays a
 * pure view layer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { rewriteBullet } from '@/app/eleva/_lib/eleva-client';
import type { RewriteMode } from '@/app/eleva/api/tool/rewrite/rewrite-utils';
import { initialResume, generateId, type SectionId, type ResumeData, type HistorySnapshot, type ExperienceEntry, type ProjectEntry, type EducationEntry, type CertificateEntry } from './resume-editor-state';
export * from './resume-editor-state';

export function useResumeEditor() {
  const [data, setData] = useState<ResumeData>(initialResume);
  const [activeSection, setActiveSection] = useState<SectionId>('experience');
  const [toast, setToast] = useState<string | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [processingAction, setProcessingAction] = useState<string | null>(null);

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
              confidence: res.attempts?.some((a) => a.status === 'success') ? 96 : 80,
              reason: res.attempts?.some((a) => a.status === 'fallback') ? 'Used safe local fallback rewrite' : 'AI rewrite generated',
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

  return {
    // data + selection
    data,
    activeSection,
    setActiveSection,
    // history
    updateData,
    undo,
    redo,
    canUndo,
    canRedo,
    // transient UI state
    toast,
    showToast,
    optimizing,
    processingAction,
    // async AI actions
    handleBulletRewrite,
    handleProjectRewrite,
    handleAIAction,
    handleOptimizeAll,
    // experience mutators
    setExpField,
    addBullet,
    setBulletText,
    setBulletSuggestion,
    acceptSuggestion,
    deleteBullet,
    addExperience,
    removeExperience,
    // projects
    updateProject,
    addProject,
    removeProject,
    addProjectTech,
    removeProjectTech,
    // skills
    updateSkillCat,
    addSkillItem,
    removeSkillItem,
    addSkillCategory,
    removeSkillCategory,
    // education
    updateEducation,
    addEducation,
    removeEducation,
    // certificates
    updateCert,
    addCertificate,
    removeCertificate,
    // summary + info header
    updateSummary,
    updateInfoField,
  };
}

export type ResumeEditor = ReturnType<typeof useResumeEditor>;
