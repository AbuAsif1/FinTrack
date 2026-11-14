import { getAuthUser } from '@/lib/auth';
import { undoImport } from '@/lib/services/import-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await getAuthUser(req);
  if (!user) return Response.json({ error: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });

  const { id } = params;
  try {
    const result = await undoImport(user.id, id);
    return Response.json(result, { status: 200 });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message ?? 'Failed', code: 'ERROR' }, { status: e.status ?? 500 });
  }
}
