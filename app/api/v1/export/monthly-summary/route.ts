import { getAuthUser } from '@/lib/auth';
import { toCsv, csvResponse } from '@/lib/csv';
import { monthlyTrend } from '@/lib/queries/derived';
import { toDecimalString } from '@fintrack/shared';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from') ?? '';
  const to = url.searchParams.get('to') ?? '';

  if (!from || !to) {
    return Response.json({ error: 'from and to are required (YYYY-MM)', code: 'VALIDATION_ERROR' }, { status: 400 });
  }

  const months = await monthlyTrend(user.id, from, to);

  const headers = ['month', 'in_hand_income_bdt', 'total_spending_bdt', 'net_savings_bdt', 'savings_rate_pct'];
  const rows = months.map((m) => [
    m.month,
    toDecimalString(m.in_hand_income_paisa),
    toDecimalString(m.total_spending_paisa),
    toDecimalString(m.net_savings_paisa),
    ((m.savings_rate_bps ?? 0) / 100).toFixed(2),
  ]);

  const filename = `monthly_summary_${from}_${to}.csv`;
  return csvResponse(toCsv(headers, rows), filename);
}
