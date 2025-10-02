import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
    const isApiRoute = req.nextUrl.pathname.startsWith('/api')

    // Redirect authenticated users away from auth pages
    if (isAuthPage && token) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // Protect API routes
    if (isApiRoute && !token) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    // Role-based access control
    if (token) {
      const isAdminRoute = req.nextUrl.pathname.startsWith('/settings') ||
                          req.nextUrl.pathname.startsWith('/api/users') ||
                          req.nextUrl.pathname.startsWith('/api/price-rules')

      if (isAdminRoute && token.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', req.url))
      }
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAuthPage = req.nextUrl.pathname.startsWith('/auth')
        const isPublicPage = req.nextUrl.pathname === '/' || 
                           req.nextUrl.pathname.startsWith('/api/auth')

        // Allow access to auth pages and public pages
        if (isAuthPage || isPublicPage) {
          return true
        }

        // Require authentication for all other pages
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
