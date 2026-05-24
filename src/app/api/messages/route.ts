// GET  /api/messages?collab_id=xxx  — fetch messages for a collab
// POST /api/messages                — send a message

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { CreateMessageBody } from '@/types/api';

// ─── GET ─────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { searchParams } = new URL(request.url);
  const collab_id = searchParams.get('collab_id');

  if (!collab_id) {
    return NextResponse.json({ error: 'collab_id is required' }, { status: 400 });
  }

  // Auth required — RLS will enforce participant-only access
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('collab_id', collab_id)
    .order('created_at', { ascending: true }); // oldest first, like a chat thread

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}

// ─── POST ────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const supabase = createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CreateMessageBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.collab_id || !body.text?.trim()) {
    return NextResponse.json(
      { error: 'collab_id and text are required' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      collab_id: body.collab_id,
      sender_id: user.id,
      text:      body.text.trim(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data }, { status: 201 });
}
