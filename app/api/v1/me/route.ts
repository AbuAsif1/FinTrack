import { NextResponse } from 'next/server';
import { z } from 'zod';
import { patchMeSchema } from '@fintrack/shared';
import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';

export async function GET(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, email: true, role: true, lastLoginAt: true, createdAt: true, preferredPeriod: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json(dbUser, { status: 200 });
}

export async function PATCH(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 422 });
  }

  const parsed = patchMeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation error', code: 'VALIDATION_ERROR', fields: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      ...(parsed.data.name !== undefined && { name: parsed.data.name }),
      ...(parsed.data.preferred_period !== undefined && { preferredPeriod: parsed.data.preferred_period }),
    },
    select: { id: true, name: true, email: true, role: true, preferredPeriod: true },
  });

  return NextResponse.json(updated, { status: 200 });
}

export async function DELETE(req: Request) {
  let user: Awaited<ReturnType<typeof getAuthUser>>;
  try {
    user = await getAuthUser(req);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
    }
    throw err;
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id }, select: { email: true } });
  if (!dbUser) {
    return NextResponse.json({ error: 'User not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 422 });
  }

  const parsed = z.object({ email: z.string() }).safeParse(body);
  if (!parsed.success || parsed.data.email.toLowerCase() !== dbUser.email.toLowerCase()) {
    return NextResponse.json({ error: 'Email confirmation does not match', code: 'EMAIL_MISMATCH' }, { status: 422 });
  }

  // Hard-delete the user; CASCADE removes all owned rows (ADR-0013).
  await prisma.user.delete({ where: { id: user.id } });

  return NextResponse.json({ ok: true }, { status: 200 });
}
