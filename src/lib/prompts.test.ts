// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  RESUME_FORMATTER_SYSTEM_MESSAGE,
  RESUME_IMPORTER_SYSTEM_MESSAGE,
  WORK_EXPERIENCE_GENERATOR_MESSAGE,
  WORK_EXPERIENCE_IMPROVER_MESSAGE,
  PROJECT_GENERATOR_MESSAGE,
  PROJECT_IMPROVER_MESSAGE,
  TEXT_IMPORT_SYSTEM_MESSAGE,
  AI_ASSISTANT_SYSTEM_MESSAGE,
  TEXT_ANALYZER_SYSTEM_MESSAGE,
} from './prompts';

const messages = {
  RESUME_FORMATTER_SYSTEM_MESSAGE,
  RESUME_IMPORTER_SYSTEM_MESSAGE,
  WORK_EXPERIENCE_GENERATOR_MESSAGE,
  WORK_EXPERIENCE_IMPROVER_MESSAGE,
  PROJECT_GENERATOR_MESSAGE,
  PROJECT_IMPROVER_MESSAGE,
  TEXT_IMPORT_SYSTEM_MESSAGE,
  AI_ASSISTANT_SYSTEM_MESSAGE,
  TEXT_ANALYZER_SYSTEM_MESSAGE,
};

describe('system prompt messages', () => {
  it.each(Object.entries(messages))('%s is a non-empty system message', (_name, message) => {
    expect(message.role).toBe('system');
    expect(message.content.length).toBeGreaterThan(100);
  });

  it('keeps the formatter content-preservation directive', () => {
    expect(RESUME_FORMATTER_SYSTEM_MESSAGE.content).toContain('preserve');
    expect(RESUME_FORMATTER_SYSTEM_MESSAGE.content).toContain('bullet');
  });

  it('keeps the importer focused on structured extraction', () => {
    expect(RESUME_IMPORTER_SYSTEM_MESSAGE.content.toLowerCase()).toContain('select');
  });

  it('keeps the assistant grounded in the provided resume context', () => {
    expect(AI_ASSISTANT_SYSTEM_MESSAGE.content).toContain('resume');
  });
});
