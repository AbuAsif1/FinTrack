import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

const RoutingTypeEnum = z.enum([
  'NONE',
  'SAVINGS_DEPOSIT',
  'SAVINGS_WITHDRAWAL',
  'SAVINGS_INTEREST',
  'LOAN_GIVEN',
  'LOAN_RECEIVED',
  'TAX_PAYMENT',
]);

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  const cat = await prisma.category.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!cat) {
    return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  const body = await req.json().catch(() => null);
  const r = z
    .object({
      name: z.string().min(1).optional(),
      color_hex: z
        .string()
        .regex(/^#[0-9a-fA-F]{6}$/)
        .optional(),
      routing_type: RoutingTypeEnum.optional(),
      is_archived: z.boolean().optional(),
    })
    .safeParse(body);
  if (!r.success) {
    return Response.json(
      { error: 'Validation failed', code: 'VALIDATION_ERROR', fields: r.error.flatten().fieldErrors },
      { status: 422 },
    );
  }

  if (r.data.routing_type && r.data.routing_type !== cat.routingType) {
    const hasTransactions = await prisma.transaction.count({
      where: { categoryId: params.id, isDeleted: false },
    });
    if (hasTransactions > 0) {
      return Response.json(
        { error: 'Cannot change routing type after Transactions exist', code: 'ROUTING_TYPE_LOCKED' },
        { status: 422 },
      );
    }
  }

  if (r.data.name) {
    const existing = await prisma.category.findFirst({
      where: {
        userId: user.id,
        name: { equals: r.data.name, mode: 'insensitive' },
        NOT: { id: params.id },
      },
    });
    if (existing) {
      return Response.json({ error: 'Name already exists', code: 'DUPLICATE_NAME' }, { status: 422 });
    }
  }

  const updated = await prisma.category.update({
    where: { id: params.id },
    data: {
      ...(r.data.name && { name: r.data.name }),
      ...(r.data.color_hex && { colorHex: r.data.color_hex }),
      ...(r.data.routing_type && { routingType: r.data.routing_type }),
      ...(r.data.is_archived != null && { isArchived: r.data.is_archived }),
    },
  });
  return Response.json({
    id: updated.id,
    name: updated.name,
    routing_type: updated.routingType,
    color_hex: updated.colorHex,
    is_archived: updated.isArchived,
    created_at: updated.createdAt.toISOString(),
  });
}
