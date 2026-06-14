import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: messages } = await supabase
    .from('support_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ ticket, messages: messages ?? [] });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const updates: Record<string, unknown> = {};
  if (body.status)      updates.status = body.status;
  if (body.priority)    updates.priority = body.priority;
  if (body.description) updates.description = body.description;
  if (body.status === 'resolved') updates.resolved_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}
