import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateRawToken, hashToken, checkRegRateLimit, recordRegAttempt } from '@/lib/auth';
import { provisionNewUser } from '@/lib/provision';
import { getEmailTransport, verificationEmailHtml } from '@/lib/email';
import type { Prisma } from '@prisma/client';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(10, 'Password must be at least 10 characters'),
});

const OK_RESPONSE = { message: 'If that email is not registered, a verification link has been sent.' };

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>;

export async function POST(req: Request) {
  if (process.env.SIGNUP_MODE === 'closed') {
    return Response.json({ error: 'Registration is closed', code: 'SIGNUP_CLOSED' }, { status: 403 });
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';
  await checkRegRateLimit(`reg:ip:${ip}`);

  const body = await req.json().catch(() => null);
  const result = registerSchema.safeParse(body);
  if (!result.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const { name, email, password } = result.data;

  await checkRegRateLimit(`reg:email:${email.toLowerCase()}`);
  await recordRegAttempt(`reg:ip:${ip}`);
  await recordRegAttempt(`reg:email:${email.toLowerCase()}`);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return Response.json(OK_RESPONSE);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  let rawToken = '';

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { email, name, passwordHash },
    });
    await provisionNewUser(user.id, tx as unknown as TxClient);
    rawToken = generateRawToken();
    await tx.emailToken.create({
      data: {
        userId: user.id,
        purpose: 'VERIFY_EMAIL' as Prisma.EmailTokenCreateInput['purpose'],
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  });

  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  const verifyUrl = `${appUrl}/verify-email?token=${rawToken}`;
  await getEmailTransport().send({
    to: email,
    subject: 'Verify your FinTrack BD email',
    html: verificationEmailHtml(verifyUrl),
  });

  return Response.json(OK_RESPONSE);
}
