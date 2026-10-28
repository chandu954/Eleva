export type SectionId = 'summary' | 'experience' | 'projects' | 'skills' | 'education' | 'certificates';

export interface BulletItem {
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

export interface ExperienceEntry {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  bullets: BulletItem[];
}

export interface ProjectEntry {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url: string;
  bullets: BulletItem[];
}

export interface SkillCategory {
  id: string;
  category: string;
  items: string[];
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  field: string;
  gpa: string;
  startDate: string;
  endDate: string;
}

export interface CertificateEntry {
  id: string;
  name: string;
  issuer: string;
  date: string;
  credentialUrl: string;
}

export interface ResumeData {
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

export type HistorySnapshot = { data: ResumeData; selection: { section: SectionId; itemIndex?: number } };

export function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export const initialResume: ResumeData = {
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

export function getSectionCount(data: ResumeData, key: keyof ResumeData): number {
  if (key === 'summary') return data.summary ? 1 : 0;
  const val = data[key];
  return Array.isArray(val) ? val.length : 0;
}
