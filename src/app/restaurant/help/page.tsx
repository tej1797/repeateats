'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IconArrowLeft, IconDeviceLaptop, IconCreditCard,
  IconHelp, IconSend, IconChevronRight, IconCircleCheck,
  IconClock, IconAlertCircle, IconX, IconUser, IconBuildingStore,
  IconChevronDown, IconBrandWhatsapp, IconMessage, IconFileAlert,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import MobileNav from '@/components/layout/MobileNav';

// ── Config ────────────────────────────────────────────────────────────────────
const BRAND       = '#1249A9';
const BRAND_LIGHT = '#EEF3FF';
const WHATSAPP_NUMBER = '14161234567';
const WHATSAPP_MSG    = encodeURIComponent('Hi RepEAT Support! I need help with my restaurant account.');

// ── Types ─────────────────────────────────────────────────────────────────────
interface SupportTicket {
  id: string;
  category: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved';
  priority: string;
  created_at: string;
  resolved_at: string | null;
}

interface SupportMessage {
  id: string;
  content: string;
  is_admin: boolean;
  created_at: string;
}

interface RestaurantInfo {
  id: string;
  name: string;
}

const CATEGORIES = [
  { id: 'claim',     icon: IconFileAlert,     label: 'Claim Dispute',   desc: "Customer claimed a deal they didn't redeem or misused it" },
  { id: 'technical', icon: IconDeviceLaptop,  label: 'Technical Issue', desc: 'Portal bugs, dashboard errors, or login problems' },
  { id: 'payment',   icon: IconCreditCard,    label: 'Payment',         desc: 'Subscription, billing, or payment questions' },
  { id: 'general',   icon: IconHelp,          label: 'General Enquiry', desc: 'Deal setup, account settings, or other questions' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

const STATUS_CONFIG = {
  open:        { label: 'Open',        color: '#F59E0B', bg: '#FFFBEB', dot: 'bg-yellow-400'  },
  in_progress: { label: 'In Progress', color: '#3B82F6', bg: '#EFF6FF', dot: 'bg-blue-500'    },
  resolved:    { label: 'Resolved',    color: '#22C55E', bg: '#F0FDF4', dot: 'bg-green-500'   },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Components ────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: SupportTicket['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function WhatsAppFloat() {
  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 md:bottom-6"
      style={{ background: '#25D366' }}
      aria-label="Chat on WhatsApp"
    >
      <IconBrandWhatsapp size={28} color="#fff" />
    </a>
  );
}

// ── Ticket Detail Modal ───────────────────────────────────────────────────────
function TicketDetailModal({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMsg,   setNewMsg]   = useState('');
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cat = CATEGORIES.find(c => c.id === ticket.category);

  useEffect(() => {
    fetch(`/api/support/tickets/${ticket.id}/messages`)
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []));
  }, [ticket.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newMsg.trim() }),
    });
    if (res.ok) {
      const { message } = await res.json();
      setMessages(prev => [...prev, message]);
      setNewMsg('');
    }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl flex flex-col max-h-[92vh] md:max-h-[80vh] rounded-t-2xl">
        <div className="flex items-start justify-between p-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={ticket.status} />
              {ticket.priority === 'urgent' && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">URGENT</span>
              )}
            </div>
            <p className="font-semibold text-[15px] text-gray-900">{ticket.subject}</p>
            <p className="text-[12px] text-gray-400 mt-0.5">{cat?.label} · {timeAgo(ticket.created_at)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
            <IconX size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
          <p className="text-[13px] text-gray-600 leading-relaxed">{ticket.description}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-[13px] text-gray-400 py-4">No replies yet. We&apos;ll respond within 24 hours.</p>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed ${m.is_admin ? 'bg-gray-100 text-gray-800 rounded-tl-sm' : 'text-white rounded-tr-sm'}`}
                style={m.is_admin ? {} : { background: BRAND }}
              >
                {m.is_admin && <p className="text-[10px] font-bold mb-1" style={{ color: BRAND }}>RepEAT Support</p>}
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {ticket.status !== 'resolved' ? (
          <div className="p-3 border-t border-gray-100 flex gap-2">
            <input
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Add a message…"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-[13px] outline-none"
              style={{ outline: 'none' }}
              onFocus={e => { e.target.style.borderColor = BRAND; }}
              onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
            />
            <button
              onClick={sendMessage}
              disabled={!newMsg.trim() || sending}
              className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40"
              style={{ background: BRAND }}
            >
              <IconSend size={16} color="#fff" />
            </button>
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-[13px] text-green-600 font-semibold flex items-center justify-center gap-1.5">
              <IconCircleCheck size={16} /> This ticket has been resolved
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── New Ticket Form Modal ─────────────────────────────────────────────────────
function NewTicketModal({
  category, user, restaurant, onClose, onCreated,
}: {
  category: CategoryId;
  user: User;
  restaurant: RestaurantInfo | null;
  onClose: () => void;
  onCreated: (t: SupportTicket) => void;
}) {
  const cat = CATEGORIES.find(c => c.id === category)!;
  const [subject,     setSubject]     = useState('');
  const [description, setDescription] = useState('');
  const [email,       setEmail]       = useState(user.email ?? '');
  const [priority,    setPriority]    = useState<'normal' | 'urgent'>('normal');
  const [submitting,  setSubmitting]  = useState(false);
  const [submitted,   setSubmitted]   = useState(false);
  const [error,       setError]       = useState('');

  const submit = async () => {
    if (!subject.trim() || !description.trim() || !email.trim()) {
      setError('Please fill in all fields.'); return;
    }
    setSubmitting(true); setError('');
    const res = await fetch('/api/support/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        portal: 'restaurant',
        restaurant_id: restaurant?.id ?? null,
        category,
        subject: subject.trim(),
        description: description.trim(),
        contact_email: email.trim(),
        priority,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setSubmitting(false); return; }
    setSubmitted(true);
    setTimeout(() => { onCreated(data.ticket); }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: BRAND_LIGHT }}>
              <cat.icon size={16} style={{ color: BRAND }} />
            </div>
            <div>
              <p className="font-bold text-[15px] text-gray-900">{cat.label}</p>
              <p className="text-[11px] text-gray-400">{cat.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100">
            <IconX size={18} className="text-gray-500" />
          </button>
        </div>

        {submitted ? (
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: BRAND_LIGHT }}>
              <IconCircleCheck size={32} style={{ color: BRAND }} />
            </div>
            <p className="font-bold text-[18px] text-gray-900">Ticket submitted!</p>
            <p className="text-[14px] text-gray-500">We&apos;ll get back to you within 24 hours at <strong>{email}</strong>.</p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: BRAND_LIGHT }}>
              <IconClock size={15} style={{ color: BRAND }} className="flex-shrink-0 mt-0.5" />
              <p className="text-[12px] leading-relaxed" style={{ color: BRAND }}>
                We typically respond within <strong>24 hours</strong>. For urgent issues, use the WhatsApp button below.
              </p>
            </div>

            {/* Auto-filled restaurant name */}
            {restaurant && (
              <div>
                <label className="block text-[12px] font-semibold text-gray-600 mb-1">Restaurant</label>
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 bg-gray-50">
                  <IconBuildingStore size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="text-[13px] text-gray-600">{restaurant.name}</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1">Your email</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50">
                <IconUser size={14} className="text-gray-400 flex-shrink-0" />
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="flex-1 text-[13px] bg-transparent outline-none text-gray-700"
                  placeholder="your@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1">Subject</label>
              <input
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Brief summary of your issue"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none"
                onFocus={e => { e.target.style.borderColor = BRAND; }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1">Details</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe your issue in as much detail as possible…"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-[13px] outline-none resize-none"
                onFocus={e => { e.target.style.borderColor = BRAND; }}
                onBlur={e => { e.target.style.borderColor = '#E5E7EB'; }}
              />
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-gray-600 mb-1.5">Priority</label>
              <div className="flex gap-2">
                {(['normal', 'urgent'] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => setPriority(p)}
                    className="flex-1 py-2 rounded-xl border text-[12px] font-semibold transition-all"
                    style={priority === p
                      ? { background: p === 'urgent' ? '#FEF2F2' : BRAND_LIGHT, borderColor: p === 'urgent' ? '#EF4444' : BRAND, color: p === 'urgent' ? '#EF4444' : BRAND }
                      : { background: '#F9FAFB', borderColor: '#E5E7EB', color: '#6B7280' }}
                  >
                    {p === 'urgent' ? '🚨 Urgent' : '🟢 Normal'}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-50 border border-red-200">
                <IconAlertCircle size={14} className="text-red-500 flex-shrink-0" />
                <p className="text-[12px] text-red-600">{error}</p>
              </div>
            )}

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full py-3 rounded-xl font-bold text-[14px] text-white transition-opacity disabled:opacity-60"
              style={{ background: BRAND }}
            >
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RestaurantHelpPage() {
  const router = useRouter();
  const [user,           setUser]           = useState<User | null>(null);
  const [restaurant,     setRestaurant]     = useState<RestaurantInfo | null>(null);
  const [tickets,        setTickets]        = useState<SupportTicket[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [openTicket,     setOpenTicket]     = useState<SupportTicket | null>(null);
  const [showPast,       setShowPast]       = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) { router.replace('/restaurant'); return; }
      setUser(session.user);

      // Fetch restaurant info for auto-fill
      const { data: rest } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('owner_id', session.user.id)
        .maybeSingle();
      if (rest) setRestaurant(rest);

      fetch('/api/support/tickets?portal=restaurant')
        .then(r => r.json())
        .then(d => { setTickets(d.tickets ?? []); setLoading(false); });
    });
  }, [router]);

  const handleTicketCreated = (t: SupportTicket) => {
    setTickets(prev => [t, ...prev]);
    setActiveCategory(null);
    setShowPast(true);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0D0D' }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: BRAND, borderTopColor: 'transparent' }} />
    </div>
  );

  const openCount       = tickets.filter(t => t.status === 'open').length;
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length;

  return (
    <div className="min-h-screen pb-28" style={{ background: '#F8F7F4' }}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <Link href="/restaurant" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
          <IconArrowLeft size={20} className="text-gray-600" />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-[17px] text-gray-900">Help & Support</h1>
          {restaurant && <p className="text-[12px] text-gray-400">{restaurant.name}</p>}
        </div>
        {(openCount + inProgressCount) > 0 && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white" style={{ background: BRAND }}>
            {openCount + inProgressCount}
          </div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-6">

        {/* Hero card */}
        <div className="rounded-2xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #2C68C8 100%)` }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-[20px] leading-tight">Restaurant<br/>Support Centre</p>
              <p className="text-[13px] mt-1.5 opacity-90">We&apos;re here to help you succeed.</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <IconMessage size={24} color="#fff" />
            </div>
          </div>
          {restaurant && (
            <div className="mt-4 flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2 w-fit">
              <IconBuildingStore size={13} color="#fff" />
              <span className="text-[12px] font-semibold">{restaurant.name}</span>
            </div>
          )}
          <div className="mt-2 flex items-center gap-2 bg-white/20 rounded-xl px-3 py-2 w-fit">
            <IconClock size={13} color="#fff" />
            <span className="text-[12px] font-semibold">Response within 24 hours</span>
          </div>
        </div>

        {/* Category grid */}
        <div>
          <p className="text-[13px] font-bold text-gray-500 uppercase tracking-wide mb-3">Choose a topic</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="bg-white rounded-2xl p-4 text-left shadow-sm border border-gray-100 hover:shadow-md transition-all active:scale-95"
                style={{ borderColor: '#E5E7EB' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BRAND; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E7EB'; }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: BRAND_LIGHT }}>
                  <cat.icon size={20} style={{ color: BRAND }} />
                </div>
                <p className="font-bold text-[14px] text-gray-900">{cat.label}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{cat.desc}</p>
                <div className="mt-3 flex items-center gap-1" style={{ color: BRAND }}>
                  <span className="text-[12px] font-semibold">Get help</span>
                  <IconChevronRight size={13} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Past tickets */}
        {tickets.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowPast(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <p className="font-bold text-[14px] text-gray-900">Your Tickets</p>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                  {tickets.length}
                </span>
              </div>
              <IconChevronDown size={18} className={`text-gray-400 transition-transform ${showPast ? 'rotate-180' : ''}`} />
            </button>

            {showPast && (
              <div className="divide-y divide-gray-50">
                {tickets.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setOpenTicket(t)}
                    className="w-full px-4 py-3.5 flex items-start gap-3 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={t.status} />
                        {t.priority === 'urgent' && (
                          <span className="text-[10px] font-bold text-red-500">URGENT</span>
                        )}
                      </div>
                      <p className="font-semibold text-[13px] text-gray-900 truncate">{t.subject}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {CATEGORIES.find(c => c.id === t.category)?.label} · {timeAgo(t.created_at)}
                      </p>
                    </div>
                    <IconChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp CTA */}
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-4 bg-white rounded-2xl p-4 shadow-sm border border-gray-100 hover:border-green-300 hover:shadow-md transition-all"
        >
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: '#DCFCE7' }}>
            <IconBrandWhatsapp size={26} style={{ color: '#16A34A' }} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[14px] text-gray-900">Chat on WhatsApp</p>
            <p className="text-[12px] text-gray-400">Message us directly for urgent issues</p>
          </div>
          <IconChevronRight size={18} className="text-gray-300" />
        </a>

      </div>

      <WhatsAppFloat />

      {activeCategory && user && (
        <NewTicketModal
          category={activeCategory}
          user={user}
          restaurant={restaurant}
          onClose={() => setActiveCategory(null)}
          onCreated={handleTicketCreated}
        />
      )}
      {openTicket && (
        <TicketDetailModal ticket={openTicket} onClose={() => setOpenTicket(null)} />
      )}

      <MobileNav portal="restaurant" />
    </div>
  );
}
