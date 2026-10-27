import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';

import type { DocumentSettings } from '@/lib/types';
import { SectionSettings } from './document-section-settings';

const settings: DocumentSettings = {
  document_font_size: 10,
  document_line_height: 1.5,
  document_margin_vertical: 36,
  document_margin_horizontal: 36,
  header_name_size: 24,
  header_name_bottom_spacing: 24,
  skills_margin_top: 2,
  skills_margin_bottom: 2,
  skills_margin_horizontal: 0,
  skills_item_spacing: 2,
  experience_margin_top: 4,
  experience_margin_bottom: 5,
  experience_margin_horizontal: 6,
  experience_item_spacing: 7,
  projects_margin_top: 2,
  projects_margin_bottom: 2,
  projects_margin_horizontal: 0,
  projects_item_spacing: 4,
  education_margin_top: 2,
  education_margin_bottom: 2,
  education_margin_horizontal: 0,
  education_item_spacing: 4,
};

function rowFor(label: string) {
  return screen.getByText(label).closest('.flex.items-center.justify-between') as HTMLElement;
}

function renderSection(overrides: Partial<ComponentProps<typeof SectionSettings>> = {}) {
  const onSettingsChange = vi.fn();
  render(
    <SectionSettings
      title="Skills"
      section="skills"
      documentSettings={settings}
      onSettingsChange={onSettingsChange}
      {...overrides}
    />,
  );
  return { onSettingsChange };
}

describe('SectionSettings', () => {
  it('renders all four controls with the current values and units', () => {
    renderSection();

    expect(screen.getByText('Space Above Skills Section')).toBeInTheDocument();
    expect(screen.getByText('Space Below Skills Section')).toBeInTheDocument();
    expect(screen.getByText('Horizontal Margins')).toBeInTheDocument();
    expect(screen.getByText('Space Between Items')).toBeInTheDocument();

    expect(within(rowFor('Space Above Skills Section')).getByText('2')).toBeInTheDocument();
    expect(within(rowFor('Space Below Skills Section')).getByText('2')).toBeInTheDocument();
    expect(within(rowFor('Horizontal Margins')).getByText('0')).toBeInTheDocument();
    expect(within(rowFor('Space Between Items')).getByText('2')).toBeInTheDocument();
    expect(screen.getAllByText('pt')).toHaveLength(4);
  });

  it('increments the space above the section', async () => {
    const user = userEvent.setup();
    const { onSettingsChange } = renderSection();

    await user.click(within(rowFor('Space Above Skills Section')).getAllByRole('button')[0]);

    expect(onSettingsChange).toHaveBeenCalledWith({ ...settings, skills_margin_top: 3 });
  });

  it('decrements the spacing between items', async () => {
    const user = userEvent.setup();
    const { onSettingsChange } = renderSection();

    await user.click(within(rowFor('Space Between Items')).getAllByRole('button')[1]);

    expect(onSettingsChange).toHaveBeenCalledWith({ ...settings, skills_item_spacing: 1.5 });
  });

  it('clamps the horizontal margin decrement at zero', async () => {
    const user = userEvent.setup();
    const { onSettingsChange } = renderSection();

    await user.click(within(rowFor('Horizontal Margins')).getAllByRole('button')[1]);

    expect(onSettingsChange).toHaveBeenCalledWith({ ...settings, skills_margin_horizontal: 0 });
  });

  it('reads and writes the values for the requested section', async () => {
    const user = userEvent.setup();
    const { onSettingsChange } = renderSection({
      title: 'Experience',
      section: 'experience',
    });

    expect(within(rowFor('Space Above Experience Section')).getByText('4')).toBeInTheDocument();

    await user.click(within(rowFor('Space Above Experience Section')).getAllByRole('button')[0]);

    expect(onSettingsChange).toHaveBeenCalledWith({ ...settings, experience_margin_top: 5 });
  });
});
