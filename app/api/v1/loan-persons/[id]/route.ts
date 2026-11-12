import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const person = await prisma.loanPerson.findFirst({
    where: { id: params.id, userId: user.id },
  });
  if (!person) return Response.json({ error: 'Not found', code: 'NOT_FOUND' }, { status: 404 });

  const body = await req.json();
  const { name, notes } = body;

  if (name != null) {
    // Case-insensitive uniqueness check (excluding self)
    const conflict = await prisma.loanPerson.findFirst({
      where: {
        userId: user.id,
        name: { equals: name, mode: 'insensitive' },
        id: { not: params.id },
      },
    });
    if (conflict) {
      return Response.json({ error: 'A person with this name already exists', code: 'DUPLICATE_NAME' }, { status: 422 });
    }
  }

  const updated = await prisma.loanPerson.update({
    where: { id: params.id },
    data: {
      ...(name != null && { name }),
      ...(notes !== undefined && { notes: notes ?? null }),
    },
  });

  return Response.json({
    id: updated.id,
    name: updated.name,
    notes: updated.notes ?? null,
    created_at: updated.createdAt.toISOString(),
    updated_at: updated.updatedAt.toISOString(),
  });
}
