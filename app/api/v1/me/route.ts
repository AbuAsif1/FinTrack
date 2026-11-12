import { NextResponse } from 'next/server';
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
    select: { id: true, name: true, email: true, role: true, lastLoginAt: true, createdAt: true },
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
    data: { name: parsed.data.name },
    select: { id: true, name: true, email: true, role: true },
  });

  return NextResponse.json(updated, { status: 200 });
}
