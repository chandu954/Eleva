'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, FileText, Sparkles, Copy, Check, X, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

const TEMPLATES: PromptTemplate[] = [
  {
    id: 'ats-optimized',
    name: 'ATS Optimized',
    description: 'Maximum ATS parser compatibility with keyword optimization',
    category: 'Resume',
    tags: ['ats', 'keywords', 'formatting'],
    systemPrompt: `You are Eleva AI, an ATS optimization expert.

## LOCKED RULES
- Use standard section headings only (Summary, Experience, Education, Skills, Projects).
- No tables, columns, graphics, or special characters.
- Include keywords naturally from the job description.
- Use strong action verbs and quantifiable achievements.
- Output in clean markdown format.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.3,
    maxTokens: 4096,
  },
  {
    id: 'recruiter-friendly',
    name: 'Recruiter Friendly',
    description: 'Human-readable format that recruiters love to scan',
    category: 'Resume',
    tags: ['recruiter', 'readable', 'engaging'],
    systemPrompt: `You are Eleva AI, a resume writing expert focused on recruiter-friendly content.

## LOCKED RULES
- Write compelling, narrative-driven bullet points.
- Focus on impact and results, not just duties.
- Use a confident, professional tone.
- Keep paragraphs concise and scannable.
- Highlight career progression and growth.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.6,
    maxTokens: 4096,
  },
  {
    id: 'faang-resume',
    name: 'FAANG Resume',
    description: 'Optimized for top-tier tech company applications',
    category: 'Resume',
    tags: ['faang', 'tech', 'senior'],
    systemPrompt: `You are Eleva AI, a resume specialist for FAANG-level applications.

## LOCKED RULES
- Emphasize system design, scale, and technical leadership.
- Quantify impact with metrics (latency, throughput, reliability).
- Highlight cross-functional collaboration and mentoring.
- Use STAR format for all bullet points.
- Include specific technologies and architectures.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.4,
    maxTokens: 4096,
  },
  {
    id: 'startup-resume',
    name: 'Startup Resume',
    description: 'Highlights versatility, ownership, and impact',
    category: 'Resume',
    tags: ['startup', 'generalist', 'ownership'],
    systemPrompt: `You are Eleva AI, a resume writer for startup environments.

## LOCKED RULES
- Emphasize ownership, initiative, and versatility.
- Highlight full-stack capabilities and rapid iteration.
- Show impact with limited resources and tight deadlines.
- Mention specific technologies and tools used.
- Demonstrate adaptability across multiple domains.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.5,
    maxTokens: 4096,
  },
  {
    id: 'backend-engineer',
    name: 'Backend Engineer',
    description: 'Tailored for backend and infrastructure roles',
    category: 'Resume',
    tags: ['backend', 'infrastructure', 'engineering'],
    systemPrompt: `You are Eleva AI, a technical resume writer for backend engineers.

## LOCKED RULES
- Focus on system architecture, APIs, and data pipelines.
- Highlight performance optimization and scalability.
- Include specific technologies (languages, databases, cloud).
- Emphasize reliability, monitoring, and incident response.
- Quantify improvements in latency, throughput, and uptime.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.4,
    maxTokens: 4096,
  },
  {
    id: 'frontend-engineer',
    name: 'Frontend Engineer',
    description: 'Tailored for frontend and UI engineering roles',
    category: 'Resume',
    tags: ['frontend', 'ui', 'engineering'],
    systemPrompt: `You are Eleva AI, a technical resume writer for frontend engineers.

## LOCKED RULES
- Focus on UI architecture, component systems, and performance.
- Highlight accessibility, responsive design, and browser optimization.
- Include specific frameworks, tools, and testing approaches.
- Emphasize user experience improvements and metrics.
- Showcase design system contributions and micro-frontends.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.4,
    maxTokens: 4096,
  },
  {
    id: 'ai-engineer',
    name: 'AI Engineer',
    description: 'Optimized for ML/AI engineering positions',
    category: 'Resume',
    tags: ['ai', 'ml', 'engineering'],
    systemPrompt: `You are Eleva AI, a resume writer for AI/ML engineering roles.

## LOCKED RULES
- Focus on model architecture, training pipelines, and deployment.
- Highlight specific frameworks (PyTorch, TensorFlow, LangChain).
- Emphasize model performance metrics and improvements.
- Showcase production ML systems and MLOps practices.
- Include research contributions and publications.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.4,
    maxTokens: 4096,
  },
  {
    id: 'devops',
    name: 'DevOps / SRE',
    description: 'Tailored for DevOps, SRE, and platform engineering',
    category: 'Resume',
    tags: ['devops', 'sre', 'platform'],
    systemPrompt: `You are Eleva AI, a resume writer for DevOps and SRE roles.

## LOCKED RULES
- Focus on infrastructure as code, CI/CD, and automation.
- Highlight incident management and reliability improvements.
- Include specific cloud platforms and tools (AWS, K8s, Terraform).
- Emphasize cost optimization and resource efficiency.
- Showcase monitoring, observability, and alerting setups.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.4,
    maxTokens: 4096,
  },
  {
    id: 'product-manager',
    name: 'Product Manager',
    description: 'Optimized for product management applications',
    category: 'Resume',
    tags: ['pm', 'product', 'management'],
    systemPrompt: `You are Eleva AI, a resume writer for product management roles.

## LOCKED RULES
- Focus on product strategy, roadmap planning, and execution.
- Highlight stakeholder management and cross-team leadership.
- Emphasize data-driven decision making and A/B testing.
- Quantify business impact (revenue, retention, engagement).
- Showcase user research and product discovery processes.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.5,
    maxTokens: 4096,
  },
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Tailored for data analysis and BI roles',
    category: 'Resume',
    tags: ['data', 'analytics', 'bi'],
    systemPrompt: `You are Eleva AI, a resume writer for data analyst roles.

## LOCKED RULES
- Focus on data analysis, visualization, and insights delivery.
- Highlight SQL, Python, and BI tool proficiency.
- Emphasize impact on business decisions and revenue.
- Showcase dashboard creation and stakeholder communication.
- Include data quality and governance contributions.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.5,
    maxTokens: 4096,
  },
  {
    id: 'fresher',
    name: 'Fresher / Entry Level',
    description: 'Optimized for new graduates with limited experience',
    category: 'Resume',
    tags: ['fresher', 'entry', 'graduate'],
    systemPrompt: `You are Eleva AI, a resume writer for entry-level candidates.

## LOCKED RULES
- Emphasize education, projects, and internships.
- Highlight relevant coursework and academic achievements.
- Showcase extracurricular leadership and volunteer work.
- Focus on transferable skills and learning ability.
- Keep concise — one page maximum.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.5,
    maxTokens: 3072,
  },
  {
    id: 'experienced',
    name: 'Experienced Professional',
    description: 'For senior professionals with 10+ years experience',
    category: 'Resume',
    tags: ['senior', 'experienced', 'leadership'],
    systemPrompt: `You are Eleva AI, a resume writer for experienced professionals.

## LOCKED RULES
- Emphasize leadership, strategic impact, and mentorship.
- Focus on career progression and increasing responsibility.
- Highlight executive presence and organizational influence.
- Quantify team size, budgets, and business outcomes.
- Include board memberships, speaking engagements, and patents.`,
    model: 'anthropic/claude-sonnet-4.5',
    temperature: 0.5,
    maxTokens: 4096,
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.04 },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export function PromptTemplates({
  onApply,
  onClose,
}: {
  onApply: (template: PromptTemplate) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const cats = new Set(TEMPLATES.map((t) => t.category));
    return Array.from(cats);
  }, []);

  const filtered = useMemo(() => {
    let result = TEMPLATES;
    if (category) result = result.filter((t) => t.category === category);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q))
      );
    }
    return result;
  }, [category, search]);

  const handleCopy = async (t: PromptTemplate) => {
    await navigator.clipboard.writeText(t.systemPrompt);
    setCopiedId(t.id);
    setTimeout(() => setCopiedId(null), 1200);
    toast.success('System prompt copied');
  };

  const handleApply = (t: PromptTemplate) => {
    onApply(t);
    toast.success(`Applied "${t.name}" template`);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-[720px] max-h-[80vh] rounded-2xl flex flex-col overflow-hidden"
        style={{ background: 'rgb(var(--eleva-card))' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b shrink-0" style={{ borderColor: 'rgb(var(--eleva-border))' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgb(var(--eleva-muted))' }}>
                <Sparkles className="w-4 h-4" style={{ color: 'rgb(var(--eleva-primary))' }} />
              </div>
              <div>
                <h2 className="font-display text-lg font-semibold" style={{ color: 'rgb(var(--eleva-fg))' }}>Prompt Templates</h2>
                <p className="text-[12px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>Choose a preset template to get started</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[rgb(var(--eleva-muted))]">
              <X className="w-4 h-4" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-muted-fg))' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-3 py-2 rounded-lg text-[13px] outline-none"
                style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-fg))' }}
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              <button
                onClick={() => setCategory(null)}
                className="shrink-0 text-[11px] px-2.5 py-1.5 rounded-lg font-mono uppercase tracking-wider transition-colors"
                style={{
                  background: !category ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted))',
                  color: !category ? '#fff' : 'rgb(var(--eleva-muted-fg))',
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(category === cat ? null : cat)}
                  className="shrink-0 text-[11px] px-2.5 py-1.5 rounded-lg font-mono uppercase tracking-wider transition-colors"
                  style={{
                    background: category === cat ? 'rgb(var(--eleva-primary))' : 'rgb(var(--eleva-muted))',
                    color: category === cat ? '#fff' : 'rgb(var(--eleva-muted-fg))',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <div className="text-[13px]" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>No templates found</div>
            </div>
          ) : (
            <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
              {filtered.map((t) => (
                <motion.div
                  key={t.id}
                  variants={item}
                  className="rounded-xl p-4 border cursor-pointer group transition-all hover:shadow-md"
                  style={{ borderColor: 'rgb(var(--eleva-border))', background: 'rgb(var(--eleva-card))' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgb(var(--eleva-muted))' }}>
                        <FileText className="w-3.5 h-3.5" style={{ color: 'rgb(var(--eleva-primary))' }} />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium" style={{ color: 'rgb(var(--eleva-fg))' }}>{t.name}</div>
                        <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                          {t.category}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[12px] mb-3 line-clamp-2" style={{ color: 'rgb(var(--eleva-muted-fg))' }}>
                    {t.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {t.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded"
                        style={{ background: 'rgb(var(--eleva-muted))', color: 'rgb(var(--eleva-muted-fg))' }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleApply(t)}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md"
                      style={{ background: 'rgb(var(--eleva-primary))', color: '#fff' }}
                    >
                      <ArrowRight className="w-3 h-3" /> Apply
                    </button>
                    <button
                      onClick={() => handleCopy(t)}
                      className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-md hover:bg-[rgb(var(--eleva-muted))]"
                      style={{ color: 'rgb(var(--eleva-muted-fg))' }}
                    >
                      {copiedId === t.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiedId === t.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export type { PromptTemplate };
