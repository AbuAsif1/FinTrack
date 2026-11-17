import { authenticate } from '@/lib/auth';
import { commitImport } from '@/lib/services/import-service';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const user = await authenticate(req);
  if (user instanceof Response) return user;

  const { id } = params;
  try {
    const result = await commitImport(user.id, id);
    return Response.json(result, { status: 200 });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    return Response.json({ error: e.message ?? 'Failed', code: 'ERROR' }, { status: e.status ?? 500 });
  }
}
