import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const push = vi.hoisted(() => vi.fn());
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/components/auth/logout-button', () => ({ LogoutButton: () => <button>Log out</button> }));
vi.mock('@/components/ui/logo', () => ({ Logo: () => <div>Eleva</div> }));

import StartTrialPage from './page';

describe('StartTrialPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID;
  });

  it('explains trial benefits and sends users to checkout when a price is configured', () => {
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID = 'price_pro';
    render(<StartTrialPage />);
    expect(screen.getByRole('heading', { name: /Perfect Resume/ })).toBeInTheDocument();
    expect(screen.getByText('Unlimited AI-tailored resumes')).toBeInTheDocument();
    expect(screen.getByText('Cancel Anytime')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Start Free Trial/ }));
    expect(push).toHaveBeenCalledWith('/subscription/checkout?price_id=price_pro&trial=true');
  });

  it('keeps the loading state visible if no price ID is configured', () => {
    render(<StartTrialPage />);
    fireEvent.click(screen.getByRole('button', { name: /Start Free Trial/ }));
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Loading/ })).toBeDisabled();
    expect(push).not.toHaveBeenCalled();
  });
});
