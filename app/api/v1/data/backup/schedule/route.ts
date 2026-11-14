import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';

const CADENCES = ['OFF', 'WEEKLY', 'MONTHLY'] as const;
const DELIVERIES = ['EMAIL'] as const;

const patchSchema = z.object({
  cadence: z.enum(CADENCES),
  delivery: z.enum(DELIVERIES).optional(),
});

export interface BackupPrefs {
  cadence: 'OFF' | 'WEEKLY' | 'MONTHLY';
  delivery: 'EMAIL';
}

function defaultPrefs(): BackupPrefs {
  return { cadence: 'OFF', delivery: 'EMAIL' };
}

function parsePrefs(json: unknown): BackupPrefs {
  if (!json || typeof json !== 'object') return defaultPrefs();
  const p = json as Partial<BackupPrefs>;
  return {
    cadence: CADENCES.includes(p.cadence as typeof CADENCES[number]) ? (p.cadence as BackupPrefs['cadence']) : 'OFF',
    delivery: 'EMAIL',
  };
}

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

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { backupPrefsJson: true },
  });

  if (!dbUser) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  return Response.json(parsePrefs(dbUser.backupPrefsJson));
}

export async function PATCH(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { backupPrefsJson: true },
  });
  if (!dbUser) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const current = parsePrefs(dbUser.backupPrefsJson);
  const updated: BackupPrefs = {
    cadence: parsed.data.cadence,
    delivery: parsed.data.delivery ?? current.delivery,
  };

  await prisma.user.update({
    where: { id: user.id },
    data: { backupPrefsJson: updated },
  });

  return Response.json(updated);
}
