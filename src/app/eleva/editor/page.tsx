'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  Undo2, Redo2, Download, Sparkles, ChevronDown, Loader2,
  Plus, ArrowLeft, X,
  Trash2, GraduationCap, Briefcase, Code2, Wrench,
  BookOpen, Award,
  Heart, Target,
} from 'lucide-react';
import Link from 'next/link';
import { WorkspaceShell } from '../_components/workspace-shell';
import { BulletRow } from './_components/bullet-row';
import { ResumeHealth } from './_components/resume-health';
import { KeywordHeatmap } from './_components/keyword-heatmap';
import { ResumePreview } from './_components/resume-preview';
import { SectionToolbar, SkillInput, TechInput } from './_components/editor-form-controls';
import {
  generateId,
  getSectionCount,
  useResumeEditor,
  type ResumeData,
  type SectionId,
} from './_lib/use-resume-editor';

const sections: { id: SectionId; name: string; icon: typeof Briefcase; countKey: keyof ResumeData }[] = [
  { id: 'summary', name: 'Summary', icon: BookOpen, countKey: 'summary' },
  { id: 'experience', name: 'Experience', icon: Briefcase, countKey: 'experience' },
  { id: 'projects', name: 'Projects', icon: Code2, countKey: 'projects' },
  { id: 'skills', name: 'Skills', icon: Wrench, countKey: 'skills' },
  { id: 'education', name: 'Education', icon: GraduationCap, countKey: 'education' },
  { id: 'certificates', name: 'Certificates', icon: Award, countKey: 'certificates' },
];


export default function EditorPage() {
  const {
    data,
    activeSection,
    setActiveSection,
    updateData,
    undo,
    redo,
    canUndo,
    canRedo,
    toast,
    optimizing,
    processingAction,
    handleBulletRewrite,
    handleProjectRewrite,
    handleAIAction,
    handleOptimizeAll,
    setExpField,
    addBullet,
    setBulletText,
    setBulletSuggestion,
    acceptSuggestion,
    deleteBullet,
    addExperience,
    removeExperience,
    updateProject,
    addProject,
    removeProject,
    addProjectTech,
    removeProjectTech,
    updateSkillCat,
    addSkillItem,
    removeSkillItem,
    addSkillCategory,
    removeSkillCategory,
    updateEducation,
    addEducation,
    removeEducation,
    updateCert,
    addCertificate,
    removeCertificate,
    updateSummary,
    updateInfoField,
  } = useResumeEditor();

  const [rightTab, setRightTab] = useState<'preview' | 'health' | 'keywords'>('preview');

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
              <ResumePreview data={data} />
            )}
          </div>
        </div>
      </div>
    </WorkspaceShell>
  );
}

