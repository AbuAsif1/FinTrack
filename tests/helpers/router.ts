/**
 * Local router that maps (method, pathname) to the Next.js route handler export.
 * Tests call makeRequest() → this router → the actual handler function.
 * No HTTP server is needed.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (req: Request, ctx?: any) => Promise<Response>;
type RouteEntry = { pattern: RegExp; params: string[]; handlers: Partial<Record<string, Handler>> };

const routes: RouteEntry[] = [];

function addRoute(pattern: string, handlers: Partial<Record<string, Handler>>) {
  const params: string[] = [];
  const regexStr = pattern.replace(/:([^/]+)/g, (_match, name) => {
    params.push(name);
    return '([^/]+)';
  });
  routes.push({ pattern: new RegExp(`^${regexStr}$`), params, handlers });
}

export async function buildRouter() {
  const [
    healthMod,
    loginMod,
    refreshMod,
    logoutMod,
    changePasswordMod,
    meMod,
    registerMod,
    verifyEmailMod,
    resendMod,
    pwResetRequestMod,
    pwResetConfirmMod,
    categoriesMod,
    categoryIdMod,
    transactionsMod,
    transactionBulkDeleteMod,
    transactionIdMod,
  ] = await Promise.all([
    import('../../app/api/v1/health/route'),
    import('../../app/api/v1/auth/login/route'),
    import('../../app/api/v1/auth/refresh/route'),
    import('../../app/api/v1/auth/logout/route'),
    import('../../app/api/v1/auth/change-password/route'),
    import('../../app/api/v1/me/route'),
    import('../../app/api/v1/auth/register/route'),
    import('../../app/api/v1/auth/verify-email/route'),
    import('../../app/api/v1/auth/resend-verification/route'),
    import('../../app/api/v1/auth/password-reset/request/route'),
    import('../../app/api/v1/auth/password-reset/confirm/route'),
    import('../../app/api/v1/categories/route'),
    import('../../app/api/v1/categories/[id]/route'),
    import('../../app/api/v1/transactions/route'),
    import('../../app/api/v1/transactions/bulk-delete/route'),
    import('../../app/api/v1/transactions/[id]/route'),
  ]);

  routes.length = 0;

  addRoute('/api/v1/health', { GET: healthMod.GET });
  addRoute('/api/v1/auth/login', { POST: loginMod.POST });
  addRoute('/api/v1/auth/refresh', { POST: refreshMod.POST });
  addRoute('/api/v1/auth/logout', { POST: logoutMod.POST });
  addRoute('/api/v1/auth/change-password', { POST: changePasswordMod.POST });
  addRoute('/api/v1/me', { GET: meMod.GET, PATCH: meMod.PATCH });
  addRoute('/api/v1/auth/register', { POST: registerMod.POST });
  addRoute('/api/v1/auth/verify-email', { POST: verifyEmailMod.POST });
  addRoute('/api/v1/auth/resend-verification', { POST: resendMod.POST });
  addRoute('/api/v1/auth/password-reset/request', { POST: pwResetRequestMod.POST });
  addRoute('/api/v1/auth/password-reset/confirm', { POST: pwResetConfirmMod.POST });

  // Categories
  addRoute('/api/v1/categories', { GET: categoriesMod.GET, POST: categoriesMod.POST });
  addRoute('/api/v1/categories/:id', { PATCH: categoryIdMod.PATCH });

  // Transactions — bulk-delete before :id so it matches first
  addRoute('/api/v1/transactions', { GET: transactionsMod.GET, POST: transactionsMod.POST });
  addRoute('/api/v1/transactions/bulk-delete', { POST: transactionBulkDeleteMod.POST });
  addRoute('/api/v1/transactions/:id', {
    GET: transactionIdMod.GET,
    PATCH: transactionIdMod.PATCH,
    DELETE: transactionIdMod.DELETE,
  });
}

export function routeRequest(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  for (const { pattern, params: paramNames, handlers } of routes) {
    const match = pattern.exec(pathname);
    if (match) {
      const handler = handlers[req.method];
      if (!handler) {
        return new Response(JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const params: Record<string, string> = {};
      paramNames.forEach((name, i) => {
        params[name] = match[i + 1];
      });
      return handler(req, { params });
    }
  }

  return new Response(JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
