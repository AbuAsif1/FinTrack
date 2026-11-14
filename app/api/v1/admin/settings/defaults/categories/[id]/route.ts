import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAdminUser, AuthError } from '@/lib/auth';
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

const patchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color_hex: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  is_archived: z.boolean().optional(),
  sort_order: z.number().int().min(0).optional(),
  routing_type: z.enum(['NONE', 'SAVINGS_DEPOSIT', 'SAVINGS_WITHDRAWAL', 'SAVINGS_INTEREST', 'LOAN_GIVEN', 'LOAN_RECEIVED', 'TAX_PAYMENT']).optional(),
});

export async function PATCH(req: Request, ctx: { params: { id: string } }) {
  try {
    await getAdminUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const cat = await prisma.defaultCategory.findUnique({ where: { id: ctx.params.id } });
  if (!cat) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const r = patchSchema.safeParse(body);
  if (!r.success) {
    return Response.json({ error: 'Validation failed', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const updated = await prisma.defaultCategory.update({
    where: { id: cat.id },
    data: {
      ...(r.data.name !== undefined && { name: r.data.name }),
      ...(r.data.color_hex !== undefined && { colorHex: r.data.color_hex }),
      ...(r.data.is_archived !== undefined && { isArchived: r.data.is_archived }),
      ...(r.data.sort_order !== undefined && { sortOrder: r.data.sort_order }),
      ...(r.data.routing_type !== undefined && { routingType: r.data.routing_type as RoutingType }),
    },
  });

  return Response.json(catToJson(updated));
}

export async function DELETE(req: Request, ctx: { params: { id: string } }) {
  try {
    await getAdminUser(req);
  } catch (err) {
    if (err instanceof AuthError) return Response.json({ error: err.message, code: err.code }, { status: err.status });
    throw err;
  }

  const cat = await prisma.defaultCategory.findUnique({ where: { id: ctx.params.id } });
  if (!cat) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  await prisma.defaultCategory.delete({ where: { id: cat.id } });
  return new Response(null, { status: 204 });
}
