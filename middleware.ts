import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  
  if (userId && req.nextUrl.pathname === '/') {
    const isFromAuth = req.nextUrl.searchParams.get('__clerk_status') || 
                      req.headers.get('referer')?.includes('clerk.') ||
                      req.headers.get('referer')?.includes('accounts.google.com')
    
    if (isFromAuth) {
      const authCallback = new URL('/auth-callback', req.url)
      return NextResponse.redirect(authCallback)
    }
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}