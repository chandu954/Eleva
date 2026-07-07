export type Resume = {
  id: string;
  user_id: string;
  name: string;
  target_role: string | null;
  updated_at: string;
  is_base_resume: boolean;
  document_settings?: { template?: string } | null;
  professional_summary?: string | null;
};
