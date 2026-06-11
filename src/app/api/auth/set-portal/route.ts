import { NextRequest, NextResponse } from 'next/server';
import { isPortal, type Portal } from '@/lib/portalAuth';

export async function POST(request: NextRequest) {
  let portal: Portal | undefined;
  try {
    const body = await request.json() as { portal?: string };
    if (isPortal(body.portal)) portal = body.portal;
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  if (!portal) {
    return NextResponse.json({ error: 'Invalid portal' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  const host = request.headers.get('host') ?? '';
  const isProd = host.endsWith('repeateats.ca');

  res.cookies.set('rp_portal', portal, {
    path: '/',
    maxAge: 600,
    sameSite: 'lax',
    secure: isProd,
    ...(isProd ? { domain: '.repeateats.ca' } : {}),
  });

  return res;
}
