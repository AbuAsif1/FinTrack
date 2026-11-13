import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Public routes exempt from the refresh-cookie check
const PUBLIC_PATHS = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];

// API routes that do not require an access token
const PUBLIC_API_PREFIXES = [
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/verify-email',
  '/api/v1/auth/resend-verification',
  '/api/v1/auth/password-reset',
  '/api/v1/auth/refresh',
  '/api/v1/health',
];
const PROTECTED_API_PREFIX = '/api/v1/';

function jwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.JWT_SECRET ?? '');
}

async function hasValidToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;
  try {
    await jwtVerify(authHeader.slice(7), jwtSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname.startsWith('/_next') || pathname.includes('.')) return NextResponse.next();

  // Protected API routes — reject missing/invalid tokens at the edge
  if (
    pathname.startsWith(PROTECTED_API_PREFIX) &&
    !PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))
  ) {
    const valid = await hasValidToken(req.headers.get('authorization'));
    if (!valid) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  // All other API routes pass through
  if (pathname.startsWith('/api/')) return NextResponse.next();

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

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
