import type { Resume } from '@/lib/types';
import type { AIConfig } from '@/utils/ai-tools';
import type { Job as ZodJob } from '@/lib/zod-schemas';
import { generateObject } from 'ai';
import { resumeScoreSchema } from '@/lib/zod-schemas';
import { getSubscriptionPlan } from '../stripe/actions';
import { withTaskModel } from '@/lib/ai/task-models';
import { runTrackedAIRequest } from './resume-action-helpers';

export async function generateResumeScoreInternal(
  resume: Resume,
  job?: ZodJob | null,
  config?: AIConfig
) {


  const { plan, id } = await getSubscriptionPlan(true);
  const isPro = plan === 'pro';

  const isTailoredResume = job && !resume.is_base_resume;

  const resumeForScoring = {
    target_role: resume.target_role,
    is_base_resume: resume.is_base_resume,
    contact: {
      first_name: resume.first_name,
      last_name: resume.last_name,
      email: resume.email,
      phone_number: resume.phone_number,
      location: resume.location,
      website: resume.website,
      linkedin_url: resume.linkedin_url,
      github_url: resume.github_url,
    },
    work_experience: resume.work_experience,
    education: resume.education,
    skills: resume.skills,
    projects: resume.projects,
  };

  const jobForScoring = job
    ? {
        company_name: job.company_name,
        position_title: job.position_title,
        description: job.description,
        location: job.location,
        salary_range: job.salary_range,
        keywords: job.keywords,
        work_location: job.work_location,
        employment_type: job.employment_type,
      }
    : null;

  try {
    let prompt = `
    Generate a comprehensive score for this resume: ${JSON.stringify(resumeForScoring)}

    MUST include a 'miscellaneous' field with 2-3 metrics following this format:
    {
      "metricName": {
        "score": number,
        "reason": "string explanation"
      }
    }
    Example:
    "keywordOptimization": {
      "score": 85,
      "reason": "Good use of industry keywords but could add more variation"
    }
    `;

    // Enhanced prompt for tailored resumes with job context
    if (isTailoredResume) {
      prompt += `

      THIS IS A TAILORED RESUME FOR A SPECIFIC JOB. Job details: ${JSON.stringify(jobForScoring)}

      IMPORTANT: Since this is a tailored resume, you MUST include the 'jobAlignment' field with detailed analysis:

      1. KEYWORD MATCH ANALYSIS:
         - Compare resume content with job description keywords
         - Identify matched keywords and missing critical keywords
         - Score based on keyword density and relevance

      2. REQUIREMENTS MATCH ANALYSIS:
         - Analyze how well the resume addresses job requirements
         - Identify which requirements are clearly addressed
         - Highlight gaps where requirements aren't demonstrated

      3. COMPANY FIT ANALYSIS:
         - Assess alignment with company culture/values (if mentioned in job description)
         - Evaluate positioning for this specific role
         - Suggest improvements for better company alignment

      ALSO INCLUDE:
      - Set 'isTailoredResume' to true
      - Provide 'jobSpecificImprovements' with 3-5 specific suggestions for this job
      - Weight the overall score more heavily on job alignment factors

      Focus on actionable insights that help the candidate better align their resume with this specific opportunity.
      `;
    } else {
      prompt += `

      This is a base resume (not tailored to a specific job).
      - Set 'isTailoredResume' to false
      - Do NOT include the 'jobAlignment' field
      - Focus on general resume best practices and improvements
      `;
    }

    const { object } = await runTrackedAIRequest({
      route: 'actions.resumes.generateResumeScore',
      userId: id,
      isPro,
      config: withTaskModel({ task: "resumeScoring", isPro, config }),
    }, (aiClient, telemetry) => generateObject({
      model: aiClient,
      experimental_telemetry: telemetry,
      schema: resumeScoreSchema,
      prompt
    }));

    return object
  } catch (error) {
    console.error('Error SCORING resume:', error);
    throw error;
  }
}
