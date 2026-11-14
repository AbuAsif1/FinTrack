import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminUser, AuthError } from '@/lib/auth';

async function getRegistrationState(): Promise<boolean> {
  const row = await prisma.siteSettings.findUnique({ where: { key: 'registration_open' } });
  if (!row) return true; // open by default if no row
  const val = row.valueJson as { enabled?: boolean };
  return val.enabled !== false;
}

export async function GET(req: Request) {
  try {
    await getAdminUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const open = await getRegistrationState();
  return Response.json({ registration_open: open });
}

const putSchema = z.object({
  registration_open: z.boolean(),
});

export async function PUT(req: Request) {
  try {
    await getAdminUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const r = putSchema.safeParse(body);
  if (!r.success) {
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  await prisma.siteSettings.upsert({
    where: { key: 'registration_open' },
    create: { key: 'registration_open', valueJson: { enabled: r.data.registration_open, changed_at: new Date().toISOString() } },
    update: { valueJson: { enabled: r.data.registration_open, changed_at: new Date().toISOString() } },
  });

  return Response.json({ registration_open: r.data.registration_open });
}
