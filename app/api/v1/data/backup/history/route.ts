import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }

  const runs = await prisma.backupRun.findMany({
    where: { userId: user.id },
    orderBy: { runAt: 'desc' },
    take: 50,
    select: {
      id: true,
      runAt: true,
      recordCount: true,
      deliveryMethod: true,
      status: true,
      errorMessage: true,
    },
  });

  return Response.json(
    runs.map((r) => ({
      id: r.id,
      run_at: r.runAt.toISOString(),
      record_count: r.recordCount,
      delivery_method: r.deliveryMethod,
      status: r.status,
      error_message: r.errorMessage ?? null,
    })),
  );
}
