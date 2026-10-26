'use client';

import { cn } from "@/lib/utils";
import Tiptap from "@/components/ui/tiptap";
import { WorkExperience, Project, Skill, Education } from "@/lib/types";
import { compareDescriptions, isNewItem } from "./suggestion-utils";

const DIFF_HIGHLIGHT_CLASSES = "bg-green-300 px-1  rounded-sm";

interface WorkExperienceSuggestionProps {
  content: WorkExperience;
  currentContent: WorkExperience | null;
}

export function SnippetLine({ label, lines, variant }: { label: string; lines: string[]; variant: 'before' | 'preview' }) {
  return (
    <div className={cn(
      "rounded-lg border px-3 py-2",
      variant === 'before' ? 'bg-slate-50 border-slate-200' : 'bg-purple-50 border-purple-200'
    )}>
      <div className={cn(
        "text-[10px] font-mono uppercase tracking-widest mb-1",
        variant === 'before' ? 'text-slate-500' : 'text-purple-700'
      )}>{label}</div>
      <div className="space-y-1 text-[12px] leading-relaxed">
        {lines.filter(Boolean).slice(0, 3).map((line, index) => (
          <div key={`${label}-${index}`} className={variant === 'preview' && index === 0 ? 'font-medium text-purple-950' : 'text-slate-800'}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WorkExperienceSuggestion({ content: work, currentContent: currentWork }: WorkExperienceSuggestionProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <h3 className={cn(
            "text-base font-bold text-gray-900",
            !currentWork || currentWork.position !== work.position && DIFF_HIGHLIGHT_CLASSES
          )}>
            {work.position.replace(/\*\*/g, '')}
          </h3>
          <p className={cn(
            "text-xs text-gray-700",
            !currentWork || currentWork.company !== work.company && DIFF_HIGHLIGHT_CLASSES
          )}>
            {work.company}
          </p>
        </div>
        <span className={cn(
          "text-[10px] text-gray-600",
          !currentWork || currentWork.date !== work.date && DIFF_HIGHLIGHT_CLASSES
        )}>
          {work.date}
        </span>
      </div>
      <div className="space-y-1.5">
        {work.description.map((point, index) => {
          const currentPoint = currentWork?.description?.[index];
          const comparedWords = currentPoint
            ? compareDescriptions(currentPoint, point)
            : [{ text: point.replace(/\*\*/g, ''), isNew: true, isBold: false, isStart: true, isEnd: true }];

          return (
            <div key={index} className="flex items-start gap-1.5">
              <span className="text-gray-800 mt-0.5 text-xs">•</span>
              <p className="text-sm text-gray-800 flex-1 flex flex-wrap">
                {comparedWords.map((word, wordIndex) => (
                  <span
                    key={wordIndex}
                    className={cn(
                      "inline-flex items-center",
                      word.isStart && "rounded-l-sm pl-1",
                      word.isEnd && "rounded-r-sm pr-1",
                      wordIndex < comparedWords.length - 1 && "mr-1",
                      word.isNew && "bg-green-300 px-1 mx-0",
                    )}
                  >
                    {word.isBold ? (
                      <strong>{word.text}</strong>
                    ) : (
                      word.text
                    )}
                  </span>
                ))}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ProjectSuggestionProps {
  content: Project;
  currentContent: Project | null;
}

export function ProjectSuggestion({ content: project, currentContent: currentProject }: ProjectSuggestionProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <h3 className={cn(
          "text-lg font-bold text-gray-900",
          !currentProject || currentProject.name !== project.name && DIFF_HIGHLIGHT_CLASSES
        )}>
          {project.name}
        </h3>
        {project.date && (
          <span className={cn(
            "text-xs text-gray-600",
            !currentProject || currentProject.date !== project.date && DIFF_HIGHLIGHT_CLASSES
          )}>
            {project.date}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {project.description.map((point, index) => {
          const currentPoint = currentProject?.description?.[index];
          const comparedWords = currentPoint
            ? compareDescriptions(currentPoint, point)
            : [{ text: point.replace(/\*\*/g, ''), isNew: true, isBold: false, isStart: true, isEnd: true }];

          return (
            <div key={index} className="flex items-start gap-1.5">
              <span className="text-gray-800 mt-0.5 text-xs">•</span>
              <p className="text-xs text-gray-800 flex-1 flex flex-wrap">
                {comparedWords.map((word, wordIndex) => (
                  <span
                    key={wordIndex}
                    className={cn(
                      "inline-flex items-center",
                      word.isNew && "bg-green-300",
                      word.isStart && "rounded-l-sm pl-1",
                      word.isEnd && "rounded-r-sm pr-1",
                      wordIndex < comparedWords.length - 1 && "mr-1",
                      word.isNew && "bg-green-300 px-1 mx-0",
                    )}
                  >
                    {word.isBold ? (
                      <strong>{word.text}</strong>
                    ) : (
                      word.text
                    )}
                  </span>
                ))}
              </p>
            </div>
          );
        })}
      </div>
      {project.technologies && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {project.technologies.map((tech, index) => (
            <span
              key={index}
              className={cn(
                "px-2 py-0.5 text-xs rounded-full border text-gray-700",
                !currentProject || isNewItem(currentProject.technologies, project.technologies, tech)
                  ? DIFF_HIGHLIGHT_CLASSES
                  : "bg-gray-100/80 border-gray-200/60"
              )}
            >
              {tech.replace(/\*\*/g, '')}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

interface SkillSuggestionProps {
  content: Skill;
  currentContent: Skill | null;
}

export function SkillSuggestion({ content: skill, currentContent: currentSkill }: SkillSuggestionProps) {
  return (
    <div className="space-y-3">
      <div className="flex-1">
        <Tiptap
          content={skill.category}
          onChange={() => {}}
          readOnly={true}
          variant="skill"
          className={cn(
            "text-sm font-semibold tracking-wide",
            "bg-transparent",
            "border-none shadow-none",
            !currentSkill || currentSkill.category !== skill.category && "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 px-2 py-1 rounded-md"
          )}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {skill.items.map((item, index) => {
          const isNew = !currentSkill || isNewItem(currentSkill.items, skill.items, item);

          return (
            <div
              key={index}
              className={cn(
                "relative group transition-all duration-500",
                "rounded-lg overflow-hidden",
                isNew ? [
                  "bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-50",
                  "border border-emerald-200",
                  "shadow-sm shadow-emerald-100",
                ] : [
                  "bg-gradient-to-br from-gray-50 via-white to-gray-50",
                  "border border-gray-200/60",
                  "shadow-sm",
                ],
                "hover:-translate-y-0.5 hover:shadow-md",
                "transition-all duration-500 ease-in-out"
              )}
            >
              <div className={cn(
                "absolute inset-0 opacity-0 transition-opacity duration-500",
                "group-hover:opacity-100",
                isNew
                  ? "bg-gradient-to-br from-emerald-100/50 via-teal-100/50 to-emerald-100/50"
                  : "bg-gradient-to-br from-gray-100/50 via-white to-gray-100/50"
              )} />

              <div className="relative px-3 py-1.5">
                <Tiptap
                  content={item}
                  onChange={() => {}}
                  readOnly={true}
                  variant="skill"
                  className={cn(
                    "border-none shadow-none p-0",
                    "text-sm",
                    "bg-transparent",
                    isNew ? "text-emerald-700" : "text-gray-700"
                  )}
                />
              </div>

              {isNew && (
                <div className="absolute -top-1 -right-1">
                  <div className="relative flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-20"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500/10"></span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface EducationSuggestionProps {
  content: Education;
  currentContent: Education | null;
}

export function EducationSuggestion({ content: education, currentContent: currentEducation }: EducationSuggestionProps) {
  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-start">
        <div>
          <h3 className={cn(
            "font-medium text-gray-900",
            !currentEducation || (currentEducation.degree !== education.degree || currentEducation.field !== education.field) && DIFF_HIGHLIGHT_CLASSES
          )}>
            <span>
              {education.degree.split(/(\*\*.*?\*\*)/).map((part, i) =>
                part.startsWith('**') && part.endsWith('**') ?
                  <strong key={i}>{part.slice(2, -2)}</strong> :
                  part
              )}
            </span>
            {' in '}
            <span>
              {education.field.split(/(\*\*.*?\*\*)/).map((part, i) =>
                part.startsWith('**') && part.endsWith('**') ?
                  <strong key={i}>{part.slice(2, -2)}</strong> :
                  part
              )}
            </span>
          </h3>
          <p className={cn(
            "text-sm text-gray-700",
            !currentEducation || currentEducation.school !== education.school && DIFF_HIGHLIGHT_CLASSES
          )}>
            {education.school.replace(/\*\*/g, '')}
          </p>
        </div>
        <span className={cn(
          "text-xs text-gray-600",
          !currentEducation || currentEducation.date !== education.date && DIFF_HIGHLIGHT_CLASSES
        )}>
          {education.date.replace(/\*\*/g, '')}
        </span>
      </div>
      {education.achievements && (
        <div className="space-y-1.5">
          {education.achievements.map((achievement, index) => {
            const currentAchievement = currentEducation?.achievements?.[index];
            const comparedWords = currentAchievement
              ? compareDescriptions(currentAchievement, achievement)
              : [{ text: achievement.replace(/\*\*/g, ''), isNew: true, isBold: false, isStart: true, isEnd: true }];

            return (
              <div key={index} className="flex items-start gap-1.5">
                <span className="text-gray-800 mt-0.5 text-xs">•</span>
                <p className="text-xs text-gray-800 flex-1 flex flex-wrap">
                  {comparedWords.map((word, wordIndex) => (
                    <span
                      key={wordIndex}
                      className={cn(
                        "inline-flex items-center",
                        word.isNew && "bg-green-300",
                        word.isStart && "rounded-l-sm pl-1",
                        word.isEnd && "rounded-r-sm pr-1",
                        wordIndex < comparedWords.length - 1 && "mr-1",
                        word.isNew && "bg-green-300 px-1 mx-0",
                      )}
                    >
                      {word.isBold ? (
                        <strong>{word.text}</strong>
                      ) : (
                        word.text
                      )}
                    </span>
                  ))}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
