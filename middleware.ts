import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public routes exempt from the refresh-cookie check
const PUBLIC_PATHS = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];
const API_PREFIX = '/api/';

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow all API routes and public pages through
  if (pathname.startsWith(API_PREFIX)) return NextResponse.next();
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.includes('.')) return NextResponse.next();

  // For app pages: redirect to /login if no refresh cookie
  const refreshCookie = req.cookies.get('refresh_token');
  if (!refreshCookie) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
