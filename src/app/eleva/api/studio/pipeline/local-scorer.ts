import { inferConciseRoleTitle, normalizeRoleTitle } from './pipeline-utils';

function extractKeywords(text: string): string[] {
  const techTerms = [
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c\\+\\+', 'c#', 'ruby', 'php',
    'react', 'angular', 'vue', 'node', 'express', 'next', 'nestjs', 'django', 'flask', 'spring',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd',
    'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'cassandra',
    'graphql', 'rest', 'grpc', 'websocket', 'kafka', 'rabbitmq', 'pub/sub',
    'machine learning', 'deep learning', 'nlp', 'computer vision', 'llm', 'gpt', 'transformer',
    'agile', 'scrum', 'kanban', 'jira', 'leadership', 'mentoring', 'cross-functional',
    'sql', 'nosql', 'html', 'css', 'sass', 'tailwind', 'bootstrap', 'redux', 'webpack',
    'git', 'linux', 'bash', 'shell', 'nginx', 'apache', 'varnish', 'cdn',
  ];

  const textLower = text.toLowerCase();
  const found = new Set<string>();

  for (const term of techTerms) {
    const re = new RegExp(`\\b${term}\\b`, 'i');
    if (re.test(textLower)) found.add(term);
  }

  const words = textLower.split(/[\s,;.()]+/).filter(w => w.length > 2);
  const common = new Set(['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'any', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'has', 'have', 'been', 'its', 'than', 'that', 'this', 'with', 'will', 'were', 'what', 'when', 'where', 'which', 'who', 'how', 'about', 'into', 'over', 'after', 'also', 'each', 'from', 'more', 'some', 'them', 'then', 'they', 'their', 'your', 'able', 'like', 'just', 'know', 'make', 'take', 'come', 'time', 'year', 'than', 'very', 'well', 'even', 'back', 'much', 'still', 'work', 'need', 'feel', 'seem', 'help']);
  for (const w of words) {
    if (w.length > 3 && !common.has(w)) found.add(w);
  }

  return [...found];
}

function getSkillGroups(): Record<string, string[]> {
  return {
    frontend: ['react', 'angular', 'vue', 'html', 'css', 'javascript', 'typescript', 'tailwind', 'sass', 'redux', 'webpack', 'next'],
    backend: ['node', 'express', 'python', 'java', 'go', 'rust', 'django', 'flask', 'spring', 'graphql', 'rest', 'grpc'],
    cloud: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'jenkins', 'ci/cd'],
    data: ['sql', 'nosql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb', 'kafka', 'machine learning', 'nlp'],
    soft: ['agile', 'scrum', 'leadership', 'mentoring', 'cross-functional', 'communication', 'teamwork', 'problem-solving'],
  };
}

export function scoreResumeLocally(
  resumeText: string,
  jobDescription: string,
): {
  overall: number;
  keyword: number;
  formatting: number;
  readability: number;
  impact: number;
  recruiter: number;
  matched: string[];
  missing: string[];
  suggestions: { type: 'success' | 'warning' | 'primary'; text: string; action: string }[];
  summary: string;
} {
  const jdLower = jobDescription.toLowerCase();
  const resumeLower = resumeText.toLowerCase();

  const jdKeywords = extractKeywords(jobDescription);
  const matched = jdKeywords.filter(k => resumeLower.includes(k.toLowerCase()));
  const missing = jdKeywords.filter(k => !resumeLower.includes(k.toLowerCase()));

  const matchRate = jdKeywords.length > 0 ? matched.length / jdKeywords.length : 0.5;
  const keywordScore = Math.round(matchRate * 100);

  const skillGroups = getSkillGroups();
  const groupHits = Object.entries(skillGroups).filter(([, skills]) =>
    skills.some(s => jdLower.includes(s))
  ).length;
  const groupMatches = Object.entries(skillGroups).filter(([, skills]) =>
    skills.some(s => jdLower.includes(s)) && skills.some(s => resumeLower.includes(s))
  ).length;
  const coverageRate = groupHits > 0 ? groupMatches / groupHits : 0.5;

  const overall = Math.round((keywordScore * 0.6 + coverageRate * 100 * 0.4));

  const suggestions: { type: 'success' | 'warning' | 'primary'; text: string; action: string }[] = [];
  if (missing.length > 0) {
    suggestions.push({
      type: 'warning',
      text: `${missing.length} keywords from the JD are missing in your resume`,
      action: `Add: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`,
    });
  }
  if (matched.length > 5) {
    suggestions.push({
      type: 'success',
      text: `${matched.length} keywords matched — strong alignment`,
      action: 'Highlight these in your profile summary',
    });
  }
  if (coverageRate < 0.5) {
    suggestions.push({
      type: 'primary',
      text: 'Consider adding experience in key skill areas from the JD',
      action: 'Review skill sections',
    });
  }

  return {
    overall,
    keyword: keywordScore,
    formatting: 70,
    readability: 75,
    impact: Math.round(coverageRate * 100),
    recruiter: Math.round((keywordScore + coverageRate * 100) / 2),
    matched: matched.slice(0, 30),
    missing: missing.slice(0, 30),
    suggestions: suggestions.slice(0, 8),
    summary: `${matched.length} of ${jdKeywords.length} keywords matched. ${missing.length} missing. Overall ATS estimate: ${overall}%.`,
  };
}

export function localTailorFallback(): {
  sections: { section: string; changes: { original: string; rewritten: string; reason: string }[] }[];
  summary: { keywords_added: string[]; bullets_rewritten: number; improvement_areas: string[] };
} {
  return {
    sections: [],
    summary: { keywords_added: [], bullets_rewritten: 0, improvement_areas: ['AI rate limited — no tailoring applied'] },
  };
}

const TECH_KEYWORDS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'Go', 'Rust', 'C++', 'C#', 'Ruby', 'PHP',
  'React', 'Angular', 'Vue', 'Node', 'Express', 'Next.js', 'NestJS', 'Django', 'Flask', 'Spring',
  'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes', 'Terraform', 'Jenkins', 'CI/CD',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra',
  'GraphQL', 'REST', 'gRPC', 'WebSocket', 'Kafka', 'RabbitMQ',
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision', 'LLM', 'GPT',
  'SQL', 'NoSQL', 'HTML', 'CSS', 'Sass', 'Tailwind', 'Redux', 'Webpack',
  'Git', 'Linux', 'Bash', 'Nginx', 'Microservices', 'Serverless', 'Lambda',
  'Agile', 'Scrum', 'Kanban', 'Leadership', 'Mentoring',
];

export function localExtractFallback(jdText: string): {
  company: string | null;
  role: string | null;
  required_skills: string[];
  nice_to_have: string[];
  summary: string;
} {
  const companyMatch = jdText.match(/@\s*(\w[\w\s.&]+)/) ||
    jdText.match(/(?:Company|Organization|Employer)[:\s]+(.+)/i) ||
    jdText.match(/^(.*?)(?:is hiring|seeking|looking for|has an opening)/i);
  const company = companyMatch?.[1]?.trim()?.slice(0, 60) ?? null;

  const roleMatch = jdText.match(/(?:Role|Title|Position)[:\s]+(.+)/i) ||
    jdText.match(/(?:hiring|seeking|looking for|we need|join us as)\s+(?:a|an)\s+(.+?)(?:\s+to\s|\s+at\s|\s+with\s|\.|$)/i);
  const role = roleMatch?.[1]?.trim()?.slice(0, 50) ?? null;

  const seniorityMatch = jdText.match(/\b(Senior|Lead|Staff|Principal|Junior|Mid-level|Senior-level|Entry)\b/i);
  const seniority = seniorityMatch?.[1] ?? null;

  const inferredRole = inferConciseRoleTitle(jdText);

  const detectedKeywords = TECH_KEYWORDS.filter((k) =>
    new RegExp(`\\b${k.replace(/[.+*?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(jdText)
  );

  // Classify as required vs nice-to-have
  const lines = jdText.split('\n');
  let inNiceToHave = false;
  const required: string[] = [];
  const nice: string[] = [];

  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.includes('nice to have') || l.includes('nice-to-have') || l.includes('bonus') || l.includes('preferred') || l.includes('plus')) {
      inNiceToHave = true;
      continue;
    }
    if (l.includes('required') || l.includes('must have') || l.includes('must-have') || l.includes('minimum') || l.includes('qualifications')) {
      inNiceToHave = false;
      continue;
    }
    for (const kw of detectedKeywords) {
      if (line.includes(kw)) {
        if (inNiceToHave && !required.includes(kw)) nice.push(kw);
        else if (!required.includes(kw) && !nice.includes(kw)) required.push(kw);
      }
    }
  }

  // If classification failed, put all in required
  if (required.length === 0 && nice.length === 0) {
    detectedKeywords.forEach((k, i) => {
      if (i < Math.ceil(detectedKeywords.length * 0.7)) required.push(k);
      else nice.push(k);
    });
  }

  const title = normalizeRoleTitle(inferredRole ?? role ?? seniority, jdText) ?? 'detected role';
  const summary = `${required.length} skills detected from JD. Role: ${title}. ${company ? `Company: ${company}.` : ''}`;

  return {
    company,
    role: title,
    required_skills: required.slice(0, 30),
    nice_to_have: nice.slice(0, 20),
    summary,
  };
}
