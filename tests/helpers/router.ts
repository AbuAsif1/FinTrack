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
    savingsAccountsMod,
    savingsAccountIdMod,
    savingsAccountTxsMod,
    loanPersonsMod,
    loanPersonIdMod,
    loanEntriesMod,
    loanEntryIdMod,
    loanSettleMod,
    loansSummaryMod,
    incomeEntriesMod,
    incomeEntryIdMod,
    incomeSummaryMod,
    holidaySupportMod,
    holidaySupportIdMod,
    fixedExpensesMod,
    fixedExpenseIdMod,
    fixedExpenseInstancesMod,
    fixedInstancePayMod,
    fixedInstanceSkipMod,
    fixedInstanceReopenMod,
    adminUsersMod,
    adminUserIdMod,
    adminDeactivateMod,
    adminReactivateMod,
    adminResendVerifyMod,
    adminSendPwResetMod,
    adminPaymentsMod,
    adminPaymentIdMod,
    adminActionsMod,
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
    import('../../app/api/v1/savings-accounts/route'),
    import('../../app/api/v1/savings-accounts/[id]/route'),
    import('../../app/api/v1/savings-accounts/[id]/transactions/route'),
    import('../../app/api/v1/loan-persons/route'),
    import('../../app/api/v1/loan-persons/[id]/route'),
    import('../../app/api/v1/loan-persons/[id]/entries/route'),
    import('../../app/api/v1/loan-persons/[id]/entries/[entryId]/route'),
    import('../../app/api/v1/loan-persons/[id]/settle/route'),
    import('../../app/api/v1/loans/summary/route'),
    import('../../app/api/v1/income-entries/route'),
    import('../../app/api/v1/income-entries/[id]/route'),
    import('../../app/api/v1/income-entries/summary/route'),
    import('../../app/api/v1/holiday-support-entries/route'),
    import('../../app/api/v1/holiday-support-entries/[id]/route'),
    import('../../app/api/v1/fixed-expenses/route'),
    import('../../app/api/v1/fixed-expenses/[id]/route'),
    import('../../app/api/v1/fixed-expense-instances/route'),
    import('../../app/api/v1/fixed-expense-instances/[id]/pay/route'),
    import('../../app/api/v1/fixed-expense-instances/[id]/skip/route'),
    import('../../app/api/v1/fixed-expense-instances/[id]/reopen/route'),
    import('../../app/api/v1/admin/users/route'),
    import('../../app/api/v1/admin/users/[id]/route'),
    import('../../app/api/v1/admin/users/[id]/deactivate/route'),
    import('../../app/api/v1/admin/users/[id]/reactivate/route'),
    import('../../app/api/v1/admin/users/[id]/resend-verification/route'),
    import('../../app/api/v1/admin/users/[id]/send-password-reset/route'),
    import('../../app/api/v1/admin/users/[id]/payments/route'),
    import('../../app/api/v1/admin/users/[id]/payments/[paymentId]/route'),
    import('../../app/api/v1/admin/actions/route'),
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

  // Savings accounts — :id/transactions before :id
  addRoute('/api/v1/savings-accounts', { GET: savingsAccountsMod.GET, POST: savingsAccountsMod.POST });
  addRoute('/api/v1/savings-accounts/:id/transactions', { GET: savingsAccountTxsMod.GET });
  addRoute('/api/v1/savings-accounts/:id', { GET: savingsAccountIdMod.GET, PATCH: savingsAccountIdMod.PATCH });

  // Loans — specific sub-routes before :id
  addRoute('/api/v1/loans/summary', { GET: loansSummaryMod.GET });
  addRoute('/api/v1/loan-persons', { GET: loanPersonsMod.GET, POST: loanPersonsMod.POST });
  addRoute('/api/v1/loan-persons/:id/entries/:entryId', {
    PATCH: loanEntryIdMod.PATCH,
    DELETE: loanEntryIdMod.DELETE,
  });
  addRoute('/api/v1/loan-persons/:id/entries', { GET: loanEntriesMod.GET, POST: loanEntriesMod.POST });
  addRoute('/api/v1/loan-persons/:id/settle', { POST: loanSettleMod.POST });
  addRoute('/api/v1/loan-persons/:id', { PATCH: loanPersonIdMod.PATCH });

  // Income — summary before :id
  addRoute('/api/v1/income-entries/summary', { GET: incomeSummaryMod.GET });
  addRoute('/api/v1/income-entries', { GET: incomeEntriesMod.GET, POST: incomeEntriesMod.POST });
  addRoute('/api/v1/income-entries/:id', { PATCH: incomeEntryIdMod.PATCH, DELETE: incomeEntryIdMod.DELETE });

  // Holiday Support
  addRoute('/api/v1/holiday-support-entries', { GET: holidaySupportMod.GET, POST: holidaySupportMod.POST });
  addRoute('/api/v1/holiday-support-entries/:id', { PATCH: holidaySupportIdMod.PATCH, DELETE: holidaySupportIdMod.DELETE });

  // Fixed Expenses — instance sub-routes before :id
  addRoute('/api/v1/fixed-expenses', { GET: fixedExpensesMod.GET, POST: fixedExpensesMod.POST });
  addRoute('/api/v1/fixed-expenses/:id', { PATCH: fixedExpenseIdMod.PATCH });
  addRoute('/api/v1/fixed-expense-instances', { GET: fixedExpenseInstancesMod.GET });
  addRoute('/api/v1/fixed-expense-instances/:id/pay', { POST: fixedInstancePayMod.POST });
  addRoute('/api/v1/fixed-expense-instances/:id/skip', { POST: fixedInstanceSkipMod.POST });
  addRoute('/api/v1/fixed-expense-instances/:id/reopen', { POST: fixedInstanceReopenMod.POST });

  // Admin — specific sub-routes before :id
  addRoute('/api/v1/admin/users', { GET: adminUsersMod.GET, POST: adminUsersMod.POST });
  addRoute('/api/v1/admin/users/:id/deactivate', { POST: adminDeactivateMod.POST });
  addRoute('/api/v1/admin/users/:id/reactivate', { POST: adminReactivateMod.POST });
  addRoute('/api/v1/admin/users/:id/resend-verification', { POST: adminResendVerifyMod.POST });
  addRoute('/api/v1/admin/users/:id/send-password-reset', { POST: adminSendPwResetMod.POST });
  addRoute('/api/v1/admin/users/:id/payments/:paymentId', {
    PATCH: adminPaymentIdMod.PATCH,
    DELETE: adminPaymentIdMod.DELETE,
  });
  addRoute('/api/v1/admin/users/:id/payments', { GET: adminPaymentsMod.GET, POST: adminPaymentsMod.POST });
  addRoute('/api/v1/admin/users/:id', {
    GET: adminUserIdMod.GET,
    PATCH: adminUserIdMod.PATCH,
    DELETE: adminUserIdMod.DELETE,
  });
  addRoute('/api/v1/admin/actions', { GET: adminActionsMod.GET });
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
