import type {
  ExperienceRow, ProjectRow, SkillCategory, EducationRow,
  CertificationRow, AchievementRow, LanguageRow, PreferencesRow,
} from '../../_lib/actions-career';

export type Profile = {
  user_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  headline?: string | null;
  email?: string | null;
  phone_number?: string | null;
  location?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  portfolio_url?: string | null;
  leetcode_url?: string | null;
  hackerrank_url?: string | null;
  twitter_url?: string | null;
  professional_summary?: string | null;
  photo_url?: string | null;
  work_experience?: ExperienceRow[];
  education?: EducationRow[];
  skills?: SkillCategory[];
  projects?: ProjectRow[];
  certifications?: CertificationRow[];
  achievements?: AchievementRow[];
  languages?: LanguageRow[];
  preferences?: Partial<PreferencesRow>;
  profile_completion?: number;
};
