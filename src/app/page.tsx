import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Eleva — Elevate Every Opportunity',
  description: 'AI Career Operating System.',
};

// Preview mode: root redirects into the Eleva showcase.
// The original Eleva landing has been preserved at /legacy-landing (see /home dashboard).
export default function Page() {
  redirect('/eleva');
}
