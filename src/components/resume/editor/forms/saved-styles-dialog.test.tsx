import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DocumentSettings } from '@/lib/types';
import { SavedStylesDialog } from './saved-styles-dialog';

const settings = { font_family: 'Arial', font_size: 12 } as unknown as DocumentSettings;

describe('SavedStylesDialog', () => {
  beforeEach(() => localStorage.clear());

  it('saves named styles and requires a non-empty name', () => {
    render(<SavedStylesDialog currentSettings={settings} onApplyStyle={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Saved Styles/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save Current/ }));
    expect(screen.getByRole('button', { name: 'Save Style' })).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('Enter style name...'), { target: { value: 'Clean' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Style' }));
    expect(screen.getByText('Clean')).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('eleva-saved-styles') || '[]')).toMatchObject([{ name: 'Clean', settings }]);
  });

  it('loads, applies and deletes persisted styles', () => {
    localStorage.setItem('eleva-saved-styles', JSON.stringify([{ name: 'Compact', settings, timestamp: 123 }]));
    const onApplyStyle = vi.fn();
    render(<SavedStylesDialog currentSettings={settings} onApplyStyle={onApplyStyle} />);
    fireEvent.click(screen.getByRole('button', { name: /Saved Styles/ }));
    expect(screen.getByText('Compact')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Apply Style'));
    expect(onApplyStyle).toHaveBeenCalledWith(settings);
    fireEvent.click(screen.getByRole('button', { name: /Saved Styles/ }));
    fireEvent.click(screen.getByTitle('Delete Style'));
    expect(screen.getByText('No saved styles yet')).toBeInTheDocument();
  });

  it('cancels the new style form without saving it', () => {
    render(<SavedStylesDialog currentSettings={settings} onApplyStyle={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /Saved Styles/ }));
    fireEvent.click(screen.getByRole('button', { name: /Save Current/ }));
    fireEvent.change(screen.getByPlaceholderText('Enter style name...'), { target: { value: 'Discard' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByPlaceholderText('Enter style name...')).not.toBeInTheDocument();
    expect(localStorage.getItem('eleva-saved-styles')).toBeNull();
  });
});
