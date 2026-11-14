import { prisma } from '@/lib/prisma';
import { getAdminUser, AuthError } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await getAdminUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const thisMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [totalUsers, activeLast30, registeredThisMonth, regSetting] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: thisMonthStart } } }),
    prisma.siteSettings.findUnique({ where: { key: 'registration_open' } }),
  ]);

  const registrationOpen = regSetting
    ? (regSetting.valueJson as { enabled?: boolean }).enabled !== false
    : true;

  return Response.json({
    total_users: totalUsers,
    active_last_30_days: activeLast30,
    registered_this_month: registeredThisMonth,
    registration_open: registrationOpen,
  });
}
