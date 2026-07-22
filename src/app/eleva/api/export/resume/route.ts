import { NextRequest } from 'next/server';
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';
import React from 'react';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const bodySchema = z.object({ resumeId: z.string().uuid() });

type ResumeRow = {
  id: string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone_number?: string | null;
  location?: string | null;
  linkedin_url?: string | null;
  github_url?: string | null;
  website?: string | null;
  target_role?: string | null;
  professional_summary?: string | null;
  work_experience?: Array<{ company: string; position: string; date?: string | null; location?: string | null; description?: string[] }> | null;
  education?: Array<{ school: string; degree?: string | null; field?: string | null; date?: string | null; gpa?: string | null }> | null;
  skills?: Array<{ category: string; items?: string[] }> | null;
  projects?: Array<{ name: string; description?: string[]; technologies?: string[]; url?: string | null }> | null;
  certifications?: Array<{ name: string; issuer?: string | null; date?: string | null }> | null;
};

const styles = StyleSheet.create({
  page:        { padding: 42, fontFamily: 'Helvetica', fontSize: 10, lineHeight: 1.4, color: '#111' },
  header:      { marginBottom: 14 },
  name:        { fontSize: 22, fontWeight: 700, letterSpacing: -0.6, marginBottom: 2 },
  role:        { fontSize: 11, color: '#2563EB', marginBottom: 5, fontWeight: 500 },
  contact:     { fontSize: 9, color: '#555', flexDirection: 'row', flexWrap: 'wrap' },
  contactItem: { marginRight: 10 },
  divider:     { borderBottomWidth: 0.6, borderBottomColor: '#111', marginBottom: 12, marginTop: 4 },
  section:     { marginBottom: 12 },
  sectionTitle:{ fontSize: 9, fontWeight: 700, letterSpacing: 1.2, color: '#111', marginBottom: 6, textTransform: 'uppercase' },
  item:        { marginBottom: 8 },
  itemHead:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  itemTitle:   { fontSize: 10.5, fontWeight: 700, color: '#111' },
  itemSub:     { fontSize: 9.5, color: '#333' },
  itemDate:    { fontSize: 9, color: '#666' },
  bullet:      { flexDirection: 'row', marginBottom: 2 },
  bulletDot:   { width: 8, fontSize: 10, color: '#2563EB' },
  bulletText:  { flex: 1, fontSize: 10, lineHeight: 1.45 },
  summary:     { fontSize: 10, lineHeight: 1.5, color: '#222' },
  skillsRow:   { flexDirection: 'row', marginBottom: 4, alignItems: 'flex-start' },
  skillCat:    { fontSize: 9.5, fontWeight: 700, color: '#111', width: 80 },
  skillList:   { fontSize: 9.5, color: '#333', flex: 1 },
  chip:        { fontSize: 8, color: '#2563EB', backgroundColor: '#EFF6FF', paddingHorizontal: 4, paddingVertical: 1, marginRight: 3, borderRadius: 2 },
});

export async function POST(req: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await req.json());
    if (!parsed.success) return Response.json({ error: 'invalid_body' }, { status: 400 });

    const supabase = await createClient();
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes?.user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  const { data: r, error } = await supabase.from('resumes').select('*').eq('id', parsed.data.resumeId).eq('user_id', userRes.user.id).maybeSingle();
  if (error || !r) return Response.json({ error: error?.message ?? 'resume_not_found' }, { status: 404 });

  const resume = r as ResumeRow;
  const fullName = [resume.first_name, resume.last_name].filter(Boolean).join(' ') || resume.name || 'Applicant';
  const contact = [resume.email, resume.phone_number, resume.location].filter(Boolean);
  const links   = [resume.linkedin_url, resume.github_url, resume.website].filter(Boolean);

  const doc = React.createElement(
    Document,
    { title: resume.name },
    React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      // Header
      React.createElement(
        View,
        { style: styles.header },
        React.createElement(Text, { style: styles.name }, fullName),
        resume.target_role && React.createElement(Text, { style: styles.role }, resume.target_role),
        React.createElement(
          View,
          { style: styles.contact },
          ...contact.map((c, i) => React.createElement(Text, { key: `c${i}`, style: styles.contactItem }, c!)),
          ...links.map((l, i) => React.createElement(Link, { key: `l${i}`, src: l!, style: [styles.contactItem, { color: '#2563EB' }] as any }, (l as string).replace(/^https?:\/\//, ''))),
        ),
      ),
      React.createElement(View, { style: styles.divider }),
      // Summary
      resume.professional_summary && React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Summary'),
        React.createElement(Text, { style: styles.summary }, resume.professional_summary),
      ),
      // Experience
      resume.work_experience && resume.work_experience.length > 0 && React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Experience'),
        ...resume.work_experience.map((exp, i) =>
          React.createElement(
            View,
            { key: `we${i}`, style: styles.item },
            React.createElement(
              View, { style: styles.itemHead },
              React.createElement(Text, { style: styles.itemTitle }, `${exp.position} · ${exp.company}`),
              exp.date && React.createElement(Text, { style: styles.itemDate }, exp.date),
            ),
            exp.location && React.createElement(Text, { style: styles.itemSub }, exp.location),
            ...((exp.description || []).map((b, j) =>
              React.createElement(
                View, { key: `b${j}`, style: styles.bullet },
                React.createElement(Text, { style: styles.bulletDot }, '•'),
                React.createElement(Text, { style: styles.bulletText }, b),
              )
            )),
          )
        ),
      ),
      // Projects
      resume.projects && resume.projects.length > 0 && React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Projects'),
        ...resume.projects.map((p, i) =>
          React.createElement(
            View, { key: `p${i}`, style: styles.item },
            React.createElement(
              View, { style: styles.itemHead },
              React.createElement(Text, { style: styles.itemTitle }, p.name),
              p.technologies && p.technologies.length > 0 && React.createElement(Text, { style: styles.itemDate }, p.technologies.slice(0, 5).join(' · ')),
            ),
            ...((p.description || []).map((b, j) =>
              React.createElement(
                View, { key: `pb${j}`, style: styles.bullet },
                React.createElement(Text, { style: styles.bulletDot }, '•'),
                React.createElement(Text, { style: styles.bulletText }, b),
              )
            )),
          )
        ),
      ),
      // Skills
      resume.skills && resume.skills.length > 0 && React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Skills'),
        ...resume.skills.map((s, i) =>
          React.createElement(
            View, { key: `s${i}`, style: styles.skillsRow },
            React.createElement(Text, { style: styles.skillCat }, s.category),
            React.createElement(Text, { style: styles.skillList }, (s.items || []).join(' · ')),
          )
        ),
      ),
      // Education
      resume.education && resume.education.length > 0 && React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Education'),
        ...resume.education.map((e, i) =>
          React.createElement(
            View, { key: `e${i}`, style: styles.item },
            React.createElement(
              View, { style: styles.itemHead },
              React.createElement(Text, { style: styles.itemTitle }, `${e.degree || 'Degree'} · ${e.school}`),
              e.date && React.createElement(Text, { style: styles.itemDate }, e.date),
            ),
            (e.field || e.gpa) && React.createElement(Text, { style: styles.itemSub }, [e.field, e.gpa && `GPA: ${e.gpa}`].filter(Boolean).join(' · ')),
          )
        ),
      ),
      // Certifications
      resume.certifications && resume.certifications.length > 0 && React.createElement(
        View,
        { style: styles.section },
        React.createElement(Text, { style: styles.sectionTitle }, 'Certifications'),
        ...resume.certifications.map((c, i) =>
          React.createElement(
            View, { key: `c${i}`, style: styles.item },
            React.createElement(
              View, { style: styles.itemHead },
              React.createElement(Text, { style: styles.itemTitle }, c.name),
              c.date && React.createElement(Text, { style: styles.itemDate }, c.date),
            ),
            c.issuer && React.createElement(Text, { style: styles.itemSub }, c.issuer),
          )
        ),
      ),
    )
  );

  const buf = await renderToBuffer(doc as any);
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${(resume.name || 'resume').replace(/[^a-z0-9.-]+/gi, '_')}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
