import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const persons = await prisma.loanPerson.findMany({
    where: { userId: user.id },
  });

  let owedToMe = 0;
  let iOwe = 0;

  for (const person of persons) {
    const givenSum = await prisma.transaction.aggregate({
      where: { userId: user.id, isDeleted: false, type: 'LOAN_GIVEN', loanEntry: { loanPersonId: person.id } },
      _sum: { amountPaisa: true },
    });
    const receivedSum = await prisma.transaction.aggregate({
      where: { userId: user.id, isDeleted: false, type: 'LOAN_RECEIVED', loanEntry: { loanPersonId: person.id } },
      _sum: { amountPaisa: true },
    });
    const balance = Number(givenSum._sum.amountPaisa ?? 0n) - Number(receivedSum._sum.amountPaisa ?? 0n);
    if (balance > 0) owedToMe += balance;
    else if (balance < 0) iOwe += Math.abs(balance);
  }

  return Response.json({
    owed_to_me_paisa: owedToMe,
    i_owe_paisa: iOwe,
    net_paisa: owedToMe - iOwe,
  });
}
