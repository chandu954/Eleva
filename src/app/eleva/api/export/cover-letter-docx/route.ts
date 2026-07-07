import { NextRequest } from 'next/server';
import { Document, Packer, Paragraph, TextRun, AlignmentType, BorderStyle } from 'docx';
import { z } from 'zod';

export const runtime = 'nodejs';
export const maxDuration = 30;

const bodySchema = z.object({
  content: z.string().min(1),
  title: z.string().default('Cover Letter'),
  company: z.string().optional(),
  role: z.string().optional(),
  candidateName: z.string().optional(),
  candidateEmail: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { content, title, company, role, candidateName, candidateEmail } = parsed.data;

  const paragraphs = content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const doc = new Document({
    creator: 'Eleva',
    title,
    styles: {
      default: {
        document: { run: { font: 'Helvetica', size: 22 /* 11pt */ } },
      },
    },
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({ children: [new TextRun({ text: candidateName || 'Applicant', bold: true, size: 40 })], spacing: { after: 60 } }),
          new Paragraph({ children: [new TextRun({ text: [candidateEmail, today].filter(Boolean).join('  •  '), color: '666666', size: 18 })], spacing: { after: 300 }, border: { bottom: { color: '111111', size: 6, style: BorderStyle.SINGLE, space: 6 } } }),
          ...(company || role ? [new Paragraph({ children: [new TextRun({ text: `Re: ${role || 'The role'}${company ? ` at ${company}` : ''}`, bold: true })], spacing: { before: 320, after: 280 } })] : []),
          ...paragraphs.map((p) => new Paragraph({ children: [new TextRun({ text: p })], spacing: { after: 200 } })),
          new Paragraph({ children: [new TextRun({ text: 'Generated with Eleva — elevaeveryopportunity', color: '999999', size: 16 })], alignment: AlignmentType.CENTER, spacing: { before: 800 } }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9.-]+/gi, '_')}.docx"`,
      'Cache-Control': 'no-store',
    },
  });
}
