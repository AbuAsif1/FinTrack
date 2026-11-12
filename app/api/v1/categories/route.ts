import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser, AuthError } from '@/lib/auth';

const RoutingTypeEnum = z.enum([
  'NONE',
  'SAVINGS_DEPOSIT',
  'SAVINGS_WITHDRAWAL',
  'SAVINGS_INTEREST',
  'LOAN_GIVEN',
  'LOAN_RECEIVED',
  'TAX_PAYMENT',
]);

function catToJson(cat: {
  id: string;
  name: string;
  routingType: string;
  colorHex: string;
  isArchived: boolean;
  createdAt: Date;
}) {
  return {
    id: cat.id,
    name: cat.name,
    routing_type: cat.routingType,
    color_hex: cat.colorHex,
    is_archived: cat.isArchived,
    created_at: cat.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    const cats = await prisma.category.findMany({
      where: { userId: user.id },
      orderBy: [{ isArchived: 'asc' }, { name: 'asc' }],
    });
    return Response.json(cats.map(catToJson));
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  const body = await req.json().catch(() => null);
  const r = z
    .object({
      name: z.string().min(1),
      routing_type: RoutingTypeEnum.default('NONE'),
      color_hex: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .default('#888888'),
    })
    .safeParse(body);
  if (!r.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: r.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  const existing = await prisma.category.findFirst({
    where: { userId: user.id, name: { equals: r.data.name, mode: 'insensitive' } },
  });
  if (existing) {
    return Response.json({ error: 'Category name already exists', code: 'DUPLICATE_NAME' }, { status: 422 });
  }

  const cat = await prisma.category.create({
    data: {
      userId: user.id,
      name: r.data.name,
      routingType: r.data.routing_type,
      colorHex: r.data.color_hex,
    },
  });
  return Response.json(catToJson(cat), { status: 201 });
}
