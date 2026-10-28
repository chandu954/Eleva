import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

vi.mock('@/components/landing/mock-resume', () => ({ MockResume: () => <div>Desktop resume preview</div> }));
vi.mock('@/components/landing/mock-resume-mobile', () => ({ MockResumeMobile: () => <div>Mobile resume preview</div> }));
vi.mock('@/components/landing/benefits-list', () => ({ BenefitsList: () => <div>Benefits</div> }));
vi.mock('@/components/landing/action-buttons', () => ({ ActionButtons: () => <div>Actions</div> }));
vi.mock('@/components/ui/logo', () => ({ Logo: () => <div>Logo</div> }));
vi.mock('@/components/landing/pricing-section', () => ({ PricingSection: () => <section>Pricing</section> }));
vi.mock('@/components/auth/error-dialog', () => ({ ErrorDialog: ({ isOpen }: { isOpen: boolean }) => <div>Error dialog: {String(isOpen)}</div> }));
vi.mock('@/components/landing/creator-story', () => ({ CreatorStory: () => <section>Creator story</section> }));
vi.mock('@/components/landing/how-it-works', () => ({ HowItWorks: () => <section>How it works</section> }));
vi.mock('@/components/landing/hero-video-section', () => ({ HeroVideoSection: () => <section>Hero video</section> }));
vi.mock('@/components/layout/footer', () => ({ Footer: () => <footer>Footer</footer> }));
vi.mock('@/components/ui/split-content', () => ({ SplitContent: () => <section>Split content</section> }));
vi.mock('@/components/layout/nav-links', () => ({ NavLinks: () => <div>Navigation links</div> }));
vi.mock('@/components/landing/model-showcase', () => ({ ModelShowcase: () => <section>Model showcase</section> }));
vi.mock('@/components/auth/auth-dialog-provider', () => ({ AuthDialogProvider: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

import LoginPage, { metadata } from './page';

describe('public login page', () => {
  it.each(['email_confirmation', 'auth_code_missing', 'auth_callback_failed'])(
    'opens the callback error dialog for %s', async (error) => {
      const page = await LoginPage({ searchParams: Promise.resolve({ error }) });
      render(page);
      expect(screen.getByText('Error dialog: true')).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Free AI Resume Builder/ })).toBeInTheDocument();
      expect(screen.getByText('Creator story')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
    },
  );

  it('renders the complete marketing page without an auth error and exposes page metadata', async () => {
    const page = await LoginPage({ searchParams: Promise.resolve({ error: 'other' }) });
    render(page);
    expect(screen.getByText('Error dialog: false')).toBeInTheDocument();
    expect(screen.getByText('Benefits')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getAllByText('Desktop resume preview').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Mobile resume preview').length).toBeGreaterThan(1);
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('Model showcase')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(metadata.title).toContain('Eleva');
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });
});
