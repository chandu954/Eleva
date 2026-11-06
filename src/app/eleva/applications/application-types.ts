export type Status =
  | 'wishlist'
  | 'applied'
  | 'interview'
  | 'offer'
  | 'rejected'
  | 'archived';

export type Application = {
  id: string;
  company: string;
  role: string;
  status: Status;
  location?: string | null;
  salary?: string | null;
  recruiter?: string | null;
  deadline?: string | null;
  priority: 'low' | 'medium' | 'high';
  job_description?: string | null;
  job_url?: string | null;
  notes?: string | null;
  resume_id?: string | null;
  cover_letter_id?: string | null;
  source?: string | null;
  match_score?: number | null;
  ats_score?: number | null;
  applied_at?: string | null;
  interview_at?: string | null;
  pinned?: boolean;
  favorite?: boolean;
  created_at: string;
  updated_at: string;
};

export const COLUMNS: { id: Status; name: string; color: string }[] = [
  { id: 'wishlist', name: 'Wishlist', color: 'rgb(var(--eleva-muted-fg))' },
  { id: 'applied', name: 'Applied', color: 'rgb(var(--eleva-primary))' },
  { id: 'interview', name: 'Interview', color: 'rgb(var(--eleva-warning))' },
  { id: 'offer', name: 'Offer', color: 'rgb(var(--eleva-success))' },
  { id: 'rejected', name: 'Rejected', color: 'rgb(239 68 68)' },
];
