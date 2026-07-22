import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Refresh Supabase session for ALL routes so /eleva pages can read the user
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-touch-icon.svg|site\\.webmanifest|api/health|api/webhooks|blog(?:/.*)?|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
