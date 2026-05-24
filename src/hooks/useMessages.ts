'use client';
// useMessages — fetch messages and subscribe to live updates via Supabase Realtime
// Supabase Realtime is like a WebSocket that listens to Postgres changes.
// When a new row is inserted in the messages table, this hook adds it to the state
// automatically — no polling needed.

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client'; // browser client for Realtime
import type { Message } from '@/types/index';

interface UseMessagesResult {
  messages:    Message[];
  sendMessage: (text: string) => Promise<void>;
  loading:     boolean;
  error:       string | null;
}

export function useMessages(collabId: string): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);

  // useRef keeps the Supabase client stable across re-renders
  // (createClient() is cheap but we don't want to recreate it each render)
  const supabase = useRef(createClient()).current;

  // Fetch existing messages from REST API
  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/messages?collab_id=${collabId}`);
      const json = await res.json() as { data?: Message[]; error?: string };

      if (!res.ok || json.error) throw new Error(json.error ?? 'Failed to load messages');
      setMessages(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [collabId]);

  // Subscribe to new messages via Supabase Realtime
  useEffect(() => {
    fetchMessages();

    // Create a Realtime channel that listens for INSERT events on public.messages
    // filtered to this specific collab — we only get messages we care about.
    const channel = supabase
      .channel(`messages:${collabId}`)    // channel name must be unique per subscription
      .on(
        'postgres_changes',
        {
          event:  'INSERT',               // only listen for new rows
          schema: 'public',
          table:  'messages',
          filter: `collab_id=eq.${collabId}`,
        },
        (payload) => {
          // payload.new contains the newly inserted row
          const newMessage = payload.new as Message;
          setMessages((prev) => [...prev, newMessage]);
        }
      )
      .subscribe();

    // Cleanup: unsubscribe when the component unmounts or collabId changes
    return () => {
      supabase.removeChannel(channel);
    };
  }, [collabId, fetchMessages, supabase]);

  // Send a message via the REST API (Realtime will echo it back)
  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    const res  = await fetch('/api/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ collab_id: collabId, text: trimmed }),
    });
    const json = await res.json() as { error?: string };
    if (!res.ok || json.error) {
      throw new Error(json.error ?? 'Failed to send message');
    }
    // The message will appear via the Realtime subscription — no need to push manually
  };

  return { messages, sendMessage, loading, error };
}
