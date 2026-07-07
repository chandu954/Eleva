export type ResumeTemplate = {
  id: string;
  name: string;
  category: 'modern' | 'executive' | 'minimal' | 'creative' | 'ats' | 'technical';
  tier: 'free' | 'pro';
  description: string;
  accent: string;
  layout: 'single-column' | 'two-column' | 'sidebar' | 'timeline';
  fontPair: string;
  atsScore: number;
};

export const TEMPLATES: ResumeTemplate[] = [
  { id: 'linear',     name: 'Linear',     category: 'modern',    tier: 'free', description: 'Clean, technical, opinionated. Perfect for eng ICs.',           accent: '#5E6AD2', layout: 'single-column', fontPair: 'Inter · JetBrains Mono', atsScore: 96 },
  { id: 'vercel',     name: 'Vercel',     category: 'modern',    tier: 'free', description: 'Monochrome minimalism with a hairline underline system.',       accent: '#000000', layout: 'single-column', fontPair: 'Geist Sans · Geist Mono', atsScore: 98 },
  { id: 'stripe',     name: 'Stripe',     category: 'executive', tier: 'pro',  description: 'Premium editorial serif headings, dense info hierarchy.',       accent: '#635BFF', layout: 'two-column',    fontPair: 'Söhne · Söhne Mono',  atsScore: 92 },
  { id: 'notion',     name: 'Notion',     category: 'minimal',   tier: 'free', description: 'Playful minimal with generous whitespace and callouts.',        accent: '#2F80ED', layout: 'single-column', fontPair: 'Inter · Inter',       atsScore: 94 },
  { id: 'arc',        name: 'Arc',        category: 'creative',  tier: 'pro',  description: 'Gradient sidebar with subtle glass panels.',                    accent: '#FF4785', layout: 'sidebar',       fontPair: 'Inter · Inter',       atsScore: 88 },
  { id: 'ats-safe',   name: 'ATS Safe',   category: 'ats',       tier: 'free', description: 'Bulletproof for any parser. Zero styling risk.',                accent: '#374151', layout: 'single-column', fontPair: 'Helvetica · Arial',    atsScore: 100 },
  { id: 'staff-eng',  name: 'Staff Eng',  category: 'technical', tier: 'pro',  description: 'For staff+ engineers. Compact, metric-dense, senior tone.',     accent: '#059669', layout: 'two-column',    fontPair: 'IBM Plex Sans · IBM Plex Mono', atsScore: 95 },
  { id: 'founder',    name: 'Founder',    category: 'executive', tier: 'pro',  description: 'Executive layout for founders and directors.',                  accent: '#B45309', layout: 'single-column', fontPair: 'Fraunces · Inter',    atsScore: 90 },
  { id: 'timeline',   name: 'Timeline',   category: 'creative',  tier: 'pro',  description: 'Vertical timeline highlighting your trajectory.',               accent: '#7C3AED', layout: 'timeline',      fontPair: 'Manrope · Manrope',   atsScore: 86 },
  { id: 'compact',    name: 'Compact',    category: 'ats',       tier: 'free', description: 'Fits 15 years of experience on a single page.',                 accent: '#1F2937', layout: 'single-column', fontPair: 'Arial · Arial',       atsScore: 99 },
  { id: 'monospace',  name: 'Monospace',  category: 'technical', tier: 'free', description: 'For hackers. Pure monospace, GitHub-inspired.',                 accent: '#0EA5E9', layout: 'single-column', fontPair: 'JetBrains Mono · JetBrains Mono', atsScore: 91 },
  { id: 'editorial',  name: 'Editorial',  category: 'minimal',   tier: 'pro',  description: 'Magazine-style editorial with drop caps.',                     accent: '#111827', layout: 'two-column',    fontPair: 'Playfair · Inter',    atsScore: 89 },
];

export const CATEGORIES = [
  { id: 'all',       label: 'All' },
  { id: 'modern',    label: 'Modern' },
  { id: 'executive', label: 'Executive' },
  { id: 'minimal',   label: 'Minimal' },
  { id: 'creative',  label: 'Creative' },
  { id: 'ats',       label: 'ATS' },
  { id: 'technical', label: 'Technical' },
] as const;
