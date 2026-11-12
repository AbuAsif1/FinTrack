import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateRawToken, hashToken, checkRegRateLimit, recordRegAttempt } from '@/lib/auth';
import { getEmailTransport, verificationEmailHtml } from '@/lib/email';

const OK_RESPONSE = { message: 'If that email has an unverified account, a new link has been sent.' };

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  await checkRegRateLimit(`resend:ip:${ip}`);

  const body = await req.json().catch(() => null);
  const result = z.object({ email: z.string().email() }).safeParse(body);
  if (!result.success) {
    return Response.json({ error: 'Valid email required', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const { email } = result.data;

  await checkRegRateLimit(`resend:email:${email.toLowerCase()}`);
  await recordRegAttempt(`resend:ip:${ip}`);
  await recordRegAttempt(`resend:email:${email.toLowerCase()}`);

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.emailVerifiedAt) {
    return Response.json(OK_RESPONSE);
  }

  await prisma.emailToken.updateMany({
    where: { userId: user.id, purpose: 'VERIFY_EMAIL', usedAt: null },
    data: { usedAt: new Date() },
  });

  const rawToken = generateRawToken();
  await prisma.emailToken.create({
    data: {
      userId: user.id,
      purpose: 'VERIFY_EMAIL',
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const verifyUrl = `${appUrl}/verify-email?token=${rawToken}`;
  await getEmailTransport().send({
    to: user.email,
    subject: 'Verify your FinTrack BD email',
    html: verificationEmailHtml(verifyUrl),
  });

  return Response.json(OK_RESPONSE);
}
