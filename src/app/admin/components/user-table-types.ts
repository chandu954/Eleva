export interface UserData {
  user: {
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string;
    [key: string]: unknown;
  };
  profile: {
    user_id: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone_number?: string;
    location?: string;
    website?: string;
    linkedin_url?: string;
    github_url?: string;
    work_experience?: Array<{
      company?: string;
      title?: string;
      start_date?: string;
      end_date?: string;
      description?: string;
      location?: string;
      [key: string]: unknown;
    }>;
    education?: Array<{
      institution?: string;
      degree?: string;
      field_of_study?: string;
      start_date?: string;
      end_date?: string;
      description?: string;
      [key: string]: unknown;
    }>;
    skills?: Array<{
      category?: string;
      items?: string[];
      [key: string]: unknown;
    }>;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
  } | null;
  subscription: {
    user_id?: string;
    stripe_customer_id?: string;
    subscription_plan?: string;
    subscription_status?: string;
    current_period_end?: string;
    trial_end?: string | null;
    [key: string]: unknown;
  } | null;
  resume_count: number;
}

export interface TrialMeta {
  hasTrial: boolean;
  isTrialing: boolean;
  isExpired: boolean;
  displayDate: string;
}

export type SortableColumns =
  | 'email'
  | 'created_at'
  | 'last_sign_in_at'
  | 'name'
  | 'subscription_plan'
  | 'location'
  | 'work_experience_count'
  | 'education_count'
  | 'skills_count'
  | 'subscription_status'
  | 'current_period_end'
  | 'trial_end'
  | 'resume_count'; // Added resume_count

export function formatDate(dateString?: string) {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getTrialMeta(trialEnd?: string | null): TrialMeta {
  if (!trialEnd) {
    return { hasTrial: false, isTrialing: false, isExpired: false, displayDate: 'N/A' };
  }

  const parsed = new Date(trialEnd);
  if (Number.isNaN(parsed.getTime())) {
    return { hasTrial: true, isTrialing: false, isExpired: false, displayDate: 'Invalid date' };
  }

  const isTrialing = parsed.getTime() > Date.now();
  return {
    hasTrial: true,
    isTrialing,
    isExpired: !isTrialing,
    displayDate: formatDate(trialEnd),
  };
}
