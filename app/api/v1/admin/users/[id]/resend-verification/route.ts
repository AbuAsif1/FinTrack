import { prisma } from '@/lib/prisma';
import { getAdminUser, generateRawToken, hashToken } from '@/lib/auth';
import { getEmailTransport, verificationEmailHtml } from '@/lib/email';
import { adminGuards, AdminGuardError, logAdminAction } from '@/lib/admin-helpers';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const admin = await getAdminUser(req);
  const target = await prisma.user.findUnique({ where: { id: params.id } });
  if (!target) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  try {
    adminGuards(admin.id, target);
  } catch (err) {
    if (err instanceof AdminGuardError) return Response.json({ error: err.code, code: err.code }, { status: err.status });
    throw err;
  }

  // Invalidate old VERIFY_EMAIL tokens
  await prisma.emailToken.updateMany({
    where: { userId: params.id, purpose: 'VERIFY_EMAIL', usedAt: null },
    data: { usedAt: new Date() },
  });

  const rawToken = generateRawToken();
  await prisma.emailToken.create({
    data: {
      userId: params.id,
      purpose: 'VERIFY_EMAIL',
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const verifyUrl = `${appUrl}/verify-email?token=${rawToken}`;
  await getEmailTransport().send({
    to: target.email,
    subject: 'Verify your email — FinTrack',
    html: verificationEmailHtml(verifyUrl),
  });

  await logAdminAction(admin.id, target.id, target.email, 'RESEND_VERIFICATION');
  return Response.json({ message: 'Verification email sent' });
}
