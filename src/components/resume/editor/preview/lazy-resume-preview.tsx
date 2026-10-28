'use client';

import dynamic from 'next/dynamic';
import type { Resume } from '@/lib/types';

const ResumePreview = dynamic(
  () => import('./resume-preview').then((module) => module.ResumePreview),
  {
    ssr: false,
    loading: () => <div className="aspect-[8.5/11] w-full animate-pulse bg-white shadow-lg" aria-label="Loading resume preview" />,
  },
);

export function LazyResumePreview({ resume, width }: { resume: Resume; width: number }) {
  return <ResumePreview resume={resume} containerWidth={width} />;
}
