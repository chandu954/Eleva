export interface ResumeScoreMetrics {
  overallScore: {
    score: number;
    reason: string;
  };

  completeness: {
    contactInformation: {
      score: number;
      reason: string;
    };
    detailLevel: {
      score: number;
      reason: string;
    };
  };

  impactScore: {
    activeVoiceUsage: {
      score: number;
      reason: string;
    };
    quantifiedAchievements: {
      score: number;
      reason: string;
    };
  };

  roleMatch: {
    skillsRelevance: {
      score: number;
      reason: string;
    };
    experienceAlignment: {
      score: number;
      reason: string;
    };
    educationFit: {
      score: number;
      reason: string;
    };
  };

  // Job-specific scoring for tailored resumes
  jobAlignment?: {
    keywordMatch: {
      score: number;
      reason: string;
      matchedKeywords?: string[];
      missingKeywords?: string[];
    };
    requirementsMatch: {
      score: number;
      reason: string;
      matchedRequirements?: string[];
      gapAnalysis?: string[];
    };
    companyFit: {
      score: number;
      reason: string;
      suggestions?: string[];
    };
  };

  miscellaneous: {
    [key: string]: {
      score: number;
      reason: string;
    };
  };

  overallImprovements?: string[];
  jobSpecificImprovements?: string[];
  isTailoredResume?: boolean;
}
