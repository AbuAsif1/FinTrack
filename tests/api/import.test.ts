/**
 * TC-IMP-001 to TC-IMP-015 â€” Data import
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createTestContext } from '../helpers/index';
import { routeRequest } from '../helpers/router';

type Ctx = Awaited<ReturnType<typeof createTestContext>>;

let ctx: Ctx;

beforeEach(async () => {
  ctx = await createTestContext();
});

afterEach(async () => {
  await ctx?.cleanup();
});

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function getAuthHeaders(ctx: Ctx, user: Ctx['createUser'] extends (...args: unknown[]) => Promise<infer T> ? T : never) {
  return ctx.authHeader(user);
}

async function makeFormRequest(
  method: string,
  path: string,
  form: FormData,
  token: string,
): Promise<Response> {
  const req = new Request(`http://localhost${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  return routeRequest(req);
}

async function login(ctx: Ctx, user: { email: string; password: string }) {
  const res = await ctx.makeRequest('POST', '/api/v1/auth/login', { body: { email: user.email, password: user.password } });
  const data = (await res.json()) as { accessToken: string };
  return data.accessToken;
}

function makeCSV(headers: string, ...rows: string[]) {
  return [headers, ...rows].join('\r\n') + '\r\n';
}

function csvFile(content: string, name = 'test.csv') {
  return new File([content], name, { type: 'text/csv' });
}

// â”€â”€ TC-IMP-001: Templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-001: download templates', () => {
  it('returns CSV with correct headers for INCOME', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('GET', '/api/v1/imports/templates/INCOME', { headers });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('month');
    expect(text).toContain('income_type');
    expect(text).toContain('gross_bdt');
  });

  it('returns CSV for TRANSACTIONS', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('GET', '/api/v1/imports/templates/TRANSACTIONS', { headers });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('date');
    expect(text).toContain('amount_bdt');
    expect(text).toContain('category');
  });

  it('returns CSV for LOAN_ENTRIES', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('GET', '/api/v1/imports/templates/LOAN_ENTRIES', { headers });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('person');
    expect(text).toContain('direction');
  });

  it('returns 400 for unknown dataset', async () => {
    const user = await ctx.createUser({ provision: true });
    const headers = await ctx.authHeader(user);
    const res = await ctx.makeRequest('GET', '/api/v1/imports/templates/BOGUS', { headers });
    expect(res.status).toBe(400);
  });
});

// â”€â”€ TC-IMP-002: Preview valid transactions file â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-002: preview valid transactions file', () => {
  it('reports row count and nothing is saved yet', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);

    // Find the NONE category
    const catRes = await ctx.makeRequest('GET', '/api/v1/categories', { headers: { Authorization: `Bearer ${token}` } });
    const cats = await catRes.json() as Array<{ name: string; routing_type: string }>;
    const none = cats.find((c) => c.routing_type === 'NONE')!;

    const csv = makeCSV(
      'date,amount_bdt,description,category,payment_method,savings_account,loan_person,tax_fiscal_year',
      `2026-11-01,1198.50,Groceries,${none.name},CASH,,,`,
      `2026-11-02,500.00,Coffee,${none.name},CASH,,,`,
    );
    const form = new FormData();
    form.append('dataset', 'TRANSACTIONS');
    form.append('file', csvFile(csv));

    const res = await makeFormRequest('POST', '/api/v1/imports/preview', form, token);
    expect(res.status).toBe(200);
    const data = await res.json() as { total_rows: number; valid_rows: number; error_rows: unknown[]; batch_id: string };
    expect(data.total_rows).toBe(2);
    expect(data.valid_rows).toBe(2);
    expect(data.error_rows).toHaveLength(0);

    // Nothing committed yet
    const txRes = await ctx.makeRequest('GET', '/api/v1/transactions', { headers: { Authorization: `Bearer ${token}` } });
    const txs = await txRes.json() as { total: number };
    expect(txs.total).toBe(0);
  });
});

// â”€â”€ TC-IMP-003: Preview with errors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-003: preview with bad rows', () => {
  it('lists each bad row with its reason', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);

    const csv = makeCSV(
      'date,amount_bdt,description,category,payment_method,savings_account,loan_person,tax_fiscal_year',
      `not-a-date,100.00,Bad date,Food,CASH,,,`,
      `2026-11-01,abc,Bad amount,Food,CASH,,,`,
      `2026-11-01,100.00,Bad category,NONEXISTENT_CAT,CASH,,,`,
    );
    const form = new FormData();
    form.append('dataset', 'TRANSACTIONS');
    form.append('file', csvFile(csv));

    const res = await makeFormRequest('POST', '/api/v1/imports/preview', form, token);
    expect(res.status).toBe(200);
    const data = await res.json() as { error_rows: Array<{ row: number; reason: string }> };
    expect(data.error_rows.length).toBeGreaterThanOrEqual(3);
    // All rows have reasons
    data.error_rows.forEach((e) => expect(e.reason).toBeTruthy());
  });
});

// â”€â”€ TC-IMP-004: TDS exceeds gross â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-004: TDS exceeds gross in income file', () => {
  it('flags that row in preview', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);

    const csv = makeCSV(
      'month,income_type,gross_bdt,tds_bdt,is_taxable,employer_name,payer_name,earned_period,comment',
      '2026-11,SALARY,10000.00,20000.00,true,,,,',
    );
    const form = new FormData();
    form.append('dataset', 'INCOME');
    form.append('file', csvFile(csv));

    const res = await makeFormRequest('POST', '/api/v1/imports/preview', form, token);
    expect(res.status).toBe(200);
    const data = await res.json() as { error_rows: Array<{ reason: string }> };
    expect(data.error_rows.length).toBeGreaterThan(0);
    expect(data.error_rows[0].reason).toContain('TDS');
  });
});

// â”€â”€ TC-IMP-005: Commit valid preview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-005: commit a valid preview', () => {
  it('every row exists after commit; totals match', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);

    const catRes = await ctx.makeRequest('GET', '/api/v1/categories', { headers: { Authorization: `Bearer ${token}` } });
    const cats = await catRes.json() as Array<{ name: string; routing_type: string }>;
    const none = cats.find((c) => c.routing_type === 'NONE')!;

    const csv = makeCSV(
      'date,amount_bdt,description,category,payment_method,savings_account,loan_person,tax_fiscal_year',
      `2026-11-01,1198.50,Groceries,${none.name},CASH,,,`,
    );
    const form = new FormData();
    form.append('dataset', 'TRANSACTIONS');
    form.append('file', csvFile(csv));

    const previewRes = await makeFormRequest('POST', '/api/v1/imports/preview', form, token);
    const preview = await previewRes.json() as { batch_id: string };

    const commitRes = await ctx.makeRequest('POST', `/api/v1/imports/${preview.batch_id}/commit`, { headers: { Authorization: `Bearer ${token}` } });
    expect(commitRes.status).toBe(200);
    const commitData = await commitRes.json() as { committed: number };
    expect(commitData.committed).toBe(1);

    const txRes = await ctx.makeRequest('GET', '/api/v1/transactions', { headers: { Authorization: `Bearer ${token}` } });
    const txs = await txRes.json() as { data: Array<{ amount_paisa: number }> };
    expect(txs.data.some((t) => t.amount_paisa === 119850)).toBe(true);
  });
});

// â”€â”€ TC-IMP-006: Commit preview with errors â†’ 422, nothing saved â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-006: commit preview with errors is 422', () => {
  it('returns 422 and nothing is saved', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);

    const csv = makeCSV(
      'date,amount_bdt,description,category,payment_method,savings_account,loan_person,tax_fiscal_year',
      `bad-date,100.00,Bad,Food,CASH,,,`,
    );
    const form = new FormData();
    form.append('dataset', 'TRANSACTIONS');
    form.append('file', csvFile(csv));

    const previewRes = await makeFormRequest('POST', '/api/v1/imports/preview', form, token);
    const preview = await previewRes.json() as { batch_id: string };

    const commitRes = await ctx.makeRequest('POST', `/api/v1/imports/${preview.batch_id}/commit`, { headers: { Authorization: `Bearer ${token}` } });
    expect(commitRes.status).toBe(422);

    const txRes = await ctx.makeRequest('GET', '/api/v1/transactions', { headers: { Authorization: `Bearer ${token}` } });
    const txs = await txRes.json() as { total: number };
    expect(txs.total).toBe(0);
  });
});

// â”€â”€ TC-IMP-007: Re-import same file adds nothing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-007: importing same file twice adds nothing', () => {
  it('already_imported = row count on second preview', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);

    const catRes = await ctx.makeRequest('GET', '/api/v1/categories', { headers: { Authorization: `Bearer ${token}` } });
    const cats = await catRes.json() as Array<{ name: string; routing_type: string }>;
    const none = cats.find((c) => c.routing_type === 'NONE')!;

    const csv = makeCSV(
      'date,amount_bdt,description,category,payment_method,savings_account,loan_person,tax_fiscal_year',
      `2026-11-01,500.00,Test,${none.name},CASH,,,`,
    );

    // First import
    const form1 = new FormData();
    form1.append('dataset', 'TRANSACTIONS');
    form1.append('file', csvFile(csv));
    const p1 = await makeFormRequest('POST', '/api/v1/imports/preview', form1, token);
    const preview1 = await p1.json() as { batch_id: string };
    await ctx.makeRequest('POST', `/api/v1/imports/${preview1.batch_id}/commit`, { headers: { Authorization: `Bearer ${token}` } });

    // Second preview of same file
    const form2 = new FormData();
    form2.append('dataset', 'TRANSACTIONS');
    form2.append('file', csvFile(csv));
    const p2 = await makeFormRequest('POST', '/api/v1/imports/preview', form2, token);
    const preview2 = await p2.json() as { already_imported: number; total_rows: number };
    expect(preview2.already_imported).toBe(1);

    // Transactions count still 1
    const txRes = await ctx.makeRequest('GET', '/api/v1/transactions', { headers: { Authorization: `Bearer ${token}` } });
    const txs = await txRes.json() as { total: number };
    expect(txs.total).toBe(1);
  });
});

// â”€â”€ TC-IMP-008: Two identical rows in same file â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-008: two identical rows both imported', () => {
  it('commits both rows with different idempotency keys', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);

    const catRes = await ctx.makeRequest('GET', '/api/v1/categories', { headers: { Authorization: `Bearer ${token}` } });
    const cats = await catRes.json() as Array<{ name: string; routing_type: string }>;
    const none = cats.find((c) => c.routing_type === 'NONE')!;

    const csv = makeCSV(
      'date,amount_bdt,description,category,payment_method,savings_account,loan_person,tax_fiscal_year',
      `2026-11-01,500.00,Test,${none.name},CASH,,,`,
      `2026-11-01,500.00,Test,${none.name},CASH,,,`,
    );
    const form = new FormData();
    form.append('dataset', 'TRANSACTIONS');
    form.append('file', csvFile(csv));

    const previewRes = await makeFormRequest('POST', '/api/v1/imports/preview', form, token);
    const preview = await previewRes.json() as { batch_id: string; valid_rows: number };
    expect(preview.valid_rows).toBe(2);

    await ctx.makeRequest('POST', `/api/v1/imports/${preview.batch_id}/commit`, { headers: { Authorization: `Bearer ${token}` } });

    const txRes = await ctx.makeRequest('GET', '/api/v1/transactions', { headers: { Authorization: `Bearer ${token}` } });
    const txs = await txRes.json() as { total: number };
    expect(txs.total).toBe(2);
  });
});

// â”€â”€ TC-IMP-009: Undo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-009: undo removes rows', () => {
  it('transactions leave the list after undo', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);

    const catRes = await ctx.makeRequest('GET', '/api/v1/categories', { headers: { Authorization: `Bearer ${token}` } });
    const cats = await catRes.json() as Array<{ name: string; routing_type: string }>;
    const none = cats.find((c) => c.routing_type === 'NONE')!;

    const csv = makeCSV(
      'date,amount_bdt,description,category,payment_method,savings_account,loan_person,tax_fiscal_year',
      `2026-11-01,750.00,Shopping,${none.name},CASH,,,`,
    );
    const form = new FormData();
    form.append('dataset', 'TRANSACTIONS');
    form.append('file', csvFile(csv));

    const previewRes = await makeFormRequest('POST', '/api/v1/imports/preview', form, token);
    const preview = await previewRes.json() as { batch_id: string };
    await ctx.makeRequest('POST', `/api/v1/imports/${preview.batch_id}/commit`, { headers: { Authorization: `Bearer ${token}` } });

    // Confirm it's there
    const before = await ctx.makeRequest('GET', '/api/v1/transactions', { headers: { Authorization: `Bearer ${token}` } });
    expect(((await before.json()) as { total: number }).total).toBe(1);

    // Undo
    const undoRes = await ctx.makeRequest('POST', `/api/v1/imports/${preview.batch_id}/undo`, { headers: { Authorization: `Bearer ${token}` } });
    expect(undoRes.status).toBe(200);

    // Gone
    const after = await ctx.makeRequest('GET', '/api/v1/transactions', { headers: { Authorization: `Bearer ${token}` } });
    expect(((await after.json()) as { total: number }).total).toBe(0);
  });
});

// â”€â”€ TC-IMP-011: Decimal precision â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-011: amount 1198.50 stored as exactly 119850 paisa', () => {
  it('commits to the right paisa value', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);

    const catRes = await ctx.makeRequest('GET', '/api/v1/categories', { headers: { Authorization: `Bearer ${token}` } });
    const cats = await catRes.json() as Array<{ name: string; routing_type: string }>;
    const none = cats.find((c) => c.routing_type === 'NONE')!;

    const csv = makeCSV(
      'date,amount_bdt,description,category,payment_method,savings_account,loan_person,tax_fiscal_year',
      `2026-11-01,1198.50,Test,${none.name},CASH,,,`,
    );
    const form = new FormData();
    form.append('dataset', 'TRANSACTIONS');
    form.append('file', csvFile(csv));

    const previewRes = await makeFormRequest('POST', '/api/v1/imports/preview', form, token);
    const preview = await previewRes.json() as { batch_id: string };
    await ctx.makeRequest('POST', `/api/v1/imports/${preview.batch_id}/commit`, { headers: { Authorization: `Bearer ${token}` } });

    const txRes = await ctx.makeRequest('GET', '/api/v1/transactions', { headers: { Authorization: `Bearer ${token}` } });
    const txs = await txRes.json() as { data: Array<{ amount_paisa: number }> };
    expect(txs.data[0].amount_paisa).toBe(119850);
  });
});

// â”€â”€ TC-IMP-014: File too large / too many rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-014: file over 2 MB is rejected', () => {
  it('returns 422 with clear message', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);

    // Create a file just over 2 MB
    const bigContent = 'date,amount_bdt,description,category,payment_method,savings_account,loan_person,tax_fiscal_year\r\n'
      + '2026-11-01,100.00,X,Food,CASH,,,\r\n'.repeat(1).padEnd(2 * 1024 * 1024 + 10, 'x');
    const form = new FormData();
    form.append('dataset', 'TRANSACTIONS');
    form.append('file', csvFile(bigContent, 'big.csv'));

    const res = await makeFormRequest('POST', '/api/v1/imports/preview', form, token);
    expect(res.status).toBe(422);
    const data = await res.json() as { code: string };
    expect(data.code).toBe('FILE_TOO_LARGE');
  });
});

// â”€â”€ TC-IMP-016: List past imports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('TC-IMP-016: list past imports', () => {
  it('returns created batch with filename, row count and status', async () => {
    const user = await ctx.createUser({ provision: true });
    const token = await login(ctx, user);

    const catRes = await ctx.makeRequest('GET', '/api/v1/categories', { headers: { Authorization: `Bearer ${token}` } });
    const cats = await catRes.json() as Array<{ name: string; routing_type: string }>;
    const none = cats.find((c) => c.routing_type === 'NONE')!;

    const csv = makeCSV(
      'date,amount_bdt,description,category,payment_method,savings_account,loan_person,tax_fiscal_year',
      `2026-11-01,100.00,Test,${none.name},CASH,,,`,
    );
    const form = new FormData();
    form.append('dataset', 'TRANSACTIONS');
    form.append('file', csvFile(csv, 'my_data.csv'));

    const previewRes = await makeFormRequest('POST', '/api/v1/imports/preview', form, token);
    await previewRes.json();

    const listRes = await ctx.makeRequest('GET', '/api/v1/imports', { headers: { Authorization: `Bearer ${token}` } });
    expect(listRes.status).toBe(200);
    const list = await listRes.json() as Array<{ filename: string; row_count: number; status: string }>;
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0].filename).toBe('my_data.csv');
    expect(list[0].row_count).toBe(1);
    expect(list[0].status).toBe('PREVIEWED');
  });
});
