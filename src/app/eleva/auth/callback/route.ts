import { createClient } from '@/utils/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { type EmailOtpType } from '@supabase/supabase-js';

function getSafeRedirectPath(path: string | null, fallback = '/eleva/dashboard') {
  if (!path) return fallback;
  if (!path.startsWith('/')) return fallback;
  if (path.startsWith('//')) return fallback;
  return path;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = searchParams.get('next');

  // Handle email confirmation (token_hash flow)
  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      const redirectPath = getSafeRedirectPath(next);
      return NextResponse.redirect(new URL(redirectPath, origin));
    }
    return NextResponse.redirect(`${origin}/eleva/auth/login?err=email_confirmation`);
  }

  // Handle OAuth callback (code flow)
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocal = process.env.NODE_ENV === 'development';
      const redirectPath = getSafeRedirectPath(next);
      if (isLocal) return NextResponse.redirect(`${origin}${redirectPath}`);
      if (forwardedHost) return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
  }

  return NextResponse.redirect(`${origin}/eleva/auth/login?err=oauth`);
}
