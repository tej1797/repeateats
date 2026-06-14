import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify user owns this ticket
  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 });

  const { data, error } = await supabase
    .from('support_messages')
    .insert({ ticket_id: id, sender_id: user.id, content: content.trim() })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data }, { status: 201 });
}
