import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { generateRawToken, hashToken, checkRegRateLimit, recordRegAttempt } from '@/lib/auth';
import { getEmailTransport, passwordResetEmailHtml } from '@/lib/email';

const OK_RESPONSE = { message: 'If that email is registered, a password reset link has been sent.' };

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  await checkRegRateLimit(`pwreset:ip:${ip}`);

  const body = await req.json().catch(() => null);
  const result = z.object({ email: z.string().email() }).safeParse(body);
  if (!result.success) {
    return Response.json({ error: 'Valid email required', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const { email } = result.data;

  await checkRegRateLimit(`pwreset:email:${email.toLowerCase()}`);
  await recordRegAttempt(`pwreset:ip:${ip}`);
  await recordRegAttempt(`pwreset:email:${email.toLowerCase()}`);

  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    await prisma.emailToken.updateMany({
      where: { userId: user.id, purpose: 'PASSWORD_RESET', usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = generateRawToken();
    await prisma.emailToken.create({
      data: {
        userId: user.id,
        purpose: 'PASSWORD_RESET',
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;
    await getEmailTransport().send({
      to: user.email,
      subject: 'Reset your FinTrack BD password',
      html: passwordResetEmailHtml(resetUrl),
    });
  }

  return Response.json(OK_RESPONSE);
}
