import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DocumentSettings } from '@/lib/types';
import { DocumentLayoutPresets } from './document-layout-presets';

const defaultSettings: DocumentSettings = {
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
  experience_margin_top: 2,
  experience_margin_bottom: 2,
  experience_margin_horizontal: 0,
  experience_item_spacing: 4,
  projects_margin_top: 2,
  projects_margin_bottom: 2,
  projects_margin_horizontal: 0,
  projects_item_spacing: 4,
  education_margin_top: 2,
  education_margin_bottom: 2,
  education_margin_horizontal: 0,
  education_item_spacing: 4,
};

const settings: DocumentSettings = {
  ...defaultSettings,
  document_font_size: 11,
  document_margin_horizontal: 40,
  show_ubc_footer: true,
  footer_width: 95,
};

const compactSettings: DocumentSettings = {
  ...settings,
  footer_width: 0,
  show_ubc_footer: false,
  header_name_size: 24,
  skills_margin_top: 0,
  document_font_size: 10,
  projects_margin_top: 0,
  skills_item_spacing: 0,
  document_line_height: 1.2,
  education_margin_top: 0,
  skills_margin_bottom: 2,
  experience_margin_top: 2,
  projects_item_spacing: 0,
  education_item_spacing: 0,
  projects_margin_bottom: 0,
  education_margin_bottom: 0,
  experience_item_spacing: 1,
  document_margin_vertical: 20,
  experience_margin_bottom: 0,
  skills_margin_horizontal: 0,
  document_margin_horizontal: 28,
  header_name_bottom_spacing: 16,
  projects_margin_horizontal: 0,
  education_margin_horizontal: 0,
  experience_margin_horizontal: 0,
};

function renderPresets() {
  const onApply = vi.fn();
  render(
    <DocumentLayoutPresets
      documentSettings={settings}
      defaultSettings={defaultSettings}
      onApply={onApply}
    />,
  );
  return { onApply };
}

describe('DocumentLayoutPresets', () => {
  it('renders both layout preset buttons', () => {
    renderPresets();

    expect(screen.getByRole('button', { name: /Default Layout/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compact Layout/ })).toBeInTheDocument();
  });

  it('applies a copy of the default settings', async () => {
    const user = userEvent.setup();
    const { onApply } = renderPresets();

    await user.click(screen.getByRole('button', { name: /Default Layout/ }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const applied = onApply.mock.calls[0][0] as DocumentSettings;
    expect(applied).toEqual(defaultSettings);
    expect(applied).not.toBe(defaultSettings);
  });

  it('applies the compact overrides on top of the current settings', async () => {
    const user = userEvent.setup();
    const { onApply } = renderPresets();

    await user.click(screen.getByRole('button', { name: /Compact Layout/ }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply).toHaveBeenCalledWith(compactSettings);
  });
});
