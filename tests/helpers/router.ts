/**
 * Local router that maps (method, pathname) to the Next.js route handler export.
 * Tests call makeRequest() → this router → the actual handler function.
 * No HTTP server is needed.
 */

type Handler = (req: Request) => Promise<Response>;
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
  ] = await Promise.all([
    import('../../app/api/v1/health/route'),
    import('../../app/api/v1/auth/login/route'),
    import('../../app/api/v1/auth/refresh/route'),
    import('../../app/api/v1/auth/logout/route'),
    import('../../app/api/v1/auth/change-password/route'),
    import('../../app/api/v1/me/route'),
  ]);

  routes.length = 0;

  addRoute('/api/v1/health', { GET: healthMod.GET });
  addRoute('/api/v1/auth/login', { POST: loginMod.POST });
  addRoute('/api/v1/auth/refresh', { POST: refreshMod.POST });
  addRoute('/api/v1/auth/logout', { POST: logoutMod.POST });
  addRoute('/api/v1/auth/change-password', { POST: changePasswordMod.POST });
  addRoute('/api/v1/me', { GET: meMod.GET, PATCH: meMod.PATCH });
}

export function routeRequest(req: Request): Response | Promise<Response> {
  const url = new URL(req.url);
  const pathname = url.pathname;

  for (const { pattern, handlers } of routes) {
    if (pattern.test(pathname)) {
      const handler = handlers[req.method];
      if (!handler) {
        return new Response(JSON.stringify({ error: 'Method not allowed', code: 'METHOD_NOT_ALLOWED' }), {
          status: 405,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return handler(req);
    }
  }

  return new Response(JSON.stringify({ error: 'Not found', code: 'NOT_FOUND' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
