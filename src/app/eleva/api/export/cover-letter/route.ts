import { NextRequest } from 'next/server';
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import React from 'react';
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

const styles = StyleSheet.create({
  page:      { padding: 56, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.55, color: '#1a1a1a' },
  header:    { marginBottom: 28 },
  name:      { fontSize: 20, fontWeight: 700, letterSpacing: -0.4, marginBottom: 4 },
  meta:      { fontSize: 9, color: '#666' },
  hr:        { borderBottomWidth: 0.7, borderBottomColor: '#111', marginBottom: 22 },
  subject:   { fontSize: 11, fontWeight: 700, marginBottom: 14 },
  body:      { fontSize: 11, lineHeight: 1.6, marginBottom: 6 },
  footer:    { position: 'absolute', bottom: 32, left: 56, right: 56, fontSize: 8, color: '#999', textAlign: 'center' },
});

export async function POST(req: NextRequest) {
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });
  const { content, title, company, role, candidateName, candidateEmail } = parsed.data;

  const paragraphs = content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const doc = React.createElement(
    Document,
    { title },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.name }, candidateName || 'Applicant'),
        React.createElement(Text, { style: styles.meta }, [candidateEmail, today].filter(Boolean).join('  •  ')),
      ),
      React.createElement(View, { style: styles.hr }),
      (company || role) && React.createElement(Text, { style: styles.subject }, `Re: ${role || 'The role'}${company ? ` at ${company}` : ''}`),
      ...paragraphs.map((p, i) => React.createElement(Text, { key: i, style: styles.body }, p)),
      React.createElement(Text, { style: styles.footer, fixed: true }, 'Generated with Eleva — elevaeveryopportunity'),
    )
  );

  const buf = await renderToBuffer(doc as any);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${title.replace(/[^a-z0-9.-]+/gi, '_')}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
