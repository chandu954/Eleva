import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getSubscriptionAccessState } from '@/lib/subscription-access'

const devLog = process.env.NODE_ENV === 'development' ? console.log : () => {};

// Routes available on the free plan (auth still required)
const SUBSCRIPTION_EXEMPT_ROUTES = [
  '/home',
  '/profile',
  '/resumes',
  '/settings',
  '/subscription',
  '/start-trial',
  '/subscription/checkout',
  '/subscription/checkout-return',
  '/auth',
  '/api',
]

function isSubscriptionExemptRoute(pathname: string): boolean {
  return SUBSCRIPTION_EXEMPT_ROUTES.some(route => pathname.startsWith(route))
}

// Eleva public routes: landing page and the authentication flow
const ELEVA_PUBLIC_ROUTES = [
  '/eleva/auth',
  '/eleva/terms',
  '/eleva/privacy',
]

function isElevaPublicRoute(pathname: string): boolean {
  if (pathname === '/eleva' || pathname === '/eleva/') return true
  return ELEVA_PUBLIC_ROUTES.some(route => pathname.startsWith(route))
}

export async function updateSession(request: NextRequest) {
  // Debug logging
  devLog('🔍 updateSession running on:', request.nextUrl.pathname)
  const pathname = request.nextUrl.pathname
  
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: DO NOT REMOVE auth.getUser()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  
  // Debug logging
  devLog('👤 User authenticated:', !!user, 'user_id:', user?.id)

  // Create a new headers object with the existing headers
  // Given an incoming request...
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-pathname', pathname)

  // Recreate the response with the enriched request headers so the header
  // propagates to the page, without writing a cookie on every request
  // (Set-Cookie on navigation disables bfcache).
  supabaseResponse = NextResponse.next({
    request: {
      ...request,
      headers: requestHeaders,
    },
  })
  // Check if user is authenticated and redirect if needed
  if (!user) {
    // Allow access to public routes without a session (avoid redirect loops on '/')
    const isPublicRoute =
      pathname === '/' ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/blog') ||
      isElevaPublicRoute(pathname)

    if (isPublicRoute) {
      devLog('✅ Allowing unauthenticated access to public route:', pathname)
      return supabaseResponse
    }

    // Eleva workspace routes require authentication
    if (pathname.startsWith('/eleva')) {
      devLog('🚫 Redirecting unauthenticated user to Eleva login:', pathname)
      const url = request.nextUrl.clone()
      url.pathname = '/eleva/auth/login'
      url.search = ''
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }

    // If no user is authenticated, redirect to the landing page
    devLog('🚫 Redirecting unauthenticated user to landing page')
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Eleva routes never gate on subscription — they're the modern workspace
  if (pathname.startsWith('/eleva')) {
    return supabaseResponse
  }

  // Check if route requires subscription
  devLog('🛡️ Route check:', { pathname, isExempt: isSubscriptionExemptRoute(pathname) })

  if (!isSubscriptionExemptRoute(pathname)) {
    // Check if user has an active subscription or trial
    devLog('🧭 Subscription check for path:', pathname)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('subscription_plan, stripe_subscription_id, subscription_status, current_period_end, trial_end')
      .eq('user_id', user.id)
      .maybeSingle()

    devLog('📦 Subscription record:', {
      stripe_subscription_id: subscription?.stripe_subscription_id,
      subscription_status: subscription?.subscription_status,
      current_period_end: subscription?.current_period_end,
      trial_end: subscription?.trial_end,
    })

    const subscriptionState = getSubscriptionAccessState(subscription)
    const hasProtectedRouteAccess = subscriptionState.hasProAccess

    devLog('✅ accessCheck:', {
      status: subscription?.subscription_status,
      isTrialing: subscriptionState.isTrialing,
      isWithinAccessWindow: subscriptionState.isWithinAccessWindow,
      hasProtectedRouteAccess,
    })

    if (!hasProtectedRouteAccess) {
      devLog('🚫 User subscription access expired or invalid, redirecting to home')
      const url = request.nextUrl.clone()
      url.pathname = '/home'
      return NextResponse.redirect(url)
    }
  }

  devLog('✅ User authenticated, allowing access')


  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}
