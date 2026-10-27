// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, (props: Record<string, unknown>) => {
          const { initial, animate, exit, transition, whileHover, whileTap, whileInView, viewport, variants, layout, layoutId, ...rest } = props;
          void initial; void animate; void exit; void transition; void whileHover; void whileTap;
          void whileInView; void viewport; void variants; void layout; void layoutId;
          return React.createElement(tag, rest);
        });
      }
      return cache.get(tag);
    },
  });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';
import { TemplatesClient } from './templates-client';
import type { ResumeTemplate } from '../_lib/templates-catalog';

const templates: ResumeTemplate[] = [
  {
    id: 'linear',
    name: 'Linear',
    category: 'modern',
    tier: 'free',
    description: 'Clean technical layout for engineers.',
    accent: '#5E6AD2',
    layout: 'single-column',
    fontPair: 'Inter · JetBrains Mono',
    atsScore: 96,
  },
  {
    id: 'vercel',
    name: 'Vercel',
    category: 'modern',
    tier: 'free',
    description: 'Monochrome minimalism with hairline rules.',
    accent: '#000000',
    layout: 'single-column',
    fontPair: 'Geist Sans · Geist Mono',
    atsScore: 98,
  },
  {
    id: 'stripe',
    name: 'Stripe',
    category: 'executive',
    tier: 'free',
    description: 'Premium editorial headings for leaders.',
    accent: '#635BFF',
    layout: 'two-column',
    fontPair: 'Söhne · Söhne Mono',
    atsScore: 92,
  },
  {
    id: 'arc',
    name: 'Arc',
    category: 'creative',
    tier: 'free',
    description: 'Gradient sidebar with glass panels.',
    accent: '#FF4785',
    layout: 'sidebar',
    fontPair: 'Inter · Inter',
    atsScore: 88,
  },
  {
    id: 'ats-safe',
    name: 'ATS Safe',
    category: 'ats',
    tier: 'free',
    description: 'Bulletproof for any parser.',
    accent: '#374151',
    layout: 'single-column',
    fontPair: 'Helvetica · Arial',
    atsScore: 100,
  },
  {
    id: 'compact',
    name: 'Compact',
    category: 'technical',
    tier: 'free',
    description: 'Fits years of experience on one page.',
    accent: '#1F2937',
    layout: 'timeline',
    fontPair: 'Arial · Arial',
    atsScore: 70,
  },
];

const resumes = [
  {
    id: 'resume-1',
    name: 'Base resume',
    target_role: 'Engineer',
    is_base_resume: true,
    document_settings: { template: 'linear' },
    updated_at: '2026-01-01',
  },
  {
    id: 'resume-2',
    name: 'Tailored resume',
    target_role: null,
    is_base_resume: false,
    document_settings: null,
    updated_at: '2026-01-01',
  },
];

function renderClient(overrides: { templates?: ResumeTemplate[]; resumes?: typeof resumes } = {}) {
  return render(
    <TemplatesClient
      templates={overrides.templates ?? templates}
      resumes={overrides.resumes ?? resumes}
    />,
  );
}

async function openLinearPreview(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByText('Clean technical layout for engineers.'));
  expect(await screen.findByText('Live preview')).toBeInTheDocument();
}

describe('TemplatesClient', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });

  it('renders the catalogue with counts, metadata and ATS labels', () => {
    renderClient();

    expect(screen.getByRole('heading', { name: 'Pick your look.' })).toBeInTheDocument();
    expect(screen.getByText(/6 templates · ATS-safe options/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search templates…')).toBeInTheDocument();

    for (const template of templates) {
      expect(screen.getByText(template.description)).toBeInTheDocument();
    }
    expect(screen.getByText('ATS 96%')).toBeInTheDocument();
    expect(screen.getAllByText('Recommended').length).toBeGreaterThan(0);
    expect(screen.getByText('ATS 88%')).toBeInTheDocument();
    expect(screen.getAllByText('Good').length).toBeGreaterThan(0);
    expect(screen.getByText('ATS 70%')).toBeInTheDocument();
    expect(screen.getByText('Low ATS')).toBeInTheDocument();
  });

  it('filters by category and searches name/description', async () => {
    const user = userEvent.setup();
    renderClient();

    await user.click(screen.getByRole('button', { name: 'Modern' }));
    expect(screen.getByText('Clean technical layout for engineers.')).toBeInTheDocument();
    expect(screen.getByText('Monochrome minimalism with hairline rules.')).toBeInTheDocument();
    expect(screen.queryByText('Premium editorial headings for leaders.')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'All' }));
    await user.type(screen.getByPlaceholderText('Search templates…'), 'bulletproof');
    expect(screen.getByText('Bulletproof for any parser.')).toBeInTheDocument();
    expect(screen.queryByText('Clean technical layout for engineers.')).not.toBeInTheDocument();

    await user.clear(screen.getByPlaceholderText('Search templates…'));
    await user.type(screen.getByPlaceholderText('Search templates…'), 'zzzz');
    expect(screen.queryByText('Clean technical layout for engineers.')).not.toBeInTheDocument();
    expect(screen.queryByText('Bulletproof for any parser.')).not.toBeInTheDocument();
  });

  it('switches between grid and list layouts', async () => {
    const user = userEvent.setup();
    const { container } = renderClient();

    expect(container.querySelector('.h-56')).toBeInTheDocument();

    const toggle = container.querySelector('div.flex.rounded-lg.overflow-hidden');
    expect(toggle).not.toBeNull();
    const buttons = toggle!.querySelectorAll('button');
    expect(buttons).toHaveLength(2);

    await user.click(buttons[1]);

    expect(container.querySelector('.h-32')).toBeInTheDocument();
    expect(container.querySelector('.h-56')).not.toBeInTheDocument();
  });

  it('restores favourites from localStorage and toggles them without opening the preview', async () => {
    localStorage.setItem('eleva.templateFavs', JSON.stringify(['linear']));
    const user = userEvent.setup();
    renderClient();

    expect(screen.getByRole('button', { name: /Favorites \(1\)/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Favorites \(1\)/ }));
    expect(screen.getByText('Clean technical layout for engineers.')).toBeInTheDocument();
    expect(screen.queryByText('Premium editorial headings for leaders.')).not.toBeInTheDocument();

    await user.click(screen.getByTitle('Favorite'));

    expect(screen.getByRole('button', { name: /Favorites \(0\)/ })).toBeInTheDocument();
    expect(screen.queryByText('Live preview')).not.toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('eleva.templateFavs') || '[]')).toEqual([]);
  });

  it('survives a corrupted favourites value', () => {
    localStorage.setItem('eleva.templateFavs', 'not-json');
    renderClient();

    expect(screen.getByRole('button', { name: /Favorites \(0\)/ })).toBeInTheDocument();
    expect(screen.getByText('Clean technical layout for engineers.')).toBeInTheDocument();
  });

  it('opens a preview with details and favourite action', async () => {
    const user = userEvent.setup();
    renderClient();

    await openLinearPreview(user);

    expect(screen.getByText('Inter · JetBrains Mono')).toBeInTheDocument();
    expect(screen.getByText('96%')).toBeInTheDocument();
    expect(screen.getByText('FREE')).toBeInTheDocument();
    expect(screen.getAllByText('single-column').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Add to favorites' }));
    expect(screen.getByRole('button', { name: 'Remove favorite' })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('eleva.templateFavs') || '[]')).toContain('linear');
  });

  it('shows the create-a-resume hint when no resumes exist', async () => {
    const user = userEvent.setup();
    renderClient({ resumes: [] });

    await openLinearPreview(user);

    expect(screen.getByText('Create a resume first to apply this template.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apply' })).not.toBeInTheDocument();
  });

  it('applies a template, shows the pending state and closes the preview', async () => {
    let resolveFetch: (value: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => { resolveFetch = resolve; }));
    const user = userEvent.setup();
    renderClient();

    await openLinearPreview(user);

    expect(screen.getByRole('button', { name: /Applied/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/eleva/api/templates/apply');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ templateId: 'linear', resumeId: 'resume-2' });

    resolveFetch({ ok: true, json: async () => ({ success: true }) } as unknown as Response);

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(
      'Template applied',
      { description: 'Open the editor to see the new layout.' },
    ));
    expect(screen.queryByText('Live preview')).not.toBeInTheDocument();
  });

  it('reports API failures when applying a template', async () => {
    fetchMock.mockResolvedValue({ ok: false, json: async () => ({ error: 'Not allowed' }) } as unknown as Response);
    const user = userEvent.setup();
    renderClient();

    await openLinearPreview(user);
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not apply', { description: 'Not allowed' }));
    expect(screen.getByText('Live preview')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
  });

  it('reports network failures when applying a template', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    const user = userEvent.setup();
    renderClient();

    await openLinearPreview(user);
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not apply', { description: 'offline' }));
    expect(screen.getByRole('button', { name: 'Apply' })).toBeEnabled();
  });
});
