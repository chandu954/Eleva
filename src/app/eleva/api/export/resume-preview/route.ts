import { NextRequest } from 'next/server';
import React from 'react';
import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { z } from 'zod';

import { ResumePDFDocument } from '@/components/resume/editor/preview/resume-pdf-document';
import { apiError } from '@/lib/api-response';
import { logger } from '@/lib/logger';
import type { Resume } from '@/lib/types';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const text = z.string().max(20_000);
const resumeSnapshotSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().min(1).max(128),
  name: text,
  target_role: text.optional(),
  is_base_resume: z.boolean().optional(),
  first_name: text.optional(),
  last_name: text.optional(),
  email: text.optional(),
  phone_number: text.optional(),
  location: text.optional(),
  website: text.optional(),
  linkedin_url: text.optional(),
  github_url: text.optional(),
  work_experience: z.array(z.object({
    company: text,
    position: text,
    location: text.optional(),
    date: text.optional(),
    description: z.array(text).max(100),
    technologies: z.array(text).max(100).optional(),
  })).max(100).default([]),
  education: z.array(z.object({
    school: text,
    degree: text,
    field: text,
    location: text.optional(),
    date: text.optional(),
    gpa: z.union([text, z.number()]).optional(),
    achievements: z.array(text).max(100).optional(),
  })).max(100).default([]),
  skills: z.array(z.object({ category: text, items: z.array(text).max(200) })).max(100).default([]),
  projects: z.array(z.object({
    name: text,
    description: z.array(text).max(100),
    date: text.optional(),
    technologies: z.array(text).max(100).optional(),
    url: text.optional(),
    github_url: text.optional(),
  })).max(100).default([]),
  created_at: text.optional(),
  updated_at: text.optional(),
  document_settings: z.record(z.string(), z.union([z.number(), z.boolean(), z.string()])).optional(),
  section_order: z.array(z.string()).max(50).optional(),
  section_configs: z.record(z.string(), z.object({ visible: z.boolean() })).optional(),
  has_cover_letter: z.boolean().optional(),
  cover_letter: z.record(z.string(), z.unknown()).nullable().optional(),
}).strict();

const bodySchema = z.object({ resumeId: z.string().uuid(), resume: resumeSnapshotSchema });

/** Render the current editor snapshot on the server so react-pdf never enters the browser bundle. */
export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return apiError('INVALID_BODY', 'Invalid resume preview request', { detail: parsed.error.flatten() });

    const supabase = await createClient();
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) return apiError('UNAUTHENTICATED', 'Not authenticated');
    if (parsed.data.resume.id !== parsed.data.resumeId || parsed.data.resume.user_id !== user.id) {
      return apiError('INVALID_BODY', 'Resume snapshot does not match the authenticated user');
    }

    const { data: ownedResume, error } = await supabase
      .from('resumes')
      .select('id')
      .eq('id', parsed.data.resumeId)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error || !ownedResume) return apiError('NOT_FOUND', 'Resume not found');

    const resume = {
      ...parsed.data.resume,
      target_role: parsed.data.resume.target_role ?? '',
      is_base_resume: parsed.data.resume.is_base_resume ?? false,
      first_name: parsed.data.resume.first_name ?? '',
      last_name: parsed.data.resume.last_name ?? '',
      email: parsed.data.resume.email ?? '',
      created_at: parsed.data.resume.created_at ?? '',
      updated_at: parsed.data.resume.updated_at ?? '',
      has_cover_letter: parsed.data.resume.has_cover_letter ?? false,
    } as Resume;
    // The component resolves to a react-pdf Document. Its wrapper element
    // type is narrower than renderToBuffer's root Document type, although
    // the rendered tree is valid for the renderer.
    const document = React.createElement(ResumePDFDocument, { resume }) as React.ReactElement<DocumentProps>;
    const buffer = await renderToBuffer(document);
    return new Response(new Uint8Array(buffer), {
      headers: { 'Content-Type': 'application/pdf', 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    logger.error('export.resume_preview.failed', { error });
    return apiError('EXPORT_FAILED', 'Failed to render resume preview');
  }
}
