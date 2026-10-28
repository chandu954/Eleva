import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ActivityItem } from '../../_lib/data';
import { ActivityTimeline } from './activity-timeline';

const activity = (kind: string, title: string, subtitle: string | null = null, meta?: Record<string, unknown>): ActivityItem => ({
  id: `${kind}-${title}`, kind, title, subtitle, meta, created_at: new Date().toISOString(),
});

describe('ActivityTimeline', () => {
  it('shows the onboarding empty state', () => {
    render(<ActivityTimeline activity={[]} />);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Optimize for a Job/ })).toHaveAttribute('href', '/eleva/studio');
  });

  it('formats ATS, pipeline, application and cover-letter activity', () => {
    render(<ActivityTimeline activity={[
      activity('pipeline_run', 'Pipeline: Product Engineer · 42% → 88%'),
      activity('ats_scored', 'ATS score 91', 'great match', undefined),
      activity('application_added', '', 'Acme · Engineer'),
      activity('cover_generated', '', 'Acme'),
      activity('resume_created', '', 'Base resume'),
      activity('unknown_kind', 'Custom event'),
      activity('resume_updated', 'A seventh item is clipped'),
    ]} />);

    expect(screen.getByText('Resume tailored')).toBeInTheDocument();
    expect(screen.getByText('ATS 42 → 88')).toBeInTheDocument();
    expect(screen.getByText('ATS analysis completed')).toBeInTheDocument();
    expect(screen.getByText('Score 91/100 · great match')).toBeInTheDocument();
    expect(screen.getByText('Application added')).toBeInTheDocument();
    expect(screen.getByText('Cover letter generated')).toBeInTheDocument();
    expect(screen.getByText('Custom event')).toBeInTheDocument();
    expect(screen.queryByText('A seventh item is clipped')).not.toBeInTheDocument();
  });

  it('filters test pipeline entries and uses metadata when available', () => {
    render(<ActivityTimeline activity={[
      activity('pipeline_run', 'Pipeline: Testing · 10% → 20%'),
      activity('pipeline_run', 'Unstructured title', 'Fallback role', { previousOverall: 50, atsOverall: 75, role: 'Staff Engineer' }),
      activity('ats_scored', 'ATS checked', null),
    ]} />);
    expect(screen.queryByText('Testing')).not.toBeInTheDocument();
    expect(screen.getByText('Staff Engineer')).toBeInTheDocument();
    expect(screen.getByText('ATS 50 → 75')).toBeInTheDocument();
    expect(screen.queryByText('ATS analysis completed')).toBeInTheDocument();
  });
});
