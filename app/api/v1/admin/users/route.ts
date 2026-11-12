import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminUser, generateRawToken, hashToken } from '@/lib/auth';
import { provisionNewUser } from '@/lib/provision';
import { getEmailTransport, passwordResetEmailHtml } from '@/lib/email';
import { logAdminAction, userToJson } from '@/lib/admin-helpers';

export async function GET(req: Request) {
  const admin = await getAdminUser(req);
  void admin; // used for auth check

  const url = new URL(req.url);
  const q = url.searchParams.get('q');
  const status = url.searchParams.get('status');
  const role = url.searchParams.get('role');
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const page_size = Math.min(100, Math.max(1, parseInt(url.searchParams.get('page_size') ?? '20', 10)));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];
  }
  if (role) where.role = role;
  if (status === 'ACTIVE') {
    where.emailVerifiedAt = { not: null };
    where.deactivatedAt = null;
  } else if (status === 'UNVERIFIED') {
    where.emailVerifiedAt = null;
  } else if (status === 'DEACTIVATED') {
    where.deactivatedAt = { not: null };
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * page_size,
      take: page_size,
      include: { payments: { orderBy: { coversUntil: 'desc' }, take: 1 } },
    }),
  ]);

  return Response.json({ data: users.map(userToJson), total, page, page_size });
}

export async function POST(req: Request) {
  const admin = await getAdminUser(req);
  const body = await req.json().catch(() => null);
  const r = z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(['USER', 'ADMIN']).default('USER'),
    })
    .safeParse(body);
  if (!r.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: r.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email: r.data.email } });
  if (existing) {
    return Response.json({ error: 'Email already registered', code: 'DUPLICATE_EMAIL' }, { status: 422 });
  }

  let rawToken = '';
  let newUser: { id: string; name: string; email: string; role: string } | null = null;

  await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: r.data.name,
        email: r.data.email,
        role: r.data.role,
        emailVerifiedAt: new Date(),
      },
    });
    newUser = { id: created.id, name: created.name, email: created.email, role: created.role };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await provisionNewUser(created.id, tx as any);
    rawToken = generateRawToken();
    await tx.emailToken.create({
      data: {
        userId: created.id,
        purpose: 'PASSWORD_RESET',
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  });

  if (!newUser) throw new Error('User creation failed');
  const u = newUser as { id: string; name: string; email: string; role: string };

  await logAdminAction(admin.id, u.id, u.email, 'CREATE_USER', `role=${u.role}`);

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
  await getEmailTransport().send({
    to: u.email,
    subject: 'Set your FinTrack BD password',
    html: passwordResetEmailHtml(resetUrl),
  });

  return Response.json({ id: u.id, name: u.name, email: u.email, role: u.role }, { status: 201 });
}
