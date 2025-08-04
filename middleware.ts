import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  
  // Check if user just completed sign-in (coming from OAuth callback)
  if (userId && req.nextUrl.pathname === '/') {
    // Check if this is a post-auth redirect from Clerk
    const isFromAuth = req.nextUrl.searchParams.get('__clerk_status') || 
                      req.headers.get('referer')?.includes('clerk.') ||
                      req.headers.get('referer')?.includes('accounts.google.com')
    
    if (isFromAuth) {
      // Redirect to auth-callback to check subscription status
      const authCallback = new URL('/auth-callback', req.url)
      return NextResponse.redirect(authCallback)
    }
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}