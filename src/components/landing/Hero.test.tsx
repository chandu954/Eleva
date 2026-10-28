import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/auth/auth-dialog', () => ({ AuthDialog: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('next/image', () => ({ default: (props: { alt?: string }) => <div data-testid="product-hunt-image" data-alt={props.alt} /> }));

import { Hero } from './Hero';

describe('Hero', () => {
  it('renders the product message, signup action, source link and feature badges', () => {
    render(<Hero />);
    expect(screen.getByRole('heading', { name: /AI Resume Builder/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create your resume now' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View source code on GitHub' })).toHaveAttribute('href', 'https://github.com/chandu954/app');
    expect(screen.getByText('AI-Powered')).toBeInTheDocument();
    expect(screen.getByText('ATS-Optimized')).toBeInTheDocument();
    expect(screen.getByTestId('product-hunt-image')).toHaveAttribute('data-alt', expect.stringMatching(/Product Hunt/));
    expect(screen.getByText('Tailored')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
  });
});
