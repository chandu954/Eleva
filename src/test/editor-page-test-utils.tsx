// @vitest-environment jsdom
import { vi } from "vitest";

import {
  initialResume,
  type ResumeData,
  type ResumeEditor,
} from "@/app/eleva/editor/_lib/use-resume-editor";

export function cloneResume(): ResumeData {
  const data = JSON.parse(JSON.stringify(initialResume)) as ResumeData;
  data.projects[0].bullets = [{ id: "pb1", text: "Shipped a scheduler", original: "Shipped a scheduler" }];
  return data;
}

export function makeEditor(overrides: Partial<ResumeEditor> = {}): ResumeEditor {
  const editor: ResumeEditor = {
    data: cloneResume(),
    activeSection: "experience",
    setActiveSection: vi.fn(),
    updateData: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: false,
    canRedo: false,
    toast: null,
    showToast: vi.fn(),
    optimizing: false,
    processingAction: null,
    handleBulletRewrite: vi.fn(async () => undefined),
    handleProjectRewrite: vi.fn(async () => undefined),
    handleAIAction: vi.fn(async () => undefined),
    handleOptimizeAll: vi.fn(async () => undefined),
    setExpField: vi.fn(),
    addBullet: vi.fn(),
    setBulletText: vi.fn(),
    setBulletSuggestion: vi.fn(),
    acceptSuggestion: vi.fn(),
    deleteBullet: vi.fn(),
    addExperience: vi.fn(),
    removeExperience: vi.fn(),
    updateProject: vi.fn(),
    addProject: vi.fn(),
    removeProject: vi.fn(),
    addProjectTech: vi.fn(),
    removeProjectTech: vi.fn(),
    updateSkillCat: vi.fn(),
    addSkillItem: vi.fn(),
    removeSkillItem: vi.fn(),
    addSkillCategory: vi.fn(),
    removeSkillCategory: vi.fn(),
    updateEducation: vi.fn(),
    addEducation: vi.fn(),
    removeEducation: vi.fn(),
    updateCert: vi.fn(),
    addCertificate: vi.fn(),
    removeCertificate: vi.fn(),
    updateSummary: vi.fn(),
    updateInfoField: vi.fn(),
  };
  return { ...editor, ...overrides };
}
