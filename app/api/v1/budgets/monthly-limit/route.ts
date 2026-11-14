import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { monthlyLimitPaisa: true },
  });

  return Response.json({
    monthly_limit_paisa: record?.monthlyLimitPaisa !== null && record?.monthlyLimitPaisa !== undefined
      ? Number(record.monthlyLimitPaisa)
      : null,
  });
}

const putSchema = z.object({
  monthly_limit_paisa: z.number().int().positive().nullable(),
});

export async function PUT(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const r = putSchema.safeParse(body);
  if (!r.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: r.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { monthlyLimitPaisa: r.data.monthly_limit_paisa !== null ? BigInt(r.data.monthly_limit_paisa) : null },
  });

  return Response.json({
    monthly_limit_paisa: r.data.monthly_limit_paisa,
  });
}
