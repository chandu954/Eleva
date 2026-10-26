// @vitest-environment node
import { describe, expect, it } from 'vitest';

import {
  buildSectionContext,
  buildExtractSystemPrompt,
  buildExtractUserPrompt,
  buildScoreSystemPrompt,
  buildScoreUserPrompt,
  buildPlanUserPrompt,
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
  buildSummaryRetrySystemPrompt,
  buildSummaryRetryUserPrompt,
  buildSkillsSystemPrompt,
  buildSkillsUserPrompt,
  buildExperienceSystemPrompt,
  buildExperienceUserPrompt,
  buildProjectsSystemPrompt,
  buildProjectsUserPrompt,
  buildQualitySystemPrompt,
  buildQualityUserPrompt,
  buildRescoreSystemPrompt,
  buildRescoreUserPrompt,
  buildReviewSystemPrompt,
  buildReviewUserPrompt,
  buildLetterSystemPrompt,
  buildLetterUserPrompt,
  type JdSignal,
  type ScoreData,
  type OriginalResumeData,
} from './prompts';

const BASE = 'BASE-SYSTEM-PROMPT';

const JD = 'a'.repeat(7000); // longer than every cap (4000/6000/3000/2000)

const SIGNAL: JdSignal = {
  company: 'Acme',
  role: 'Backend Engineer',
  required_skills: ['sql', 'kafka'],
  nice_to_have: ['rust'],
  summary: 'Builds payment systems.',
};

function makeScore(overrides: Partial<ScoreData> = {}): ScoreData {
  return {
    overall: 72, keyword: 65, formatting: 80, readability: 90, impact: 60, recruiter: 55,
    matched: [], missing: [], suggestions: [], summary: '',
    ...overrides,
  };
}

const RESUME: OriginalResumeData = {
  professional_summary: 'Ten years of backend work.',
  skills: [{ category: 'Programming', skills: ['Go', 'SQL'] }],
  work_experience: [{ company: 'Old Co', position: 'Engineer', description: 'ship', responsibilities: [] }],
  projects: [{ name: 'P', description: ['did things'], technologies: ['Go'] }],
  education: [{ school: 'Uni', degree: 'BSc' }],
  certifications: [],
};

describe('extract prompts', () => {
  // Byte-exact pins: these templates must not drift.
  it('system prompt is byte-identical to the original inline template', () => {
    expect(buildExtractSystemPrompt(BASE)).toBe(`${BASE}

Extract structured signal from a JD.

CRITICAL OUTPUT RULES:
- Return ONLY valid JSON.
- The first character of the response MUST be '{'.
- The response MUST contain ONLY this JSON object (no surrounding text).
- Include exactly these keys: company, role, required_skills, nice_to_have, summary.
- Missing values: company/role = null, required_skills/nice_to_have = [], summary = "".
- Role title must be concise and job-title-like.
- Do NOT copy paragraphs, sales copy, or responsibilities into role.
- GOOD examples: Senior Full Stack Engineer, Backend Engineer, Software Engineer.
- BAD examples: Lead our full-stack solution is based on modern server...
`);
  });

  it('user prompt caps the JD at 6000 chars after the Job Description header', () => {
    const prompt = buildExtractUserPrompt(JD);
    expect(prompt.startsWith('Job Description:\n')).toBe(true);
    expect(prompt.length).toBe('Job Description:\n'.length + 6000);
    expect(prompt).toContain('Job Description:\naaaa');
  });
});

describe('score prompts', () => {
  it('system prompt is byte-identical to the original inline template', () => {
    expect(buildScoreSystemPrompt(BASE)).toBe(`${BASE}

Score this resume vs JD. 0-100 scale on each axis. Missing = technologies/keywords absent from resume. Suggestions must be action-first.`);
  });

  it('user prompt caps resume text at 6000 and the JD at 4000', () => {
    const prompt = buildScoreUserPrompt('b'.repeat(7000), JD);
    const resumePart = prompt.split('\n\nJD:\n')[0];
    expect(resumePart).toBe('Resume:\n' + 'b'.repeat(6000));
    expect(prompt.endsWith('JD:\n' + 'a'.repeat(4000))).toBe(true);
  });

  it('falls back to the no-resume marker when resume text is empty (JD-only scoring is honest)', () => {
    const prompt = buildScoreUserPrompt('', 'real JD text');
    expect(prompt).toContain('Resume:\n[No resume attached — score based on JD only]');
    expect(prompt).toContain('JD:\nreal JD text');
  });
});

describe('plan prompts', () => {
  it('user prompt carries the ATS numbers, capped keyword lists and compatibility', () => {
    const score = makeScore({ overall: 61, keyword: 50, impact: 70, matched: Array(20).fill('m'), missing: Array(25).fill('x') });
    const prompt = buildPlanUserPrompt({
      resumeJson: RESUME,
      jobDescription: JD,
      score,
      compatScore: 40,
      isLowCompat: false,
    });

    expect(prompt).toContain('ORIGINAL RESUME:\n' + JSON.stringify(RESUME, null, 2));
    expect(prompt).toContain('CURRENT ATS SCORE: 61%');
    expect(prompt).toContain('KEYWORD SCORE: 50%');
    expect(prompt).toContain('IMPACT SCORE: 70%');
    // MATCHED capped at 15, MISSING capped at 20.
    expect(prompt).toContain(`MATCHED KEYWORDS: ${Array(15).fill('m').join(', ')}`);
    expect(prompt).toContain(`MISSING KEYWORDS: ${Array(20).fill('x').join(', ')}`);
    expect(prompt).not.toContain('NOTE: This role differs significantly');
  });

  it('adds the low-compatibility note only when compatibility is below the bar', () => {
    const args = {
      resumeJson: null,
      jobDescription: 'short JD text for the plan prompt',
      score: makeScore(),
      compatScore: 12,
      isLowCompat: true,
    };
    const prompt = buildPlanUserPrompt(args);
    expect(prompt).toContain('COMPATIBILITY: 12%');
    expect(prompt).toContain('NOTE: This role differs significantly from the resume domain. Focus on transferable skills, not keyword injection.');
    // A null resume prints literally as null (original template behavior preserved).
    expect(prompt).toContain('ORIGINAL RESUME:\nnull');
    expect(prompt).toContain('JOB DESCRIPTION:\nshort JD text for the plan prompt');
  });
});

describe('section context', () => {
  it('slices the JD, caps keyword lists at 15 and assembles the shared fields', () => {
    const ctx = buildSectionContext({
      jobDescription: JD,
      skills: SIGNAL,
      score: { matched: Array(18).fill('hit'), missing: Array(18).fill('gap') },
      plan: { keywordsToInject: ['k1', 'k2'], hardTruthNote: 'be honest' },
      isLowCompat: false,
    });
    expect(ctx.jd).toBe('a'.repeat(2000));
    expect(ctx.role).toBe('Backend Engineer');
    expect(ctx.company).toBe('Acme');
    expect(ctx.jdSummary).toBe('Builds payment systems.');
    expect(ctx.matched).toBe(Array(15).fill('hit').join(', '));
    expect(ctx.missing).toBe(Array(15).fill('gap').join(', '));
    expect(ctx.planKeywords).toBe('k1, k2');
    expect(ctx.planHardTruth).toBe('be honest');
    expect(ctx.compatNote).toBe('');
  });

  it('sets the transferable-only note for low compatibility runs', () => {
    const ctx = buildSectionContext({
      jobDescription: 'some JD',
      skills: SIGNAL,
      score: { matched: [], missing: [] },
      plan: {},
      isLowCompat: true,
    });
    expect(ctx.compatNote).toBe('Note: This role differs from your background. Use transferable skills only.');
    expect(ctx.planKeywords).toBe('');
    expect(ctx.planHardTruth).toBe('');
  });
});

describe('summary writer prompts', () => {
  it('initial user prompt interpolates the resume summary and conditionally the hard truth', () => {
    const ctx = buildSectionContext({
      jobDescription: 'JD text here',
      skills: SIGNAL,
      score: { matched: ['sql'], missing: ['k8s'] },
      plan: { keywordsToInject: ['sql'], hardTruthNote: 'domain gap' },
      isLowCompat: false,
    });
    const prompt = buildSummaryUserPrompt(RESUME, ctx);
    expect(prompt.startsWith('ORIGINAL SUMMARY: Ten years of backend work.')).toBe(true);
    expect(prompt).toContain('JOB: Backend Engineer at Acme');
    expect(prompt).toContain('MATCHED: sql');
    expect(prompt).toContain('HARD TRUTH: domain gap');
    expect(prompt.endsWith('Return JSON: { professional_summary: "rewritten text" }')).toBe(true);

    // Without a resume row and without a hard truth: empty interpolations.
    const bare = buildSummaryUserPrompt(null, { ...ctx, planHardTruth: '' });
    expect(bare.startsWith('ORIGINAL SUMMARY: ')).toBe(true);
    expect(bare).not.toContain('HARD TRUTH:');
  });

  it('retry system prompt forbids keeping the original wording (the reason it exists)', () => {
    const retry = buildSummaryRetrySystemPrompt(BASE);
    expect(retry).toContain('Do NOT keep the original wording');
    expect(retry).toContain('Make the rewrite obviously different in structure and wording while staying truthful');
    expect(buildSummaryRetryUserPrompt('Old summary', { ...buildSectionContext({ jobDescription: 'x', skills: SIGNAL, score: { matched: [], missing: [] }, plan: {}, isLowCompat: false }) })).toContain('ORIGINAL SUMMARY: Old summary');
  });

  it('initial system prompt keeps the tone-context rule the retry drops', () => {
    const system = buildSummarySystemPrompt(BASE);
    expect(system).toContain('Use missing keywords only for tone context');
  });
});

describe('skills / experience / projects prompts', () => {
  const ctx = buildSectionContext({
    jobDescription: 'JD text here',
    skills: SIGNAL,
    score: { matched: Array(17).fill('kw'), missing: Array(17).fill('missing-kw') },
    plan: { keywordsToInject: ['kw1'] },
    isLowCompat: false,
  });

  it('skills prompt embeds the original skills JSON and protected context', () => {
    const prompt = buildSkillsUserPrompt(RESUME, ctx);
    expect(prompt).toContain(`ORIGINAL SKILLS: ${JSON.stringify(RESUME.skills)}`);
    expect(prompt).toContain('JOB: Backend Engineer');
    expect(prompt).toContain(`MATCHED: ${Array(15).fill('kw').join(', ')}`);
    expect(prompt).toContain('Return JSON: { skills: [{ category: string, skills: string[] }] }');
    expect(buildSkillsSystemPrompt(BASE)).toContain('Keep ALL original skills — never remove or rename technologies');
  });

  it('experience prompt carries the transferable-only missing list and hard constraints', () => {
    const prompt = buildExperienceUserPrompt(RESUME, ctx);
    expect(prompt).toContain(`ORIGINAL EXPERIENCE: ${JSON.stringify(RESUME.work_experience)}`);
    expect(prompt).toContain('MISSING (transferable only):');
    expect(buildExperienceSystemPrompt(BASE)).toContain('NEVER change company, dates, title, or location');
    expect(buildExperienceSystemPrompt(BASE)).toContain('NEVER add new entries');
  });

  it('projects prompt embeds original projects and forbids fabrication', () => {
    const prompt = buildProjectsUserPrompt(RESUME, ctx);
    expect(prompt).toContain(`ORIGINAL PROJECTS: ${JSON.stringify(RESUME.projects)}`);
    expect(buildProjectsSystemPrompt(BASE)).toContain('Never fabricate metrics, names, or technologies');
  });
});

describe('quality + rescore prompts', () => {
  const longObj = { blob: 'c'.repeat(4000) }; // stringified with indent 2 exceeds both caps

  it('quality user prompt stringifies and caps original at 1500 and tailored at 2500 chars', () => {
    const prompt = buildQualityUserPrompt(longObj, longObj);
    const expectedJson = JSON.stringify(longObj, null, 2);
    const parts = prompt.split('\n\nTAILORED:\n');
    expect(parts[0]).toBe('ORIGINAL:\n' + expectedJson.slice(0, 1500));
    expect(parts[1].endsWith('\n\nValidate resume quality. Return JSON.')).toBe(true);
    expect(parts[1].startsWith(expectedJson.slice(0, 2500))).toBe(true);
    expect(buildQualitySystemPrompt(BASE)).toContain('Set passed=false if major issues found');
  });

  it('rescore user prompt embeds the rewritten tail, JD and previous score', () => {
    const prompt = buildRescoreUserPrompt('d'.repeat(6000), JD, 61);
    expect(prompt).toContain('Rewritten Resume:\n' + 'd'.repeat(5000));
    expect(prompt).toContain(`JD:\n${'a'.repeat(4000)}`);
    expect(prompt.endsWith('\n\nPrevious score: 61%')).toBe(true);
    expect(buildRescoreSystemPrompt(BASE)).toBe(`${BASE}\n\nRe-score this tailored resume vs JD. Compare improvement. 0-100 scale.`);
  });
});

describe('review + letter prompts', () => {
  const rescores = makeScore({
    overall: 80, keyword: 75, impact: 66, readability: 88,
    matched: Array(15).fill('good'), missing: Array(15).fill('lacking'),
  });

  it('review user prompt includes the tailored resume, ATS block and capped lists', () => {
    const prompt = buildReviewUserPrompt({ skills: SIGNAL, rewrittenTail: 'REWRITTEN RESUME BODY', rescores });
    expect(prompt).toContain('JOB: Backend Engineer at Acme');
    expect(prompt).toContain('JD SUMMARY: Builds payment systems.');
    expect(prompt).toContain('TAILORED RESUME:\nREWRITTEN RESUME BODY');
    expect(prompt).toContain('ATS RESCORE:');
    expect(prompt).toContain('- Overall: 80%');
    expect(prompt).toContain(`- Matched: ${Array(10).fill('good').join(', ')}`);
    expect(prompt).toContain(`- Missing: ${Array(10).fill('lacking').join(', ')}`);
    expect(prompt.endsWith('Review this resume as a Senior Engineering Manager. Return JSON.')).toBe(true);
    expect(buildReviewSystemPrompt(BASE)).toContain('Do not be overly polite');
  });

  it('review falls back to Unknown for missing company/role signals', () => {
    const prompt = buildReviewUserPrompt({
      skills: { ...SIGNAL, company: null, role: null },
      rewrittenTail: 'x',
      rescores,
    });
    expect(prompt.startsWith('JOB: Unknown at Unknown')).toBe(true);
  });

  it('letter system prompt names the company, falling back to a neutral phrase', () => {
    const withCompany = buildLetterSystemPrompt('Acme');
    const without = buildLetterSystemPrompt(null);
    expect(withCompany).toContain("Connect the candidate's background to the company's mission/industry (Acme)");
    expect(without).toContain("Connect the candidate's background to the company's mission/industry (the company)");
    expect(withCompany).toContain('Keep it 3-4 paragraphs, plain text, no markdown');
    expect(someSystemPromptHasNoBasePrefixInLetter(withCompany)).toBe(true);
  });

  it('letter user prompt separates matched (claim) from missing (never claim) and gates the low-compat note', () => {
    const base = {
      skills: SIGNAL,
      rescores,
      isLowCompat: false,
      rewrittenTail: 'TAILOR BODY',
    };
    const prompt = buildLetterUserPrompt(base);
    expect(prompt).toContain('Job: Backend Engineer at Acme');
    expect(prompt).toContain(`Key Skills to Mention: ${Array(8).fill('good').join(', ')}`);
    expect(prompt).toContain(`Missing Skills (do NOT claim): ${Array(5).fill('lacking').join(', ')}`);
    expect(prompt).not.toContain('Note: The resume is from a different domain');
    expect(prompt).toContain('Tailored Resume:\nTAILOR BODY');

    const lowCompat = buildLetterUserPrompt({ ...base, isLowCompat: true });
    expect(lowCompat).toContain('Note: The resume is from a different domain. Focus on transferable skills and enthusiasm for transitioning.');
  });
});

/** The letter prompts are the only ones that never prepend the provider system prompt. */
function someSystemPromptHasNoBasePrefixInLetter(prompt: string): boolean {
  return !prompt.startsWith(BASE);
}
