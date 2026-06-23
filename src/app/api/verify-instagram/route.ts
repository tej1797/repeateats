// GET /api/verify-instagram?handle=xxx
// Resolves an Instagram handle to followers / name / avatar. Best-effort chain:
//   1. Meta Graph API "Business Discovery" — reliable, needs META_IG_TOKEN +
//      META_IG_USER_ID (source:'meta', verified:true).
//   2. Public-page scrape — no API key, but unofficial & may be blocked by IG
//      (source:'scrape', verified:false).
//   3. Format-only — handle looks valid but no live data (source:'format').
// Never throws: when nothing resolves, returns followers:null so the form just
// leaves the field blank.
import { NextRequest, NextResponse } from 'next/server';

interface IgResult {
  valid: boolean; verified?: boolean; handle: string; url: string;
  followers: number | null; full_name: string | null; avatar_url: string | null;
  source: 'meta' | 'scrape' | 'format'; note?: string;
}

async function viaMeta(handle: string): Promise<IgResult | null> {
  const token = process.env.META_IG_TOKEN;
  const igUser = process.env.META_IG_USER_ID;
  if (!token || !igUser) return null;
  try {
    const fields = `business_discovery.username(${handle}){followers_count,name,profile_picture_url}`;
    const url = `https://graph.facebook.com/v21.0/${igUser}?fields=${encodeURIComponent(fields)}&access_token=${token}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    const json = await res.json() as { business_discovery?: { followers_count?: number; name?: string; profile_picture_url?: string } };
    const bd = json.business_discovery;
    if (!bd) return null;
    return {
      valid: true, verified: true, handle, url: `https://instagram.com/${handle}`,
      followers: bd.followers_count ?? null, full_name: bd.name ?? null,
      avatar_url: bd.profile_picture_url ?? null, source: 'meta',
    };
  } catch { return null; }
}

async function viaScrape(handle: string): Promise<IgResult | null> {
  try {
    const res = await fetch(`https://www.instagram.com/${handle}/`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const followerMatch = html.match(/"edge_followed_by":\{"count":(\d+)\}/);
    const fullNameMatch = html.match(/"full_name":"([^"]*)"/);
    const avatarMatch   = html.match(/"profile_pic_url(?:_hd)?":"([^"]+)"/);
    const looksValid = followerMatch !== null || fullNameMatch !== null || html.includes('"ProfilePage"');
    if (!looksValid) return null;
    return {
      valid: true, verified: false, handle, url: `https://instagram.com/${handle}`,
      followers: followerMatch ? parseInt(followerMatch[1], 10) : null,
      full_name: fullNameMatch?.[1] ? fullNameMatch[1].replace(/\\u[\dA-Fa-f]{4}/g, '') : null,
      avatar_url: avatarMatch?.[1] ? avatarMatch[1].replace(/\\u0026/g, '&') : null,
      source: 'scrape',
    };
  } catch { return null; }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get('handle')?.replace(/^@+/, '').trim();

  if (!handle || handle.length < 2) return NextResponse.json({ valid: false });
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(handle)) {
    return NextResponse.json({ valid: false, handle, note: 'Invalid Instagram handle format' });
  }

  const meta = await viaMeta(handle);
  if (meta) return NextResponse.json(meta);

  const scrape = await viaScrape(handle);
  if (scrape) return NextResponse.json(scrape);

  // Format-only fallback — handle is plausible but we couldn't fetch live data.
  return NextResponse.json({
    valid: true, handle, url: `https://instagram.com/${handle}`,
    followers: null, full_name: null, avatar_url: null, source: 'format',
    note: 'Format valid — live follower lookup unavailable',
  } satisfies IgResult);
}
