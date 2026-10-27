import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', async () => {
  const React = await import('react');
  const cache = new Map<string, React.ComponentType<Record<string, unknown>>>();
  const motion = new Proxy({}, {
    get: (_target, tag: string) => {
      if (!cache.has(tag)) {
        cache.set(tag, (props: Record<string, unknown>) => {
          const { initial, animate, exit, transition, whileHover, whileTap, variants, layout, layoutId, ...rest } = props;
          void initial; void animate; void exit; void transition; void whileHover; void whileTap; void variants; void layout; void layoutId;
          return React.createElement(tag, rest);
        });
      }
      return cache.get(tag);
    },
  });
  return { motion, AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children) };
});

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useDroppable: () => ({ setNodeRef: vi.fn(), isOver: false }),
  closestCorners: vi.fn(),
  PointerSensor: class {},
  KeyboardSensor: class {},
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(), transform: null, transition: undefined, isDragging: false }),
  verticalListSortingStrategy: vi.fn(),
  sortableKeyboardCoordinates: vi.fn(),
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';
import { ApplicationsClient, type Application } from './applications-client';

const application: Application = {
  id: 'app-1',
  company: 'Acme',
  role: 'Engineer',
  status: 'applied',
  location: 'London',
  salary: '$100k',
  recruiter: 'Jane',
  deadline: '2026-12-01',
  priority: 'high',
  job_description: 'Build things',
  job_url: 'https://acme.dev/jobs/1',
  notes: 'Great team',
  resume_id: 'resume-1',
  cover_letter_id: 'letter-1',
  source: 'LinkedIn',
  match_score: 82,
  ats_score: 90,
  applied_at: '2026-01-01',
  interview_at: '2026-02-01',
  pinned: true,
  favorite: true,
  created_at: '2026-01-01',
  updated_at: '2026-01-01',
};

describe('ApplicationsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ application: { ...application, id: 'app-2' } }),
    }));
  });

  it('renders the application board and empty state', () => {
    const { unmount } = render(<ApplicationsClient initial={[application]} />);

    expect(screen.getByRole('heading', { name: 'Applications' })).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    expect(screen.getByText('Wishlist')).toBeInTheDocument();
    unmount();

    render(<ApplicationsClient initial={[]} />);
    expect(screen.getByText('No applications yet')).toBeInTheDocument();
  });

  it('opens details and edits an application', async () => {
    render(<ApplicationsClient initial={[application]} />);

    fireEvent.click(screen.getByText('Engineer'));
    expect(screen.getByText('Great team')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Edit details/ }));

    fireEvent.change(screen.getByDisplayValue('Acme'), { target: { value: 'Acme Inc' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/eleva/api/applications', expect.objectContaining({ method: 'PATCH' })));
    expect(toast.success).toHaveBeenCalledWith('Application updated');
  });

  it('creates a new application from the dialog', async () => {
    render(<ApplicationsClient initial={[]} />);

    fireEvent.click(screen.getByTestId('add-application'));
    const inputs = screen.getAllByRole('textbox');
    fireEvent.change(inputs[0], { target: { value: 'Globex' } });
    fireEvent.change(inputs[1], { target: { value: 'Staff Engineer' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add application' }));

    await waitFor(() => expect(fetch).toHaveBeenCalledWith('/eleva/api/applications', expect.objectContaining({ method: 'POST' })));
    expect(toast.success).toHaveBeenCalledWith('Application added');
  });

  it('toggles flags, moves status, deletes and archives', async () => {
    render(<ApplicationsClient initial={[application]} />);

    fireEvent.click(screen.getByTitle('Unfavorite'));
    fireEvent.click(screen.getByTitle('Unpin'));
    expect(fetch).toHaveBeenCalledWith('/eleva/api/applications', expect.objectContaining({ method: 'PATCH' }));

    fireEvent.click(screen.getByText('Engineer'));
    fireEvent.change(screen.getByDisplayValue('Applied'), { target: { value: 'interview' } });
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));

    fireEvent.click(screen.getAllByRole('button', { name: /Delete/ }).at(-1)!);
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Deleted'));
  });

  it('reports required fields when saving an incomplete application', () => {
    render(<ApplicationsClient initial={[]} />);

    fireEvent.click(screen.getByTestId('add-application'));
    fireEvent.click(screen.getByRole('button', { name: 'Add application' }));

    expect(toast.error).toHaveBeenCalledWith('Company and role required');
  });
});
