// GET   /api/collabs/[id]  — single collab detail
// PATCH /api/collabs/[id]  — update status (accept, cancel, complete)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { UpdateCollabBody } from '@/types/api';

type RouteParams = { params: { id: string } };

// ─── GET ─────────────────────────────────────────────────────
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('collabs')
    .select(`
      *,
      restaurant:restaurants (
        id, name, cuisine, city, logo_url
      ),
      influencer:influencers (
        id, instagram_handle, follower_count
      )
    `)
    .eq('id', params.id)
    .single();

  if (error) {
    const status = error.code === 'PGRST116' ? 404 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  return NextResponse.json({ data });
}

// ─── PATCH ───────────────────────────────────────────────────
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch collab with enough info to check participation
  const { data: collab } = await supabase
    .from('collabs')
    .select(`
      id, status, influencer_id,
      restaurant:restaurants ( owner_id ),
      influencer:influencers ( user_id )
    `)
    .eq('id', params.id)
    .single();

  if (!collab) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const restaurantOwner  = (collab.restaurant as unknown as { owner_id: string } | null)?.owner_id;
  const influencerUser   = (collab.influencer  as unknown as { user_id:  string } | null)?.user_id;
  // Allow if user is restaurant owner, matched influencer, OR any auth user applying to an open collab
  const isOpenForApply   = collab.status === 'open' && !collab.influencer_id;
  const isParticipant    = restaurantOwner === user.id || influencerUser === user.id || isOpenForApply;

  if (!isParticipant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: UpdateCollabBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // When an influencer applies, resolve their auth uid → influencers.id
  // (NegotiateModal sends user.id but collabs.influencer_id references influencers.id)
  const patchData = { ...body } as Record<string, unknown>;
  if (isOpenForApply && 'influencer_id' in patchData) {
    const { data: infRow } = await supabase
      .from('influencers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (infRow) {
      patchData.influencer_id = infRow.id;
    } else {
      // Auto-create a minimal influencer record so the user can participate
      const { data: newInf, error: infErr } = await supabase
        .from('influencers')
        .insert({ user_id: user.id, rating: 0, total_collabs: 0 })
        .select('id')
        .single();
      if (infErr) return NextResponse.json({ error: 'Could not create influencer profile' }, { status: 500 });
      patchData.influencer_id = newInf.id;
    }
  }

  const { data, error } = await supabase
    .from('collabs')
    .update(patchData)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
