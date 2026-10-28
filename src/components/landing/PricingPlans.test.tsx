import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/auth/auth-dialog', () => ({ AuthDialog: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('framer-motion', async (importOriginal) => ({ ...(await importOriginal<typeof import('framer-motion')>()), useInView: () => true }));

import { PricingPlans } from './PricingPlans';

describe('PricingPlans', () => {
  it('shows free and pro pricing, popular badge, features and signup actions', () => {
    render(<PricingPlans />);
    expect(screen.getByRole('heading', { name: 'Choose Your Plan' })).toBeInTheDocument();
    expect(screen.getByLabelText('Free plan for $0')).toBeInTheDocument();
    expect(screen.getByLabelText('Pro plan for $20/month')).toBeInTheDocument();
    expect(screen.getByText('Most Popular')).toBeInTheDocument();
    expect(screen.getByText('Use your own API keys')).toBeInTheDocument();
    expect(screen.getByText('Access to all premium AI models')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Started with the Free plan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Get Started with the Pro plan' })).toBeInTheDocument();
  });
});
