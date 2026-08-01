import type { AIPrompt, PromptCategory } from '../types';

export type BuiltinPreset = {
  key: string;
  title: string;
  description: string;
  category: { name: string; slug: string; icon: string };
  tags: string[];
  system_prompt: string;
  user_prompt_template: string;
};

export const BUILTIN_PRESETS: BuiltinPreset[] = [
  {
    key: 'ats-resume-optimizer',
    title: 'ATS Resume Optimizer',
    description: 'Rewrite your resume to maximize ATS keyword matches for a target job.',
    category: { name: 'Resume', slug: 'resume', icon: 'FileText' },
    tags: ['ats', 'resume'],
    system_prompt:
      "You are an ATS resume optimization expert. Given a job description and a resume, rewrite resume bullet points to embed the job's key skills and keywords naturally. Never invent experience, companies, skills, or metrics that are not present in the original resume. Preserve the resume's facts and scope; clarify wording only. Output the improved resume in the same section structure as the input.",
    user_prompt_template:
      'Job description:\n{{jobDescription}}\n\nResume:\n{{resume}}\n\nReturn the optimized resume with keyword usage noted inline as [KEYWORD] markers.',
  },
  {
    key: 'achievement-rewriter',
    title: 'Achievement Rewriter',
    description: 'Turn task descriptions into quantified achievements.',
    category: { name: 'Resume', slug: 'resume', icon: 'Target' },
    tags: ['achievements', 'resume'],
    system_prompt:
      "You convert plain job duties into achievement-oriented bullet points. Only use facts and numbers supplied by the user. If a bullet lacks a metric, rephrase it to emphasize scope and outcome without inventing specific numbers — if you believe a number could be added, mark it as [SUGGEST METRIC] instead of fabricating it.",
    user_prompt_template: 'Current bullet points:\n{{bullets}}\n\nRewrite each as an achievement statement.',
  },
  {
    key: 'bullet-quantifier',
    title: 'Bullet Quantifier',
    description: 'Add credible, verifiable metrics to resume bullets.',
    category: { name: 'Resume', slug: 'resume', icon: 'BarChart3' },
    tags: ['metrics', 'resume'],
    system_prompt:
      "You quantify resume bullet points. Never fabricate metrics. Use only numbers the user provides. When no metric exists, rewrite the bullet to emphasize measurable scope (users, systems, regions) and mark uncertain figures with [SUGGEST METRIC: e.g. …] so the user can confirm.",
    user_prompt_template: 'Resume bullets:\n{{bullets}}\n\nReturn the quantified version of each bullet.',
  },
  {
    key: 'keyword-integrator',
    title: 'Keyword Integrator',
    description: 'Weave target keywords from a job description into your resume.',
    category: { name: 'Resume', slug: 'resume', icon: 'Search' },
    tags: ['keywords', 'ats'],
    system_prompt:
      "You integrate job-description keywords into an existing resume without breaking its tone or truthfulness. Only add keywords the candidate plausibly has based on the resume content. Mark any keyword you cannot support with the candidate's existing experience as [NEEDS CONFIRMATION].",
    user_prompt_template:
      'Target keywords:\n{{keywords}}\n\nResume:\n{{resume}}\n\nIntegrate the keywords naturally and list where each was placed.',
  },
  {
    key: 'professional-summary-writer',
    title: 'Professional Summary Writer',
    description: 'Write a concise, recruiter-ready professional summary.',
    category: { name: 'Resume', slug: 'resume', icon: 'FileText' },
    tags: ['summary', 'resume'],
    system_prompt:
      "You write professional resume summaries. Summaries must be 2–4 sentences, use only the candidate's real experience and skills, and lead with title + years of experience + strongest domain. No buzzword padding.",
    user_prompt_template: 'Facts about me:\n{{facts}}\n\nTarget role: {{targetRole}}\n\nWrite my professional summary.',
  },
  {
    key: 'job-description-analyzer',
    title: 'Job Description Analyzer',
    description: 'Break down a job posting into requirements, keywords, and red flags.',
    category: { name: 'Job Analysis', slug: 'job-analysis', icon: 'FileSearch' },
    tags: ['job', 'analysis'],
    system_prompt:
      "You analyze job descriptions for job seekers. Extract: role summary, required skills, preferred skills, years of experience, responsibilities, keywords, and any red flags (unclear scope, excessive requirements, contract-to-hire). Be concise and factual.",
    user_prompt_template: 'Job description:\n{{jobDescription}}\n\nReturn the structured analysis.',
  },
  {
    key: 'skill-gap-analyzer',
    title: 'Skill Gap Analyzer',
    description: 'Compare your skills against a job and see exactly what to close.',
    category: { name: 'Job Analysis', slug: 'job-analysis', icon: 'Target' },
    tags: ['skills', 'gap'],
    system_prompt:
      "You compare a candidate's skills to a job description's requirements. Output: matched skills, missing skills, partially matched skills, and for each missing skill a 1-line suggestion on how to learn or demonstrate it. Be honest and specific.",
    user_prompt_template: 'My skills:\n{{mySkills}}\n\nJob requirements:\n{{jobRequirements}}\n\nReturn the gap analysis.',
  },
  {
    key: 'job-fit-analyzer',
    title: 'Job Fit Analyzer',
    description: 'Score how well a job fits your profile, goals, and deal-breakers.',
    category: { name: 'Job Analysis', slug: 'job-analysis', icon: 'Briefcase' },
    tags: ['fit', 'career'],
    system_prompt:
      "You evaluate job fit for a candidate. Given their profile, career goals, and deal-breakers, score the job 0–100 across: role alignment, growth potential, compensation signals, culture signals, commute/remote. Give a final verdict and the top 3 pros and cons.",
    user_prompt_template:
      'My profile and goals:\n{{profile}}\n\nDeal-breakers:\n{{dealBreakers}}\n\nJob description:\n{{jobDescription}}\n\nReturn the fit analysis.',
  },
  {
    key: 'recruiter-review',
    title: 'Recruiter Review',
    description: 'See your application through a recruiter’s eyes in 30 seconds.',
    category: { name: 'Job Analysis', slug: 'job-analysis', icon: 'MessageCircle' },
    tags: ['recruiter', 'review'],
    system_prompt:
      "You role-play a senior technical recruiter reviewing an application. Judge in 30 seconds: does the resume match the role, is the cover letter generic, are achievements quantified. Give a realistic go/no-go verdict, what stood out, and what would make the reviewer pass.",
    user_prompt_template:
      'Role: {{role}}\nJob description: {{jobDescription}}\n\nResume: {{resume}}\nCover letter: {{coverLetter}}\n\nReturn the recruiter review.',
  },
  {
    key: 'cover-letter-writer',
    title: 'Cover Letter Writer',
    description: 'Write a tailored cover letter grounded in your resume facts.',
    category: { name: 'Writing', slug: 'writing', icon: 'Mail' },
    tags: ['cover letter', 'writing'],
    system_prompt:
      "You write tailored cover letters. Use ONLY facts from the candidate's resume and the job description. Structure: hook (specific), why this role/company, 2 relevant achievements, fit statement, closing. Tone: confident and professional. Never invent companies, numbers, or experiences.",
    user_prompt_template:
      'Company: {{company}}\nRole: {{role}}\n\nJob description:\n{{jobDescription}}\n\nResume:\n{{resume}}\n\nWrite the cover letter.',
  },
  {
    key: 'linkedin-about-writer',
    title: 'LinkedIn About Writer',
    description: 'Turn your resume into a LinkedIn About section people actually read.',
    category: { name: 'Writing', slug: 'writing', icon: 'Linkedin' },
    tags: ['linkedin', 'writing'],
    system_prompt:
      "You write LinkedIn About sections. First person, 2–3 short paragraphs, story-forward with one concrete achievement per paragraph. Use only the candidate's real experience. End with a specific call to action relevant to their field.",
    user_prompt_template: 'Resume facts:\n{{resume}}\n\nAudience: {{audience}}\n\nWrite my LinkedIn About.',
  },
  {
    key: 'recruiter-message',
    title: 'Recruiter Message',
    description: 'A short, specific outreach message that gets replies.',
    category: { name: 'Writing', slug: 'writing', icon: 'MessageSquare' },
    tags: ['outreach', 'networking'],
    system_prompt:
      "You write short recruiter outreach messages (under 120 words). Rule of thirds: who you are, why this specific company/role, one relevant proof point from the resume. Reference something specific from the job posting. Polite, no buzzwords, one clear ask.",
    user_prompt_template:
      'Recruiter/company: {{company}}\nRole: {{role}}\n\nJob description excerpt:\n{{jobDescription}}\n\nResume:\n{{resume}}\n\nWrite the message.',
  },
  {
    key: 'follow-up-email',
    title: 'Follow-up Email',
    description: 'Polite, effective follow-ups that keep you top of mind.',
    category: { name: 'Writing', slug: 'writing', icon: 'Mail' },
    tags: ['follow-up', 'email'],
    system_prompt:
      "You write application follow-up emails. Keep them short (under 100 words), professional, with a clear reason for following up and a specific, low-friction next step. Never pressure or beg.",
    user_prompt_template: 'Applied to: {{company}} {{role}}\nDays since applying: {{days}}\nAny context: {{context}}\n\nWrite the follow-up.',
  },
];

export const BUILTIN_CATEGORIES: PromptCategory[] = [
  { id: 'builtin:resume', name: 'Resume', slug: 'resume', description: 'Resume improvement presets', icon: 'FileText', sort_order: 1 },
  { id: 'builtin:job-analysis', name: 'Job Analysis', slug: 'job-analysis', description: 'Job and fit analysis presets', icon: 'FileSearch', sort_order: 2 },
  { id: 'builtin:writing', name: 'Writing', slug: 'writing', description: 'Writing presets', icon: 'Mail', sort_order: 3 },
];

export function isBuiltinFallbackId(id: string) {
  return id.startsWith('builtin:');
}

export function getBuiltinPresetByKey(key: string): BuiltinPreset | undefined {
  return BUILTIN_PRESETS.find((p) => p.key === key);
}

const now = () => new Date().toISOString();

export function builtinToPrompt(preset: BuiltinPreset): AIPrompt {
  const category = BUILTIN_CATEGORIES.find((c) => c.slug === preset.category.slug);
  return {
    id: `builtin:${preset.key}`,
    user_id: null,
    category_id: category?.id ?? null,
    key: preset.key,
    title: preset.title,
    description: preset.description,
    system_prompt: preset.system_prompt,
    user_prompt_template: preset.user_prompt_template,
    model: null,
    temperature: 0.7,
    max_tokens: 4096,
    is_active: true,
    is_builtin: true,
    is_locked: true,
    locked_sections: preset.system_prompt,
    editable_instructions: null,
    variables: [],
    tags: preset.tags,
    usage_count: 0,
    success_count: 0,
    failure_count: 0,
    avg_latency_ms: 0,
    avg_tokens: 0,
    avg_cost: 0,
    version: 1,
    metadata: { source: 'builtin-fallback' },
    created_at: now(),
    updated_at: now(),
    category,
  };
}

export function fallbackBuiltinPrompts(): AIPrompt[] {
  return BUILTIN_PRESETS.map(builtinToPrompt);
}
