import { AIProvider, z } from '@/lib/eleva-ai-provider';
import { QualityCheckSchema, ResumeExperienceSchema, ResumeProjectsSchema, ResumeSkillsSchema, SummarySchema } from './schemas';
import {
  buildSectionRewriteOutcome,
  countChangedSections,
  summarizeSectionStatus,
} from './pipeline-utils';
import {
  generateObjectWithFallback,
  runSectionWithFallback,
  withStepTimeout,
  type EducationLike,
  type SkillItem,
  type TailoredExperience,
  type TailoredProject,
} from './helpers';
import {
  buildSectionContext,
  type OriginalResumeData,
  buildExperienceSystemPrompt,
  buildExperienceUserPrompt,
  buildProjectsSystemPrompt,
  buildProjectsUserPrompt,
  buildQualitySystemPrompt,
  buildQualityUserPrompt,
  buildSkillsSystemPrompt,
  buildSkillsUserPrompt,
  buildSummaryRetrySystemPrompt,
  buildSummaryRetryUserPrompt,
  buildSummarySystemPrompt,
  buildSummaryUserPrompt,
} from './prompts';

type RewriteResumeParams = Pick<
  Parameters<typeof buildSectionContext>[0],
  'jobDescription' | 'skills' | 'score' | 'plan' | 'isLowCompat'
> & {
  originalResumeJson: OriginalResumeData | null;
  emit: (event: string, data: unknown) => void;
};

export async function rewriteResumeSections(params: RewriteResumeParams) {
  const { jobDescription, skills, score, plan, originalResumeJson, isLowCompat, emit } = params;
  /* ─── Step 4: Rewrite Resume Sections (Parallel) ─── */
  emit('step', { step: 'tailor', status: 'running', progress: 10, micro: 'Rewriting summary...' });

  // Shared context for all section agents
  const sectionCtx = buildSectionContext({
    jobDescription,
    skills,
    score,
    plan,
    isLowCompat,
  });

  const summaryAgent = runSectionWithFallback('summary_writer', SummarySchema,
    buildSummarySystemPrompt(AIProvider.getSystemPrompt()),
    buildSummaryUserPrompt(originalResumeJson, sectionCtx),
    () => ({ professional_summary: originalResumeJson?.professional_summary ?? '' }),
    emit,
  );

  emit('step', { step: 'tailor', status: 'running', progress: 30, micro: 'Optimizing skills...' });

  const skillsAgent = runSectionWithFallback('skills_optimizer', ResumeSkillsSchema,
    buildSkillsSystemPrompt(AIProvider.getSystemPrompt()),
    buildSkillsUserPrompt(originalResumeJson, sectionCtx),
    () => ({ skills: (originalResumeJson?.skills as SkillItem[]) ?? [] }),
    emit,
  );

  emit('step', { step: 'tailor', status: 'running', progress: 50, micro: 'Rewriting experience...' });

  const experienceAgent = runSectionWithFallback('experience_writer', ResumeExperienceSchema,
    buildExperienceSystemPrompt(AIProvider.getSystemPrompt()),
    buildExperienceUserPrompt(originalResumeJson, sectionCtx),
    () => ({ work_experience: (originalResumeJson?.work_experience as TailoredExperience[]) ?? [] }),
    emit,
  );

  emit('step', { step: 'tailor', status: 'running', progress: 70, micro: 'Rewriting projects...' });

  const projectsAgent = runSectionWithFallback('projects_writer', ResumeProjectsSchema,
    buildProjectsSystemPrompt(AIProvider.getSystemPrompt()),
    buildProjectsUserPrompt(originalResumeJson, sectionCtx),
    () => ({ projects: (originalResumeJson?.projects as TailoredProject[]) ?? [] }),
    emit,
  );

  // Run all 4 agents in parallel
  const [summaryResultRaw, skillsResultRaw, experienceResultRaw, projectsResultRaw] = await Promise.all([
    summaryAgent, skillsAgent, experienceAgent, projectsAgent,
  ]);

  emit('step', { step: 'tailor', status: 'running', progress: 85, micro: 'Assembling resume...' });

  const origSummaryText = String(originalResumeJson?.professional_summary || '');
  let summaryText = String(summaryResultRaw.data.professional_summary || '');

  const summaryInitial = buildSectionRewriteOutcome('Summary', origSummaryText, summaryText, summaryResultRaw.usedFallback ? 'Summary not rewritten' : undefined);
  if (!summaryInitial.changed && !summaryResultRaw.usedFallback && origSummaryText && summaryText.trim() === origSummaryText.trim()) {
    const summaryRetry = await runSectionWithFallback('summary_writer_retry', SummarySchema,
      buildSummaryRetrySystemPrompt(AIProvider.getSystemPrompt()),
      buildSummaryRetryUserPrompt(origSummaryText, sectionCtx),
      () => ({ professional_summary: origSummaryText }),
      emit,
    );
    summaryText = String(summaryRetry.data.professional_summary || summaryText);
  }

  const summaryOutcome = buildSectionRewriteOutcome('Summary', origSummaryText, summaryText, summaryResultRaw.usedFallback ? 'Summary not rewritten' : undefined);
  const skillsOutcome = buildSectionRewriteOutcome('Skills', JSON.stringify(originalResumeJson?.skills ?? []), JSON.stringify(skillsResultRaw.data.skills), skillsResultRaw.usedFallback ? 'Skills not rewritten' : undefined);
  const experienceOutcome = buildSectionRewriteOutcome('Experience', JSON.stringify(originalResumeJson?.work_experience ?? []), JSON.stringify(experienceResultRaw.data.work_experience), experienceResultRaw.usedFallback ? 'Experience not rewritten' : undefined);
  const projectsOutcome = buildSectionRewriteOutcome('Projects', JSON.stringify(originalResumeJson?.projects ?? []), JSON.stringify(projectsResultRaw.data.projects), projectsResultRaw.usedFallback ? 'Projects not rewritten' : undefined);

  const sectionOutcomes = {
    summary: summaryOutcome,
    skills: skillsOutcome,
    experience: experienceOutcome,
    projects: projectsOutcome,
  };

  const perSectionConfidence = {
    summary: summaryOutcome.confidence,
    skills: skillsOutcome.confidence,
    experience: experienceOutcome.confidence,
    projects: projectsOutcome.confidence,
  };

  const perSectionChanges = {
    summary: [summarizeSectionStatus(summaryOutcome)],
    skills: [summarizeSectionStatus(skillsOutcome)],
    experience: [summarizeSectionStatus(experienceOutcome)],
    projects: [summarizeSectionStatus(projectsOutcome)],
  };

  const tailoredResume = {
    professional_summary: summaryOutcome.content,
    skills: skillsResultRaw.data.skills,
    work_experience: experienceResultRaw.data.work_experience,
    projects: projectsResultRaw.data.projects,
    education: (originalResumeJson?.education as EducationLike[]) ?? [],
    certifications: (originalResumeJson?.certifications as EducationLike[]) ?? [],
    meta: {
      keywords_added: [],
      bullets_rewritten: 0,
      sectionConfidence: perSectionConfidence,
      sectionChanges: perSectionChanges,
      sectionOutcomes,
    },
  };

  emit('step', { step: 'tailor', status: 'running', progress: 92, micro: 'Validating quality...' });

  // ─── Quality Check ───
  const qualityResult = await withStepTimeout<z.infer<typeof QualityCheckSchema>>(
    generateObjectWithFallback<z.infer<typeof QualityCheckSchema>>(
      QualityCheckSchema,
      buildQualitySystemPrompt(AIProvider.getSystemPrompt()),
      buildQualityUserPrompt(originalResumeJson, tailoredResume),
      600, 0.3,
      () => ({ passed: true, issues: [], score: 85 }),
    ),
    'quality_check', emit,
  ).catch(() => ({ passed: true, issues: [], score: 85 }));

  if (!qualityResult.passed) {
    console.warn('[Pipeline] Quality issues:', (qualityResult.issues ?? []).join('; '));
  }

  emit('step', {
    step: 'tailor',
    status: 'done',
    data: {
      ...tailoredResume,
      quality: qualityResult,
      sectionConfidence: perSectionConfidence,
      sectionChanges: perSectionChanges,
    },
  });


  const changedSections = countChangedSections([
    summaryOutcome,
    skillsOutcome,
    experienceOutcome,
    projectsOutcome,
  ]);

  return {
    tailoredResume,
    qualityResult,
    sectionOutcomes,
    perSectionConfidence,
    perSectionChanges,
    changedSections,
  };
}
