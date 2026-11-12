import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminUser } from '@/lib/auth';
import { adminGuards, AdminGuardError, logAdminAction, userToJson } from '@/lib/admin-helpers';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  await getAdminUser(req);
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    include: { payments: { orderBy: { coversUntil: 'desc' }, take: 1 } },
  });
  if (!user) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  return Response.json(userToJson(user));
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser(req);
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  try {
    adminGuards(admin.id, target);
  } catch (err) {
    if (err instanceof AdminGuardError) return Response.json({ error: err.code, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const r = z
    .object({
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      role: z.enum(['ADMIN']).optional(), // can only promote, not demote
    })
    .safeParse(body);
  if (!r.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: r.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  if (r.data.email && r.data.email !== target.email) {
    const dup = await prisma.user.findUnique({ where: { email: r.data.email } });
    if (dup) return Response.json({ error: 'Email already in use', code: 'DUPLICATE_EMAIL' }, { status: 422 });
  }

  const updated = await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(r.data.name && { name: r.data.name }),
      ...(r.data.email && { email: r.data.email }),
      ...(r.data.role && { role: r.data.role }),
    },
    include: { payments: { orderBy: { coversUntil: 'desc' }, take: 1 } },
  });

  await logAdminAction(admin.id, target.id, target.email, 'UPDATE_USER', JSON.stringify(r.data));
  return Response.json(userToJson(updated));
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser(req);
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  try {
    adminGuards(admin.id, target);
  } catch (err) {
    if (err instanceof AdminGuardError) return Response.json({ error: err.code, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const r = z.object({ email: z.string() }).safeParse(body);
  if (!r.success || r.data.email !== target.email) {
    return Response.json({ error: 'Email confirmation does not match', code: 'EMAIL_MISMATCH' }, { status: 422 });
  }

  // Log BEFORE delete so targetUserId is still valid
  await logAdminAction(admin.id, target.id, target.email, 'DELETE_USER');

  await prisma.user.delete({ where: { id: params.id } });
  return new Response(null, { status: 204 });
}
