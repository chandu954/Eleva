type SectionRewriteOutcome = {
  content: string;
  changed: boolean;
  confidence: number;
  reason: string;
  originalLength: number;
  rewrittenLength: number;
};

const ROLE_KEYWORDS = [
  'engineer', 'developer', 'architect', 'analyst', 'scientist', 'designer', 'manager', 'lead',
  'principal', 'staff', 'backend', 'frontend', 'full stack', 'full-stack', 'platform', 'data',
  'machine learning', 'ml', 'ai', 'devops', 'security', 'cloud', 'product', 'mobile', 'web',
  'consultant', 'administrator', 'researcher', 'specialist', 'technical writer', 'solutions engineer',
];

const ROLE_NOUNS = [
  'engineer', 'developer', 'architect', 'analyst', 'scientist', 'designer', 'manager', 'consultant',
  'administrator', 'researcher', 'specialist', 'writer', 'technologist', 'owner', 'lead engineer',
  'solutions engineer', 'product manager', 'product owner',
];

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function extractRoleLikePhrase(text: string): string | null {
  const cleaned = normalizeWhitespace(text)
    .replace(/^[-•*\d.\s]+/, '')
    .replace(/["'“”]+/g, '');

  if (!cleaned) return null;

  const titleMatch = cleaned.match(
    /(?:Senior|Lead|Staff|Principal|Junior|Mid[- ]Level|Entry[- ]Level|Head|Director|VP|Vice President)?\s*(?:Full[- ]Stack|Backend|Frontend|Software|Data|Machine Learning|ML|AI|Platform|Product|DevOps|Security|Cloud|Mobile|Web|Solutions)?\s*(?:Engineer|Developer|Architect|Analyst|Scientist|Designer|Manager|Consultant|Specialist|Researcher|Administrator|Writer|Technologist|Owner|Solutions Engineer|Product Manager|Product Owner)(?:\s+[A-Za-z][A-Za-z\-]*)?/i,
  );

  if (titleMatch) {
    const candidate = normalizeWhitespace(titleMatch[0]);
    if (candidate.length >= 4 && candidate.length <= 80) return candidate;
  }

  return null;
}

function sentenceLooksLikeRole(sentence: string): boolean {
  const cleaned = normalizeWhitespace(sentence).toLowerCase();
  if (!cleaned) return false;
  const hasKeyword = ROLE_KEYWORDS.some((keyword) => cleaned.includes(keyword));
  const hasVerbFragment = /(we are|we're|join us|looking for|hiring|responsible for|solution|build|design|deliver|lead our|our platform|our product)/i.test(cleaned);
  return hasKeyword && !hasVerbFragment;
}

export function inferConciseRoleTitle(jdText: string): string | null {
  const rawText = String(jdText ?? '');
  const text = normalizeWhitespace(rawText);
  if (!text) return null;

  const lines = rawText
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)
    .slice(0, 60);

  for (const line of lines) {
    if (line.length > 80) continue;
    if (/^(role|title|position|job title|opening|hiring for)[:\-]/i.test(line)) {
      const candidate = extractRoleLikePhrase(line.split(/[:\-]/).slice(1).join(':'));
      if (candidate) return candidate;
    }
    if (sentenceLooksLikeRole(line)) {
      const candidate = extractRoleLikePhrase(line);
      if (candidate) return candidate;
    }
  }

  const headingPatterns = [
    /(?:^|\n)\s*(Senior|Lead|Staff|Principal|Junior|Mid[- ]Level|Entry[- ]Level)?\s*(Full[- ]Stack|Backend|Frontend|Software|Data|Machine Learning|ML|AI|Platform|Product|DevOps|Security|Cloud|Mobile|Web)?\s*(Engineer|Developer|Architect|Analyst|Scientist|Designer|Manager|Consultant|Specialist|Researcher|Administrator|Writer|Lead)\b/i,
    /(?:^|\n)\s*((?:[A-Z][A-Za-z]+\s+){0,3}(?:Engineer|Developer|Architect|Analyst|Scientist|Designer|Manager|Consultant|Specialist|Researcher|Administrator|Writer|Lead))\b/,
  ];

  for (const pattern of headingPatterns) {
    const match = text.match(pattern);
    if (match?.[0]) {
      const candidate = extractRoleLikePhrase(match[0]);
      if (candidate) return candidate;
    }
  }

  const fragments = text.split(/[\n\.|•|\|]/).map((part) => normalizeWhitespace(part)).filter(Boolean);
  for (const fragment of fragments) {
    if (!sentenceLooksLikeRole(fragment)) continue;
    const candidate = extractRoleLikePhrase(fragment);
    if (candidate) return candidate;
  }

  return null;
}

export function normalizeRoleTitle(candidate: string | null | undefined, jdText: string): string | null {
  const cleaned = normalizeWhitespace(String(candidate ?? ''));
  if (!cleaned) return inferConciseRoleTitle(jdText);

  const hasNoun = ROLE_NOUNS.some((noun) => cleaned.toLowerCase().includes(noun));
  if (!hasNoun || cleaned.split(/\s+/).length < 2 || cleaned.length > 80) {
    const inferred = inferConciseRoleTitle(jdText);
    if (inferred) return inferred;
  }

  const conciseCandidate = extractRoleLikePhrase(cleaned);
  if (conciseCandidate && conciseCandidate.length >= 8) return conciseCandidate;

  if (cleaned.length <= 60 && /^[A-Za-z0-9 /&+\-]+$/.test(cleaned)) {
    return cleaned;
  }

  const inferred = inferConciseRoleTitle(jdText);
  if (inferred) return inferred;

  return cleaned.length <= 80 ? cleaned : cleaned.slice(0, 80).trim();
}

function wordSet(value: string): Set<string> {
  return new Set(
    normalizeWhitespace(value)
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 2),
  );
}

function textSimilarity(original: string, rewritten: string): number {
  const originalWords = wordSet(original);
  const rewrittenWords = wordSet(rewritten);
  if (originalWords.size === 0 && rewrittenWords.size === 0) return 1;
  const union = new Set([...originalWords, ...rewrittenWords]);
  const intersection = [...originalWords].filter((word) => rewrittenWords.has(word));
  return intersection.length / union.size;
}

export function buildSectionRewriteOutcome(
  sectionLabel: string,
  originalText: string,
  rewrittenText: string,
  fallbackReason?: string,
): SectionRewriteOutcome {
  const original = normalizeWhitespace(originalText);
  const rewritten = normalizeWhitespace(rewrittenText);
  const originalLength = original.length;
  const rewrittenLength = rewritten.length;

  if (!original && !rewritten) {
    return {
      content: '',
      changed: false,
      confidence: 0,
      reason: `${sectionLabel} not rewritten`,
      originalLength,
      rewrittenLength,
    };
  }

  if (!rewritten) {
    return {
      content: original,
      changed: false,
      confidence: 0,
      reason: fallbackReason ?? `${sectionLabel} not rewritten`,
      originalLength,
      rewrittenLength,
    };
  }

  const similarity = textSimilarity(original, rewritten);
  const changed = similarity < 0.95 && original !== rewritten;
  const confidence = changed ? Math.min(95, Math.max(5, Math.round((1 - similarity) * 100))) : 0;

  let reason = fallbackReason ?? `${sectionLabel} rewritten`;
  if (!changed) {
    reason = fallbackReason ?? `${sectionLabel} not rewritten`;
  } else if (similarity < 0.3) {
    reason = `${sectionLabel} fully restructured`;
  } else if (similarity < 0.7) {
    reason = `${sectionLabel} significantly improved`;
  } else {
    reason = `${sectionLabel} lightly optimized`;
  }

  return {
    content: rewritten,
    changed,
    confidence,
    reason,
    originalLength,
    rewrittenLength,
  };
}

export function summarizeSectionStatus(outcome: SectionRewriteOutcome): string {
  return outcome.changed ? `${outcome.reason} (${outcome.originalLength} → ${outcome.rewrittenLength})` : outcome.reason;
}

export function countChangedSections(outcomes: Array<{ changed: boolean }>): number {
  return outcomes.reduce((count, outcome) => count + (outcome.changed ? 1 : 0), 0);
}

export function buildTailoredResumeIdentity(originalResume: { name?: string | null; target_role?: string | null }): { name: string; target_role: string } {
  const name = normalizeWhitespace(String(originalResume.name ?? '')).slice(0, 120) || 'Tailored Resume';
  const target_role = normalizeWhitespace(String(originalResume.target_role ?? '')).slice(0, 120) || name;
  return { name, target_role };
}

export type { SectionRewriteOutcome };