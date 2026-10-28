import type { ProviderId } from '@/lib/ai/provider/registry';

export type ProfileRow = { first_name?: string | null; last_name?: string | null; headline?: string | null; bio?: string | null; location?: string | null; timezone?: string | null; website?: string | null; linkedin_url?: string | null; github_url?: string | null; portfolio_url?: string | null; phone_number?: string | null };
export type PrefsRow = { theme?: string; default_model?: string; email_digest?: boolean; realtime_notifications?: boolean; product_updates?: boolean } | null;
export type Sub = { subscription_plan?: string; subscription_status?: string; current_period_end?: string; stripe_customer_id?: string | null } | null;
export type ProviderKeyEntry = { id: string; provider: ProviderId; hasKey: boolean; baseUrl?: string | null; defaultModel?: string | null; providerMode: string; status: string; lastValidatedAt?: string | null; createdAt: string };
