import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminUser, AuthError } from '@/lib/auth';
import { starterCategories } from '@/prisma/defaults/categories';
import type { RoutingType } from '@prisma/client';

function catToJson(c: {
  id: string; name: string; routingType: RoutingType;
  colorHex: string; isArchived: boolean; sortOrder: number;
  createdAt: Date; updatedAt: Date;
}) {
  return {
    id: c.id,
    name: c.name,
    routing_type: c.routingType,
    color_hex: c.colorHex,
    is_archived: c.isArchived,
    sort_order: c.sortOrder,
    created_at: c.createdAt.toISOString(),
    updated_at: c.updatedAt.toISOString(),
  };
}

async function ensureSeeded() {
  const count = await prisma.defaultCategory.count();
  if (count === 0) {
    // Seed from hardcoded list on first access
    for (let i = 0; i < starterCategories.length; i++) {
      const cat = starterCategories[i];
      await prisma.defaultCategory.upsert({
        where: { name: cat.name },
        create: { name: cat.name, routingType: cat.routingType, colorHex: cat.colorHex, sortOrder: i },
        update: {},
      });
    }
  }
}

export async function GET(req: Request) {
  try {
    await getAdminUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  await ensureSeeded();

  const list = await prisma.defaultCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return Response.json(list.map(catToJson));
}

const createSchema = z.object({
  name: z.string().min(1).max(100),
  routing_type: z.enum(['NONE', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL', 'SAVINGS_INTEREST', 'LOAN_GIVEN', 'LOAN_RECEIVED', 'TAX_PAYMENT']),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  sort_order: z.number().int().min(0).optional(),
});

export async function POST(req: Request) {
  try {
    await getAdminUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const body = await req.json().catch(() => null);
  const r = createSchema.safeParse(body);
  if (!r.success) {
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const existing = await prisma.defaultCategory.findUnique({ where: { name: r.data.name } });
  if (existing) {
    return Response.json({ error: 'Default category with this name already exists', code: 'DUPLICATE' }, { status: 409 });
  }

  const maxSort = await prisma.defaultCategory.aggregate({ _max: { sortOrder: true } });
  const sortOrder = r.data.sort_order ?? (maxSort._max.sortOrder ?? 0) + 1;

  const created = await prisma.defaultCategory.create({
    data: {
      name: r.data.name,
      routingType: r.data.routing_type as RoutingType,
      colorHex: r.data.color_hex,
      sortOrder,
    },
  });

  return Response.json(catToJson(created), { status: 201 });
}
