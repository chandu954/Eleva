import type { Profile, WorkExperience, Education, Project } from "@/lib/types";

/**
 * Normalizes the loose AI-extracted object from formatProfileWithAI into the
 * database-shaped Partial<Profile> that importResume/profile saving expects.
 *
 * Extracted from ProfileEditForm's handleResumeUpload so the defensive field
 * fallbacks (which papers over a deliberately loose AI result surface) are
 * unit-testable. The rules are behavior-preserving from the inline version:
 * scalar fields fall back to null; missing list shapes fall back to []; a
 * non-array description is wrapped into a one-element array; skills accept
 * either `skills` or `items` keys.
 */

export interface ImportedProfileShape {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  location?: string | null;
  website?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  work_experience?: unknown;
  education?: unknown;
  skills?: unknown;
  projects?: unknown;
}

export function normalizeImportedProfile(result: ImportedProfileShape): Partial<Profile> {
  return {
    first_name: result.first_name || null,
    last_name: result.last_name || null,
    email: result.email || null,
    phone_number: result.phone_number || null,
    location: result.location || null,
    website: result.website || null,
    linkedin_url: result.linkedin_url || null,
    github_url: result.github_url || null,
    work_experience: Array.isArray(result.work_experience)
      ? (result.work_experience as Partial<WorkExperience>[]).map((exp) => ({
          company: exp.company || '',
          position: exp.position || '',
          location: exp.location || '',
          date: exp.date || '',
          description: Array.isArray(exp.description)
            ? exp.description
            : [exp.description || ''],
          technologies: Array.isArray(exp.technologies)
            ? exp.technologies
            : []
        }))
      : [],
    education: Array.isArray(result.education)
      ? (result.education as Partial<Education>[]).map((edu) => ({
          school: edu.school || '',
          degree: edu.degree || '',
          field: edu.field || '',
          location: edu.location || '',
          date: edu.date || '',
          gpa: edu.gpa ? parseFloat(edu.gpa.toString()) : undefined,
          achievements: Array.isArray(edu.achievements)
            ? edu.achievements
            : []
        }))
      : [],
    skills: Array.isArray(result.skills)
      ? (result.skills as { category: string; skills?: string[]; items?: string[] }[]).map((skill) => ({
          category: skill.category || '',
          items: Array.isArray(skill.skills)
            ? skill.skills
            : Array.isArray(skill.items)
              ? skill.items
              : []
        }))
      : [],
    projects: Array.isArray(result.projects)
      ? (result.projects as Partial<Project>[]).map((proj) => ({
          name: proj.name || '',
          description: Array.isArray(proj.description)
            ? proj.description
            : [proj.description || ''],
          technologies: Array.isArray(proj.technologies)
            ? proj.technologies
            : [],
          url: proj.url || undefined,
          github_url: proj.github_url || undefined,
          date: proj.date || ''
        }))
      : []
  };
}
