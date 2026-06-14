'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  IconArrowLeft, IconTicket, IconDeviceLaptop, IconCreditCard,
  IconHelp, IconSend, IconChevronRight, IconCircleCheck,
  IconClock, IconAlertCircle, IconX, IconUser, IconChevronDown,
  IconBrandWhatsapp, IconMessage,
} from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { CUSTOMER_UI } from '@/lib/customerUI';
import type { User } from '@supabase/supabase-js';
import MobileNav from '@/components/layout/MobileNav';

// ── Config ─────────────────────────────────────────────────────────────────
const BRAND       = CUSTOMER_UI.accent;        // #FF6B00
const BG          = CUSTOMER_UI.bg;            // #0C0A09
const BG_ELEVATED = CUSTOMER_UI.bgElevated;    // #141210
const BG_CARD     = '#1C1A18';
const BG_INPUT    = '#201E1C';
const BORDER      = CUSTOMER_UI.glassBorder;   // rgba(255,255,255,0.14)
const TEXT        = CUSTOMER_UI.textPrimary;   // #FAFAF9
const TEXT_MUTED  = CUSTOMER_UI.textSecondary; // #A8A29E
const BRAND_SOFT  = CUSTOMER_UI.accentSoft;    // rgba(255,107,0,0.16)

const WHATSAPP_NUMBER = '14161234567';
const WHATSAPP_MSG    = encodeURIComponent('Hi RepEAT Support! I need help with my account.');

// ── Types ───────────────────────────────────────────────────────────────────
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

const CATEGORIES = [
  { id: 'claim',     icon: IconTicket,       label: 'Claims Issue',    desc: 'Problem with a current or past deal claim' },
  { id: 'technical', icon: IconDeviceLaptop, label: 'Technical Issue', desc: 'App bug, login problems, or something broken' },
  { id: 'payment',   icon: IconCreditCard,   label: 'Payment',         desc: 'Billing, subscription, or charge questions' },
  { id: 'general',   icon: IconHelp,         label: 'General Enquiry', desc: 'Anything else we can help you with' },
] as const;

type CategoryId = typeof CATEGORIES[number]['id'];

const STATUS_CONFIG = {
  open:        { label: 'Open',        color: '#F59E0B', bg: 'rgba(245,158,11,0.15)'  },
  in_progress: { label: 'In Progress', color: '#60A5FA', bg: 'rgba(96,165,250,0.15)'  },
  resolved:    { label: 'Resolved',    color: '#4ADE80', bg: 'rgba(74,222,128,0.15)'  },
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

function StatusBadge({ status }: { status: SupportTicket['status'] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

function WhatsAppFloat() {
  return (
    <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
      target="_blank" rel="noopener noreferrer"
      className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 md:bottom-6"
      style={{ background: '#25D366' }} aria-label="Chat on WhatsApp">
      <IconBrandWhatsapp size={28} color="#fff" />
    </a>
  );
}

// ── Ticket detail modal ───────────────────────────────────────────────────────
function TicketDetailModal({ ticket, onClose }: { ticket: SupportTicket; onClose: () => void }) {
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMsg,   setNewMsg]   = useState('');
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cat = CATEGORIES.find(c => c.id === ticket.category);

  useEffect(() => {
    fetch(`/api/support/tickets/${ticket.id}/messages`)
      .then(r => r.json()).then(d => setMessages(d.messages ?? []));
  }, [ticket.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!newMsg.trim() || sending) return;
    setSending(true);
    const res = await fetch(`/api/support/tickets/${ticket.id}/messages`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newMsg.trim() }),
    });
    if (res.ok) { const { message } = await res.json(); setMessages(p => [...p, message]); setNewMsg(''); }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full md:max-w-lg md:rounded-2xl flex flex-col rounded-t-2xl overflow-hidden max-h-[92vh]"
        style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
        <div className="flex items-start justify-between p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={ticket.status} />
              {ticket.priority === 'urgent' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#F87171' }}>URGENT</span>
              )}
            </div>
            <p className="font-semibold text-[15px]" style={{ color: TEXT }}>{ticket.subject}</p>
            <p className="text-[12px] mt-0.5" style={{ color: TEXT_MUTED }}>{cat?.label} · {timeAgo(ticket.created_at)}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: BG_INPUT }}>
            <IconX size={16} style={{ color: TEXT_MUTED }} />
          </button>
        </div>

        <div className="px-4 py-3" style={{ background: BG_INPUT, borderBottom: `1px solid ${BORDER}` }}>
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_MUTED }}>{ticket.description}</p>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-[13px] py-6" style={{ color: TEXT_MUTED }}>
              No replies yet. We&apos;ll respond within 24 hours.
            </p>
          )}
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.is_admin ? 'justify-start' : 'justify-end'}`}>
              <div className="max-w-[80%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed"
                style={m.is_admin
                  ? { background: BG_INPUT, color: TEXT, borderRadius: '16px 16px 16px 4px' }
                  : { background: BRAND, color: '#fff', borderRadius: '16px 16px 4px 16px' }}>
                {m.is_admin && <p className="text-[10px] font-bold mb-1" style={{ color: BRAND }}>RepEAT Support</p>}
                {m.content}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {ticket.status !== 'resolved' ? (
          <div className="p-3 flex gap-2" style={{ borderTop: `1px solid ${BORDER}` }}>
            <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Add a message…"
              className="flex-1 px-3 py-2 rounded-xl text-[13px] outline-none"
              style={{ background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT }}
              onFocus={e => { e.target.style.borderColor = BRAND; }}
              onBlur={e => { e.target.style.borderColor = BORDER; }}
            />
            <button onClick={send} disabled={!newMsg.trim() || sending}
              className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40"
              style={{ background: BRAND }}>
              <IconSend size={16} color="#fff" />
            </button>
          </div>
        ) : (
          <div className="p-4 text-center">
            <p className="text-[13px] font-semibold flex items-center justify-center gap-1.5" style={{ color: '#4ADE80' }}>
              <IconCircleCheck size={16} /> This ticket has been resolved
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── New ticket form modal ─────────────────────────────────────────────────────
function NewTicketModal({
  category, user, onClose, onCreated,
}: { category: CategoryId; user: User; onClose: () => void; onCreated: (t: SupportTicket) => void }) {
  const cat = CATEGORIES.find(c => c.id === category)!;
  const [subject,    setSubject]    = useState('');
  const [desc,       setDesc]       = useState('');
  const [email,      setEmail]      = useState(user.email ?? '');
  const [priority,   setPriority]   = useState<'normal' | 'urgent'>('normal');
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [error,      setError]      = useState('');

  const inputStyle = { background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT };

  const submit = async () => {
    if (!subject.trim() || !desc.trim() || !email.trim()) { setError('Please fill in all fields.'); return; }
    setSubmitting(true); setError('');
    const res = await fetch('/api/support/tickets', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portal: 'customer', category, subject: subject.trim(), description: desc.trim(), contact_email: email.trim(), priority }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? 'Something went wrong.'); setSubmitting(false); return; }
    setSubmitted(true);
    setTimeout(() => { onCreated(data.ticket); }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full md:max-w-lg md:rounded-2xl rounded-t-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>

        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: `1px solid ${BORDER}` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: BRAND_SOFT }}>
              <cat.icon size={18} style={{ color: BRAND }} />
            </div>
            <div>
              <p className="font-bold text-[15px]" style={{ color: TEXT }}>{cat.label}</p>
              <p className="text-[11px]" style={{ color: TEXT_MUTED }}>{cat.desc}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: BG_INPUT }}>
            <IconX size={16} style={{ color: TEXT_MUTED }} />
          </button>
        </div>

        {submitted ? (
          <div className="p-10 flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: BRAND_SOFT }}>
              <IconCircleCheck size={32} style={{ color: BRAND }} />
            </div>
            <p className="font-bold text-[18px]" style={{ color: TEXT }}>Ticket submitted!</p>
            <p className="text-[14px]" style={{ color: TEXT_MUTED }}>
              We&apos;ll get back to you within 24 hours at <span style={{ color: TEXT }}>{email}</span>.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {/* 24h notice */}
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-xl" style={{ background: BRAND_SOFT }}>
              <IconClock size={14} style={{ color: BRAND }} className="flex-shrink-0 mt-0.5" />
              <p className="text-[12px] leading-relaxed" style={{ color: BRAND }}>
                We typically respond within <strong>24 hours</strong>. For urgent issues, use the WhatsApp button.
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: TEXT_MUTED }}>Your email</label>
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={inputStyle}>
                <IconUser size={14} style={{ color: TEXT_MUTED }} className="flex-shrink-0" />
                <input value={email} onChange={e => setEmail(e.target.value)}
                  className="flex-1 text-[13px] bg-transparent outline-none"
                  style={{ color: TEXT }} placeholder="your@email.com" />
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: TEXT_MUTED }}>Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Brief summary of your issue"
                className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = BRAND; }}
                onBlur={e => { e.target.style.borderColor = BORDER; }}
              />
            </div>

            {/* Details */}
            <div>
              <label className="block text-[12px] font-semibold mb-1.5" style={{ color: TEXT_MUTED }}>Details</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)}
                rows={4} placeholder="Describe your issue in as much detail as possible…"
                className="w-full px-3 py-2.5 rounded-xl text-[13px] outline-none resize-none"
                style={inputStyle}
                onFocus={e => { e.target.style.borderColor = BRAND; }}
                onBlur={e => { e.target.style.borderColor = BORDER; }}
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-[12px] font-semibold mb-2" style={{ color: TEXT_MUTED }}>Priority</label>
              <div className="flex gap-2">
                {(['normal', 'urgent'] as const).map(p => (
                  <button key={p} onClick={() => setPriority(p)}
                    className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold transition-all"
                    style={priority === p
                      ? p === 'urgent'
                        ? { background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#F87171' }
                        : { background: BRAND_SOFT, border: `1px solid ${BRAND}`, color: BRAND }
                      : { background: BG_INPUT, border: `1px solid ${BORDER}`, color: TEXT_MUTED }}>
                    {p === 'urgent' ? '🚨 Urgent' : '🟢 Normal'}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}>
                <IconAlertCircle size={14} style={{ color: '#F87171' }} className="flex-shrink-0" />
                <p className="text-[12px]" style={{ color: '#F87171' }}>{error}</p>
              </div>
            )}

            <button onClick={submit} disabled={submitting}
              className="w-full py-3 rounded-xl font-bold text-[14px] text-white disabled:opacity-60 transition-opacity"
              style={{ background: BRAND }}>
              {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function CustomerHelpPage() {
  const router = useRouter();
  const [user,           setUser]           = useState<User | null>(null);
  const [tickets,        setTickets]        = useState<SupportTicket[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [openTicket,     setOpenTicket]     = useState<SupportTicket | null>(null);
  const [showPast,       setShowPast]       = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.replace('/customer/login'); return; }
      setUser(session.user);
      fetch('/api/support/tickets?portal=customer')
        .then(r => r.json())
        .then(d => { setTickets(d.tickets ?? []); setLoading(false); });
    });
  }, [router]);

  const handleCreated = (t: SupportTicket) => {
    setTickets(prev => [t, ...prev]);
    setActiveCategory(null);
    setShowPast(true);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: BRAND, borderTopColor: 'transparent' }} />
    </div>
  );

  const pendingCount = tickets.filter(t => t.status !== 'resolved').length;

  return (
    <div className="min-h-screen pb-28" style={{ background: BG }}>

      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{ background: BG_ELEVATED, borderBottom: `1px solid ${BORDER}`, backdropFilter: 'blur(12px)' }}>
        <Link href="/customer" className="w-8 h-8 flex items-center justify-center rounded-full"
          style={{ background: BG_INPUT }}>
          <IconArrowLeft size={18} style={{ color: TEXT_MUTED }} />
        </Link>
        <div className="flex-1">
          <h1 className="font-bold text-[17px]" style={{ color: TEXT }}>Help & Support</h1>
          <p className="text-[12px]" style={{ color: TEXT_MUTED }}>We&apos;re here to help</p>
        </div>
        {pendingCount > 0 && (
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white"
            style={{ background: BRAND }}>{pendingCount}</div>
        )}
      </header>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Hero */}
        <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #FF6B00 0%, #E85D04 100%)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-[20px] text-white leading-tight">How can we<br/>help you today?</p>
              <p className="text-[13px] mt-1.5" style={{ color: 'rgba(255,255,255,0.85)' }}>
                Pick a topic and we&apos;ll sort it out fast.
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <IconMessage size={24} color="#fff" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 w-fit px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.18)' }}>
            <IconClock size={13} color="#fff" />
            <span className="text-[12px] text-white font-semibold">Response within 24 hours</span>
          </div>
        </div>

        {/* Category grid */}
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: TEXT_MUTED }}>Choose a topic</p>
          <div className="grid grid-cols-2 gap-3">
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className="rounded-2xl p-4 text-left transition-all active:scale-95"
                style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BRAND; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER; }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: BRAND_SOFT }}>
                  <cat.icon size={20} style={{ color: BRAND }} />
                </div>
                <p className="font-bold text-[14px]" style={{ color: TEXT }}>{cat.label}</p>
                <p className="text-[11px] mt-0.5 leading-snug" style={{ color: TEXT_MUTED }}>{cat.desc}</p>
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
          <div className="rounded-2xl overflow-hidden" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <button onClick={() => setShowPast(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[14px]" style={{ color: TEXT }}>Your Tickets</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: BG_INPUT, color: TEXT_MUTED }}>{tickets.length}</span>
              </div>
              <IconChevronDown size={16} style={{
                color: TEXT_MUTED,
                transform: showPast ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }} />
            </button>

            {showPast && (
              <div style={{ borderTop: `1px solid ${BORDER}` }}>
                {tickets.map(t => (
                  <button key={t.id} onClick={() => setOpenTicket(t)}
                    className="w-full px-4 py-3.5 flex items-start gap-3 text-left"
                    style={{ borderBottom: `1px solid ${BORDER}` }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <StatusBadge status={t.status} />
                        {t.priority === 'urgent' && (
                          <span className="text-[10px] font-bold" style={{ color: '#F87171' }}>URGENT</span>
                        )}
                      </div>
                      <p className="font-semibold text-[13px] truncate" style={{ color: TEXT }}>{t.subject}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: TEXT_MUTED }}>
                        {CATEGORIES.find(c => c.id === t.category)?.label} · {timeAgo(t.created_at)}
                      </p>
                    </div>
                    <IconChevronRight size={16} style={{ color: TEXT_MUTED, flexShrink: 0, marginTop: 4 }} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* WhatsApp CTA */}
        <a href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MSG}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-4 rounded-2xl p-4"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = '#25D366'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.borderColor = BORDER; }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(37,211,102,0.15)' }}>
            <IconBrandWhatsapp size={26} style={{ color: '#25D366' }} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-[14px]" style={{ color: TEXT }}>Chat on WhatsApp</p>
            <p className="text-[12px]" style={{ color: TEXT_MUTED }}>Message us directly for urgent issues</p>
          </div>
          <IconChevronRight size={18} style={{ color: TEXT_MUTED }} />
        </a>

      </div>

      <WhatsAppFloat />

      {activeCategory && user && (
        <NewTicketModal category={activeCategory} user={user}
          onClose={() => setActiveCategory(null)} onCreated={handleCreated} />
      )}
      {openTicket && (
        <TicketDetailModal ticket={openTicket} onClose={() => setOpenTicket(null)} />
      )}

      <MobileNav portal="customer" />
    </div>
  );
}
