import { headers } from "next/headers";
import "./globals.css";
import { Toaster } from "sonner";
import { Footer } from "@/components/layout/footer";
import { AppHeader } from "@/components/layout/app-header";
import { createClient } from "@/utils/supabase/server";
import { Metadata, Viewport } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { PostHogPageView } from "@/components/analytics/posthog-pageview";
import {
  IMPERSONATION_STATE_COOKIE_NAME,
  parseImpersonationStateCookieValue,
} from "@/lib/impersonation";
import { getSubscriptionAccessState } from "@/lib/subscription-access";
import { Suspense } from "react";

export const viewport: Viewport = {
  themeColor: "#6366F1",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://eleva.app"),
  title: {
    default: "Eleva - AI-Powered Resume Builder",
    template: "%s | Eleva",
  },
  description:
    "Elevate every opportunity. Create tailored, ATS-optimized resumes powered by AI. Land your dream tech job with personalized resume optimization.",
  applicationName: "Eleva",
  keywords: [
    "resume builder",
    "AI resume",
    "ATS optimization",
    "tech jobs",
    "career tools",
    "job application",
    "eleva",
  ],
  authors: [{ name: "Eleva" }],
  creator: "Eleva",
  publisher: "Eleva",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
    other: [{ rel: "mask-icon", url: "/icon.svg", color: "#6366F1" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    siteName: "Eleva",
    title: "Eleva - AI-Powered Resume Builder",
    description:
      "Elevate every opportunity. Create tailored, ATS-optimized resumes powered by AI. Land your dream tech job with personalized resume optimization.",
    images: [
      {
        url: "/og.webp",
        width: 1200,
        height: 630,
        alt: "Eleva - AI Resume Builder",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eleva - AI-Powered Resume Builder",
    description:
      "Elevate every opportunity. Create tailored, ATS-optimized resumes powered by AI. Land your dream tech job with personalized resume optimization.",
    images: ["/og.webp"],
    creator: "@eleva",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const hdr = await headers();
  const pathname =
    hdr.get("x-pathname") ||
    hdr.get("x-invoke-path") ||
    hdr.get("next-url") ||
    "";
  const isEleva = pathname.startsWith("/eleva");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const impersonationState = parseImpersonationStateCookieValue(
    cookieStore.get(IMPERSONATION_STATE_COOKIE_NAME)?.value
  );
  const isImpersonating = Boolean(impersonationState);

  let showUpgradeButton = false;
  let isProPlan = false;
  let subscriptionPlan = "free";
  let subscriptionStatus: string | null = null;
  let upgradeButtonVariant: "trial" | "upgrade" = "upgrade";

  if (user) {
    try {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select(
          "subscription_plan, subscription_status, current_period_end, trial_end, stripe_subscription_id"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      const subscriptionState = getSubscriptionAccessState(subscription);
      const hasProAccess = subscriptionState.hasProAccess;
      const needsTrial = subscriptionState.needsTrial;

      isProPlan = hasProAccess;
      subscriptionPlan =
        subscriptionState.effectivePlan ||
        subscription?.subscription_plan ||
        "free";
      subscriptionStatus = subscription?.subscription_status ?? null;
      showUpgradeButton = !hasProAccess;
      upgradeButtonVariant = needsTrial ? "trial" : "upgrade";
    } catch {
      showUpgradeButton = true;
      isProPlan = false;
      subscriptionPlan = "free";
      subscriptionStatus = null;
      upgradeButtonVariant = "upgrade";
    }
  }

  return (
    <html lang="en">
      <body className="font-sans">
        <PostHogProvider
          user={
            user
              ? {
                  id: user.id,
                  subscriptionPlan,
                  subscriptionStatus,
                  isPro: isProPlan,
                }
              : null
          }
        >
          <Suspense fallback={null}>
            <PostHogPageView />
          </Suspense>

          {isImpersonating && user && (
            <div className="bg-amber-500 text-white text-center text-sm py-2">
              Impersonating{" "}
              <span className="font-semibold">
                {user.email ?? user.id}
              </span>
              .{" "}
              <Link
                href="/stop-impersonation"
                className="underline font-medium"
              >
                Stop impersonating
              </Link>
            </div>
          )}

          <div className="relative min-h-screen flex flex-col">
            {user && !isEleva && (
              <AppHeader
                showUpgradeButton={showUpgradeButton}
                isProPlan={isProPlan}
                upgradeButtonVariant={upgradeButtonVariant}
              />
            )}

            <main className="flex-1">
              {children}
            </main>

            {user && !isEleva && <Footer />}
          </div>

          <Toaster
            richColors
            position="top-right"
            closeButton
            toastOptions={{
              style: {
                fontSize: "1rem",
                padding: "16px",
                minWidth: "400px",
                maxWidth: "500px",
              },
            }}
          />

        </PostHogProvider>
      </body>
    </html>
  );
}