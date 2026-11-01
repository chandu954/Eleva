import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'
import { validateEnv, reportEnvValidation } from '@/lib/env'

// Fail fast in production if required env vars are missing.
// Empty fallbacks allow build/test but must not silently boot production.
// NEXT_PHASE is set during `pnpm build`, so we skip the hard fail there.
const envResult = validateEnv(process.env)
reportEnvValidation(envResult)

const isProductionRuntime =
  process.env.NODE_ENV === 'production' &&
  !process.env.NEXT_PHASE?.includes('build')

if (isProductionRuntime && envResult.missingRequired.length > 0) {
  throw new Error(
    `Missing required env vars: ${envResult.missingRequired.join(', ')}`
  )
}

export async function middleware(request: NextRequest) {
  // Refresh Supabase session for ALL routes so /eleva pages can read the user
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-touch-icon.svg|site\\.webmanifest|robots\\.txt|api/health|api/webhooks|blog(?:/.*)?|.*\\.(?:svg|png|jpg|jpeg|gif|webp|txt|xml|json|webmanifest)$).*)',
  ],
}
