import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

async function computeRunningBalance(loanPersonId: string, userId: string): Promise<number> {
  const givenSum = await prisma.transaction.aggregate({
    where: { userId, isDeleted: false, type: 'LOAN_GIVEN', loanEntry: { loanPersonId } },
    _sum: { amountPaisa: true },
  });
  const receivedSum = await prisma.transaction.aggregate({
    where: { userId, isDeleted: false, type: 'LOAN_RECEIVED', loanEntry: { loanPersonId } },
    _sum: { amountPaisa: true },
  });
  return Number(givenSum._sum.amountPaisa ?? 0n) - Number(receivedSum._sum.amountPaisa ?? 0n);
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const persons = await prisma.loanPerson.findMany({
    where: { userId: user.id },
    orderBy: { name: 'asc' },
  });

  const result = await Promise.all(
    persons.map(async (p) => {
      const balance = await computeRunningBalance(p.id, user.id);
      return {
        id: p.id,
        name: p.name,
        notes: p.notes ?? null,
        running_balance_paisa: balance,
        created_at: p.createdAt.toISOString(),
        updated_at: p.updatedAt.toISOString(),
      };
    }),
  );

  return Response.json(result);
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json();
  const { name, notes } = body;

  if (!name) {
    return Response.json({ error: 'name is required', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  // Case-insensitive uniqueness check
  const existing = await prisma.loanPerson.findFirst({
    where: {
      userId: user.id,
      name: { equals: name, mode: 'insensitive' },
    },
  });
  if (existing) {
    return Response.json({ error: 'A person with this name already exists', code: 'DUPLICATE_NAME' }, { status: 422 });
  }

  const person = await prisma.loanPerson.create({
    data: { userId: user.id, name, notes: notes ?? null },
  });

  return Response.json(
    {
      id: person.id,
      name: person.name,
      notes: person.notes ?? null,
      running_balance_paisa: 0,
      created_at: person.createdAt.toISOString(),
      updated_at: person.updatedAt.toISOString(),
    },
    { status: 201 },
  );
}
