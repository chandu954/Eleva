import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ downloadResumePdf: vi.fn(), toast: vi.fn() }));
vi.mock('@/lib/resume/download-pdf', () => ({ downloadResumePdf: mocks.downloadResumePdf }));
vi.mock('@/hooks/use-toast', () => ({ toast: mocks.toast }));

import type { Resume } from '@/lib/types';
import { ResumeContextMenu } from './resume-context-menu';

const resume = {
  id: 'resume-1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@example.com',
  phone_number: '123', location: 'London', website: 'ada.dev', linkedin_url: 'linkedin/ada', github_url: 'github/ada',
  skills: [{ category: 'Languages', items: ['Ada'] }],
  work_experience: [{ position: 'Engineer', company: 'Engines', location: 'London', date: '1842', description: ['Built a compiler'], technologies: ['Ada'] }],
  projects: [{ name: 'Engine', description: ['Designed a machine'], date: '1843', technologies: ['Math'], url: 'engine.dev', github_url: 'github/engine' }],
  education: [{ degree: 'Math', field: 'Logic', school: 'London', location: 'London', date: '1835', gpa: '4.0', achievements: ['Top student'] }],
} as unknown as Resume;

function openMenu() {
  fireEvent.contextMenu(screen.getByText('Resume preview'));
}

describe('ResumeContextMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it('copies all populated resume sections to the clipboard', async () => {
    render(<ResumeContextMenu resume={resume}><div>Resume preview</div></ResumeContextMenu>);
    openMenu();
    fireEvent.click(await screen.findByText('Copy to Clipboard'));
    await vi.waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('WORK EXPERIENCE')));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('GPA: 4.0'));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Copied to clipboard' }));
  });

  it('reports clipboard and PDF download failures', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('permission denied'));
    mocks.downloadResumePdf.mockRejectedValueOnce(new Error('offline'));
    render(<ResumeContextMenu resume={resume}><div>Resume preview</div></ResumeContextMenu>);
    openMenu();
    fireEvent.click(await screen.findByText('Copy to Clipboard'));
    await vi.waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Failed to copy' })));

    openMenu();
    fireEvent.click(await screen.findByText('Download as PDF'));
    await vi.waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Download failed' })));
  });

  it('starts a PDF download using the resume name', async () => {
    mocks.downloadResumePdf.mockResolvedValue(undefined);
    render(<ResumeContextMenu resume={resume}><div>Resume preview</div></ResumeContextMenu>);
    openMenu();
    fireEvent.click(await screen.findByText('Download as PDF'));
    await vi.waitFor(() => expect(mocks.downloadResumePdf).toHaveBeenCalledWith('resume-1', 'Ada_Lovelace_Resume.pdf'));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Download started' }));
  });
});
