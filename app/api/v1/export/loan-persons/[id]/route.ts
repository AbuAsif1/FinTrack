import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { fromDbDate } from '@fintrack/shared';
import { toCsv, paisaToBdt, csvResponse } from '@/lib/csv';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const person = await prisma.loanPerson.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!person) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const entries = await prisma.loanEntry.findMany({
    where: { userId: user.id, loanPersonId: params.id },
    include: { transaction: true },
    orderBy: { transaction: { date: 'asc' } },
  });

  const headers = ['date', 'direction', 'amount_bdt', 'reason', 'running_balance_bdt'];
  let runningBalance = 0;
  const rows = entries.map((e) => {
    const amount = Number(e.transaction.amountPaisa);
    if (e.direction === 'GIVEN') runningBalance += amount;
    else runningBalance -= amount;
    return [
      fromDbDate(e.transaction.date),
      e.direction,
      paisaToBdt(e.transaction.amountPaisa),
      e.reason ?? '',
      paisaToBdt(runningBalance),
    ];
  });

  return csvResponse(
    toCsv(headers, rows),
    `loan_${person.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`,
  );
}
