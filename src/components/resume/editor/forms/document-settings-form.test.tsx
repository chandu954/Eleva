import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('./saved-styles-dialog', () => ({
  SavedStylesDialog: () => <button type="button">Saved styles</button>,
}));

import type { DocumentSettings } from '@/lib/types';
import { DocumentSettingsForm } from './document-settings-form';

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
  show_ubc_footer: false,
} as DocumentSettings;

function fontRow() {
  return screen.getByText('Font Size').closest('.flex.items-center.justify-between') as HTMLElement;
}

describe('DocumentSettingsForm', () => {
  it('initializes defaults when settings are missing', () => {
    const onChange = vi.fn();
    const { container } = render(
      <DocumentSettingsForm
        documentSettings={null as unknown as DocumentSettings}
        onChange={onChange}
      />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(onChange).toHaveBeenCalledWith('document_settings', expect.objectContaining({
      document_font_size: 10,
      document_line_height: 1.5,
      header_name_size: 24,
    }));
  });

  it('renders the current font size and increments it by 0.5', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentSettingsForm documentSettings={settings} onChange={onChange} />);

    const row = fontRow();
    expect(within(row).getByText('10')).toBeInTheDocument();

    await user.click(within(row).getAllByRole('button')[0]);
    expect(onChange).toHaveBeenCalledWith('document_settings', { ...settings, document_font_size: 10.5 });
  });

  it('decrements the font size by 0.5', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentSettingsForm documentSettings={settings} onChange={onChange} />);

    await user.click(within(fontRow()).getAllByRole('button')[1]);
    expect(onChange).toHaveBeenCalledWith('document_settings', { ...settings, document_font_size: 9.5 });
  });

  it('toggles the UBC footer switch', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentSettingsForm documentSettings={settings} onChange={onChange} />);

    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith('document_settings', { ...settings, show_ubc_footer: true });
  });

  it('shows the footer width controls when the footer is enabled', () => {
    render(
      <DocumentSettingsForm
        documentSettings={{ ...settings, show_ubc_footer: true, footer_width: 95 } as DocumentSettings}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText('Footer Width')).toBeInTheDocument();
  });

  it('resets to the default layout', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentSettingsForm documentSettings={settings} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Default Layout/ }));
    expect(onChange).toHaveBeenCalledWith('document_settings', expect.objectContaining({
      document_font_size: 10,
      document_line_height: 1.5,
    }));
  });

  it('applies the compact layout', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DocumentSettingsForm documentSettings={settings} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Compact Layout/ }));
    expect(onChange).toHaveBeenCalledWith('document_settings', expect.objectContaining({
      document_margin_horizontal: 28,
      document_margin_vertical: 20,
      experience_item_spacing: 1,
    }));
  });

  it('renders the saved styles entry point', () => {
    render(<DocumentSettingsForm documentSettings={settings} onChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Saved styles' })).toBeInTheDocument();
  });
});
