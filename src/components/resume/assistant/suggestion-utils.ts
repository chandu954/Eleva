import type { Education, Project, Skill, WorkExperience } from "@/lib/types";
import type { RewriteMode } from "@/app/eleva/api/tool/rewrite/rewrite-utils";

/**
 * Pure helpers for the AI assistant suggestion cards, extracted from
 * suggestions.tsx so preview/diff behavior is unit-testable. No UI imports.
 */

export type SuggestionContent = WorkExperience | Project | Skill | Education;

export type SuggestionType = 'work_experience' | 'project' | 'skill' | 'education';

export function prettifyActionVerb(text: string, mode: RewriteMode): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  const replacements: Partial<Record<RewriteMode, Array<[RegExp, string]>>> = {
    professional: [[/^(helped|assisted|supported)\b/i, 'Improved']],
    technical: [[/^(helped|assisted|supported)\b/i, 'Implemented']],
    recruiter: [[/^(helped|assisted|supported)\b/i, 'Delivered']],
    ats: [[/^(helped|assisted|supported)\b/i, 'Implemented']],
    executive: [[/^(helped|assisted|supported)\b/i, 'Led']],
    shorter: [],
    longer: [[/^(helped|assisted|supported)\b/i, 'Expanded']],
    'more-metrics': [[/^(helped|assisted|supported)\b/i, 'Improved']],
    'more-leadership': [[/^(helped|assisted|supported)\b/i, 'Owned']],
  };

  let next = trimmed;
  for (const [pattern, replacement] of replacements[mode] ?? []) {
    next = next.replace(pattern, replacement);
  }

  if (mode === 'shorter') {
    next = next.split(/[.;]/)[0] ?? next;
  }

  if (mode === 'more-leadership' && !/^(led|owned|spearheaded|drove|managed|coordinated)\b/i.test(next)) {
    next = `Owned ${next.charAt(0).toLowerCase()}${next.slice(1)}`;
  }

  return next.trim().replace(/\s+/g, ' ');
}

export function buildModePreviewContent(content: SuggestionContent, mode: RewriteMode, type: SuggestionType): SuggestionContent {
  if (type === 'work_experience' && 'description' in content && Array.isArray(content.description)) {
    const rewrittenDescription = content.description.map((point, index) => {
      const withVerb = prettifyActionVerb(point, mode);
      if (mode === 'executive' && index === 0) {
        return withVerb.replace(/^./, (char) => char.toUpperCase()) + ' while aligning cross-functional priorities.';
      }
      if (mode === 'ats' && index === 0) {
        return `${withVerb} using role-relevant terminology.`;
      }
      if (mode === 'more-metrics' && /\d/.test(point)) {
        return withVerb;
      }
      return withVerb;
    });
    return { ...content, description: rewrittenDescription } as SuggestionContent;
  }

  if (type === 'project' && 'description' in content && Array.isArray(content.description)) {
    const rewrittenDescription = content.description.map((point, index) => {
      const base = prettifyActionVerb(point, mode);
      if (mode === 'technical' && index === 0) return `${base} with a focus on architecture and implementation details.`;
      if (mode === 'recruiter' && index === 0) return `${base} so the business impact is obvious at a glance.`;
      return base;
    });
    return { ...content, description: rewrittenDescription } as SuggestionContent;
  }

  if (type === 'skill' && 'items' in content && Array.isArray(content.items)) {
    const reordered = [...content.items];
    if (mode === 'ats' || mode === 'technical') {
      reordered.sort((a, b) => a.localeCompare(b));
    }
    if (mode === 'shorter') {
      return { ...content, items: reordered.slice(0, Math.max(1, Math.ceil(reordered.length * 0.7))) } as SuggestionContent;
    }
    return {
      ...content,
      items: reordered.map((item) => prettifyActionVerb(item, mode)),
    } as SuggestionContent;
  }

  if (type === 'education' && 'achievements' in content && Array.isArray(content.achievements)) {
    const achievements = content.achievements.map((achievement, index) => {
      const base = prettifyActionVerb(achievement, mode);
      return index === 0 && mode === 'professional' ? `${base} with strong academic performance.` : base;
    });
    return { ...content, achievements } as SuggestionContent;
  }

  if ('description' in content && Array.isArray(content.description)) {
    return { ...content, description: content.description.map((point) => prettifyActionVerb(point, mode)) } as SuggestionContent;
  }

  if ('items' in content && Array.isArray(content.items)) {
    return { ...content, items: content.items.map((item) => prettifyActionVerb(item, mode)) } as SuggestionContent;
  }

  if ('achievements' in content && Array.isArray(content.achievements)) {
    return { ...content, achievements: content.achievements.map((achievement) => prettifyActionVerb(achievement, mode)) } as SuggestionContent;
  }

  return content;
}

export function getPreviewSnippets(content: SuggestionContent, type: SuggestionType): string[] {
  if (type === 'work_experience' && 'description' in content && Array.isArray(content.description)) {
    const exp = content as WorkExperience;
    return [
      `${exp.position}${exp.company ? ` · ${exp.company}` : ''}`,
      ...(exp.description.slice(0, 2) || []),
    ];
  }

  if (type === 'project' && 'description' in content && Array.isArray(content.description)) {
    const proj = content as Project;
    return [
      proj.name,
      ...(proj.description.slice(0, 2) || []),
    ];
  }

  if (type === 'skill' && 'items' in content && Array.isArray(content.items)) {
    return [content.category, content.items.slice(0, 6).join(', ')];
  }

  if (type === 'education' && 'achievements' in content && Array.isArray(content.achievements)) {
    return [
      `${content.degree} in ${content.field}`,
      content.school,
      ...(content.achievements.slice(0, 2) || []),
    ];
  }

  if ('description' in content && Array.isArray(content.description)) {
    return content.description.slice(0, 2);
  }

  if ('items' in content && Array.isArray(content.items)) {
    return [content.category, content.items.slice(0, 6).join(', ')];
  }

  if ('achievements' in content && Array.isArray(content.achievements)) {
    return [content.school, ...(content.achievements.slice(0, 2) || [])];
  }

  return [];
}

export function compareDescriptions(current: string, suggested: string): {
  text: string;
  isNew: boolean;
  isBold: boolean;
  isStart: boolean;
  isEnd: boolean;
}[] {
  // Clean the text by normalizing spaces and removing extra whitespace
  const cleanText = (text: string): string => {
    return text.trim().replace(/\s+/g, ' ');
  };

  // Split text into words, preserving bold markdown
  const splitText = (text: string): string[] => {
    // First, split by bold markdown
    const parts = text.split(/(\*\*[^*]+\*\*)/).filter(Boolean);

    // Then split non-bold parts by spaces while preserving bold parts
    return parts.flatMap(part => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return [part];
      }
      return part.split(/\s+/).filter(Boolean);
    });
  };

  const currentText = cleanText(current);
  const suggestedText = cleanText(suggested);

  const currentWords = splitText(currentText);
  const suggestedWords = splitText(suggestedText);

  return suggestedWords.map((word, index) => {
    const isBold = word.startsWith('**') && word.endsWith('**');
    const cleanedWord = isBold ? word.slice(2, -2) : word;

    // Check if the word exists in current text (considering bold status)
    const isNew = !currentWords.some(currentWord => {
      const currentIsBold = currentWord.startsWith('**') && currentWord.endsWith('**');
      const currentCleaned = currentIsBold ? currentWord.slice(2, -2) : currentWord;
      return currentCleaned === cleanedWord;
    });

    // Check if adjacent words are new
    const prevWord = index > 0 ? suggestedWords[index - 1] : null;
    const nextWord = index < suggestedWords.length - 1 ? suggestedWords[index + 1] : null;

    const prevIsNew = prevWord ? !currentWords.includes(prevWord) : false;
    const nextIsNew = nextWord ? !currentWords.includes(nextWord) : false;

    return {
      text: cleanedWord,
      isNew,
      isBold,
      isStart: isNew && !prevIsNew,
      isEnd: isNew && !nextIsNew
    };
  });
}

export function isNewItem<T>(current: T[] | undefined, suggested: T[] | undefined, item: T): boolean {
  if (!current) return true;
  return !current.includes(item);
}
