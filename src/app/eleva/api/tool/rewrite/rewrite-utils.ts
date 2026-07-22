export type RewriteMode = 'professional' | 'technical' | 'recruiter' | 'ats' | 'executive' | 'shorter' | 'longer' | 'more-metrics' | 'more-leadership';

export const REWRITE_MODE_OPTIONS: Array<{ value: RewriteMode; label: string; description: string }> = [
  { value: 'professional', label: 'Professional', description: 'Polished and recruiter-friendly' },
  { value: 'technical', label: 'Technical', description: 'More implementation-focused' },
  { value: 'recruiter', label: 'Recruiter', description: 'Easier to scan quickly' },
  { value: 'ats', label: 'ATS', description: 'Keyword-aligned and searchable' },
  { value: 'executive', label: 'Executive', description: 'More senior and outcome-oriented' },
  { value: 'shorter', label: 'Shorter', description: 'Condense while keeping impact' },
  { value: 'longer', label: 'Longer', description: 'Expand with more useful detail' },
  { value: 'more-metrics', label: 'More Metrics', description: 'Increase measurable impact language' },
  { value: 'more-leadership', label: 'More Leadership', description: 'Highlight ownership and initiative' },
];

export type RewriteAttemptStatus = 'success' | 'empty' | 'error' | 'fallback';

export interface RewriteAttemptMeta {
  attempt: number;
  model: string;
  status: RewriteAttemptStatus;
  latencyMs: number;
  empty?: boolean;
  finishReason?: string;
  error?: string;
}

const MODE_INSTRUCTIONS: Record<RewriteMode, string> = {
  professional: 'Make it polished, concise, and recruiter-friendly.',
  technical: 'Make it more technical, precise, and implementation-oriented.',
  recruiter: 'Make it easier for a recruiter to scan and understand quickly.',
  ats: 'Make it more ATS-friendly with natural keyword alignment.',
  executive: 'Make it sound more senior, strategic, and outcome-oriented.',
  shorter: 'Make it shorter while preserving impact and truth.',
  longer: 'Expand it with useful detail while keeping it truthful.',
  'more-metrics': 'Increase measurable impact language only where it is supported by the original bullet.',
  'more-leadership': 'Make leadership, ownership, and initiative clearer without fabricating scope.',
};

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function improveActionVerb(text: string): string {
  const verbMap: Array<[RegExp, string | ((match: string) => string)]> = [
    [/^(helped|assisted|supported)\b/i, 'Supported'],
    [/^(worked on|worked with|contributed to)\b/i, 'Built'],
    [/^(responsible for)\b/i, 'Owned'],
    [/^(improved|optimized|reduced|increased)\b/i, 'Optimized'],
    [/^(created|made|developed|designed)\b/i, 'Built'],
    [/^(led|spearheaded|owned|implemented)\b/i, (match) => match.charAt(0).toUpperCase() + match.slice(1).toLowerCase()],
  ];

  for (const [pattern, replacement] of verbMap) {
    if (pattern.test(text)) {
      return normalizeWhitespace(text.replace(pattern, typeof replacement === 'string' ? replacement : replacement(text)));
    }
  }

  return text;
}

function keepFirstClause(text: string): string {
  const clause = text.split(/[.;\n]/)[0]?.trim() ?? text;
  return clause || text;
}

export function buildRewritePrompt(input: {
  bullet: string;
  role?: string;
  jobDescription?: string;
  mode?: RewriteMode;
  stronger?: boolean;
}): { system: string; prompt: string } {
  const mode = input.mode ?? 'professional';
  const role = input.role?.trim() || 'senior engineer';
  const baseRules = [
    'Return only the rewritten bullet text.',
    'Do not add markdown, numbering, labels, or quotes.',
    'Keep every claim truthful and grounded in the original bullet and JD context.',
    'Do not return an empty response.',
  ];

  const strongerRules = input.stronger
    ? [
        'You must produce a rewritten bullet even if the original is already strong.',
        'Do not repeat the original wording verbatim.',
        'If you cannot add a metric, improve clarity, action, and impact instead.',
      ]
    : [];

  const system = `${baseRules.concat(strongerRules).join('\n')}`;
  const prompt = [
    `Rewrite this bullet for a ${role} resume.`,
    `Mode: ${mode}. ${MODE_INSTRUCTIONS[mode]}`,
    input.jobDescription ? `Target JD context:\n${input.jobDescription.slice(0, 2000)}` : '',
    `Original bullet:\n${input.bullet.trim()}`,
  ].filter(Boolean).join('\n\n');

  return { system, prompt };
}

export function makeSafeLocalRewrite(bullet: string, mode: RewriteMode = 'professional'): string {
  const cleaned = normalizeWhitespace(bullet);
  if (!cleaned) return '';

  const improved = improveActionVerb(cleaned);
  const shortened = mode === 'shorter' ? keepFirstClause(improved) : improved;
  const finalText = normalizeWhitespace(shortened).replace(/[;:,\s]+$/, '');
  return finalText.endsWith('.') ? finalText : `${finalText}.`;
}

export function summarizeRewriteAttempts(attempts: RewriteAttemptMeta[]): string {
  if (attempts.length === 0) return 'No attempts made';
  return attempts
    .map((attempt) => `Attempt ${attempt.attempt} · ${attempt.status}${attempt.model ? ` · ${attempt.model}` : ''}`)
    .join(' | ');
}
