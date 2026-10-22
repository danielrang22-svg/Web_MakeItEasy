import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthRole } from '@/lib/auth';
import { testConnection } from '@/lib/ai/chat';

export const maxDuration = 30;

// POST — Prueba real de la conexión (1 token)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await verifyAuthRole(request, ['admin']);
  if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

  const { id } = await params;
  const result = await testConnection(id);

  return NextResponse.json(result, { status: result.ok ? 200 : 502 });
}
