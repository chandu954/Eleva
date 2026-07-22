import { NextRequest } from 'next/server';
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const bodySchema = z.object({ resumeId: z.string().uuid() });

function P(text: string, opts: { bold?: boolean; size?: number; color?: string; italics?: boolean } = {}, spacing = 80) {
  return new Paragraph({ children: [new TextRun({ text, bold: opts.bold, size: opts.size, color: opts.color, italics: opts.italics })], spacing: { after: spacing } });
}
function Section(title: string) {
  return new Paragraph({
    children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 18, color: '111111', characterSpacing: 24 })],
    spacing: { before: 280, after: 140 },
    border: { bottom: { color: 'BBBBBB', size: 4, style: BorderStyle.SINGLE, space: 3 } },
  });
}
function Bullet(text: string) {
  return new Paragraph({ children: [new TextRun({ text })], bullet: { level: 0 }, spacing: { after: 60 } });
}

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const supabase = await createClient();
  const { data: userRes } = await supabase.auth.getUser();
  if (!userRes?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: r, error } = await supabase.from('resumes').select('*').eq('id', parsed.data.resumeId).eq('user_id', userRes.user.id).maybeSingle();
  if (error || !r) return Response.json({ error: 'not_found' }, { status: 404 });

  const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ') || r.name || 'Applicant';
  const contact = [r.email, r.phone_number, r.location].filter(Boolean).join(' • ');
  const links = [r.linkedin_url, r.github_url, r.website].filter(Boolean).join(' • ');

  const children: Paragraph[] = [];
  children.push(new Paragraph({ children: [new TextRun({ text: fullName, bold: true, size: 40 })], spacing: { after: 40 }, alignment: AlignmentType.LEFT }));
  if (r.target_role) children.push(P(r.target_role, { size: 22, color: '2563EB', bold: true }, 100));
  if (contact) children.push(P(contact, { size: 18, color: '555555' }, 40));
  if (links) children.push(P(links, { size: 18, color: '2563EB' }, 200));

  if (r.professional_summary) {
    children.push(Section('Summary'));
    children.push(P(r.professional_summary, { size: 20 }, 80));
  }

  if (r.work_experience && r.work_experience.length) {
    children.push(Section('Experience'));
    for (const exp of r.work_experience as any[]) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${exp.position ?? ''}`, bold: true, size: 22 }),
          new TextRun({ text: ` · ${exp.company ?? ''}`, size: 22 }),
          ...(exp.date ? [new TextRun({ text: `    ${exp.date}`, size: 18, color: '666666' })] : []),
        ],
        spacing: { after: 40 },
      }));
      if (exp.location) children.push(P(exp.location, { size: 18, color: '666666', italics: true }, 40));
      for (const b of (exp.description || [])) children.push(Bullet(b));
    }
  }

  if (r.projects && r.projects.length) {
    children.push(Section('Projects'));
    for (const p of r.projects as any[]) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: p.name ?? '', bold: true, size: 22 }),
          ...(p.technologies?.length ? [new TextRun({ text: `    ${p.technologies.slice(0, 6).join(' · ')}`, size: 18, color: '666666' })] : []),
        ],
        spacing: { after: 40 },
      }));
      for (const b of (p.description || [])) children.push(Bullet(b));
    }
  }

  if (r.skills && r.skills.length) {
    children.push(Section('Skills'));
    for (const s of r.skills as any[]) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${s.category ?? 'Skills'}:  `, bold: true, size: 20 }),
          new TextRun({ text: (s.items || []).join(' · '), size: 20 }),
        ],
        spacing: { after: 60 },
      }));
    }
  }

  if (r.education && r.education.length) {
    children.push(Section('Education'));
    for (const e of r.education as any[]) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: `${e.degree ?? 'Degree'}${e.field ? ' · ' + e.field : ''}`, bold: true, size: 22 }),
          new TextRun({ text: ` · ${e.school ?? ''}`, size: 22 }),
          ...(e.date ? [new TextRun({ text: `    ${e.date}`, size: 18, color: '666666' })] : []),
        ],
        spacing: { after: 60 },
      }));
      if (e.gpa) children.push(P(`GPA: ${e.gpa}`, { size: 18, color: '666666' }, 40));
    }
  }

  if (r.certifications && r.certifications.length) {
    children.push(Section('Certifications'));
    for (const c of r.certifications as any[]) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: c.name ?? '', bold: true, size: 20 }),
          ...(c.issuer ? [new TextRun({ text: ` · ${c.issuer}`, size: 20 })] : []),
          ...(c.date ? [new TextRun({ text: `    ${c.date}`, size: 18, color: '666666' })] : []),
        ],
        spacing: { after: 60 },
      }));
    }
  }

  const doc = new Document({
    creator: 'Eleva',
    title: r.name,
    styles: { default: { document: { run: { font: 'Helvetica', size: 20 } } } },
    sections: [{ properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children }],
  });
  const buffer = await Packer.toBuffer(doc);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${(r.name || 'resume').replace(/[^a-z0-9.-]+/gi, '_')}.docx"`,
      'Cache-Control': 'no-store',
    },
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
