import { prisma } from './prisma';

export class AdminGuardError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

export function adminGuards(
  adminId: string,
  target: { id: string; role: string },
) {
  if (target.id === adminId) throw new AdminGuardError(409, 'SELF_ACTION');
  if (target.role === 'ADMIN') throw new AdminGuardError(409, 'ADMIN_PROTECTED');
}

export function userStatus(user: {
  emailVerifiedAt: Date | null;
  deactivatedAt: Date | null;
  deactivatedUntil: Date | null;
}): 'ACTIVE' | 'UNVERIFIED' | 'DEACTIVATED_UNTIL' | 'DEACTIVATED' {
  if (!user.emailVerifiedAt) return 'UNVERIFIED';
  if (user.deactivatedAt) {
    return user.deactivatedUntil ? 'DEACTIVATED_UNTIL' : 'DEACTIVATED';
  }
  return 'ACTIVE';
}

export async function logAdminAction(
  adminId: string,
  targetUserId: string | null,
  targetEmail: string,
  action: string,
  detail?: string,
) {
  await prisma.adminAction.create({
    data: { adminId, targetUserId, targetEmail, action, detail },
  });
}

export function userToJson(user: {
  id: string;
  name: string;
  email: string;
  role: string;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  deactivatedAt: Date | null;
  deactivatedUntil: Date | null;
  createdAt: Date;
  payments?: Array<{ paidOn: Date; coversUntil: Date }>;
}) {
  const lastPayment = user.payments?.[0] ?? null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: userStatus(user),
    email_verified_at: user.emailVerifiedAt?.toISOString() ?? null,
    last_login_at: user.lastLoginAt?.toISOString() ?? null,
    deactivated_at: user.deactivatedAt?.toISOString() ?? null,
    deactivated_until: user.deactivatedUntil?.toISOString() ?? null,
    created_at: user.createdAt.toISOString(),
    last_payment: lastPayment
      ? {
          paid_on: lastPayment.paidOn.toISOString().slice(0, 10),
          covers_until: lastPayment.coversUntil.toISOString().slice(0, 10),
        }
      : null,
  };
}
