'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft, IconCheck, IconChevronDown } from '@tabler/icons-react';

// ─── FAQ data ────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: 'How is RepEAT+ different from the free plan?',
    a: 'RepEAT+ unlocks exclusive deals from premium restaurants that are hidden from free users, gives you 24-hour early access to new deals every Sunday night, and provides detailed savings analytics so you can track exactly how much you\'ve saved.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Yes — cancel anytime from your profile settings. You keep RepEAT+ access until the end of your current billing period. No penalties, no hassle.',
  },
  {
    q: 'What happens to my exclusive deals if I cancel?',
    a: 'You lose access to RepEAT+ exclusive deals immediately upon cancellation. All your claimed deals and QR codes remain valid through their original expiry dates.',
  },
  {
    q: 'Is the 3-day free trial available for the yearly plan too?',
    a: 'Yes! The 3-day free trial applies to both monthly and yearly plans. You won\'t be charged until the trial ends, and you can cancel before then with no charge.',
  },
  {
    q: 'Which restaurants have RepEAT+ exclusive deals?',
    a: 'We\'re partnering with premium restaurants across the GTA and KW region to offer RepEAT+ deals not listed anywhere else. New exclusive deals are added every week.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="border border-white/10 rounded-xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.04)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-[15px] font-semibold text-white pr-4">{q}</span>
        <IconChevronDown
          size={18}
          className="flex-shrink-0 transition-transform duration-200"
          style={{ color: '#F59E0B', transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
          {a}
        </div>
      )}
    </div>
  );
}


// ─── Pricing table ────────────────────────────────────────────────────────────
type Billing = 'monthly' | 'three_monthly' | 'yearly';

const PRICES: Record<string, Record<Billing, { amount: string; sub: string }>> = {
  starter: {
    monthly:       { amount: '$2.99', sub: '/month' },
    three_monthly: { amount: '$2.66', sub: '/month · $7.99 per 3 months — save 11%' },
    yearly:        { amount: '$2.08', sub: '/month · $24.99/year — save 30%' },
  },
  pro: {
    monthly:       { amount: '$3.99', sub: '/month' },
    three_monthly: { amount: '$3.33', sub: '/month · $9.99 per 3 months — save 17%' },
    yearly:        { amount: '$2.49', sub: '/month · $29.99/year — save 37%' },
  },
};

const PLAN_KEYS: Record<string, Record<Billing, string>> = {
  starter: {
    monthly: 'starter_monthly', three_monthly: 'starter_three_monthly', yearly: 'starter_yearly',
  },
  pro: {
    monthly: 'pro_monthly', three_monthly: 'pro_three_monthly', yearly: 'pro_yearly',
  },
};

export default function RepeatPlusPage() {
  const [billing,  setBilling]  = useState<Billing>('yearly');
  const [loading,  setLoading]  = useState<string | null>(null); // which plan is loading
  const [error,    setError]    = useState('');

  const handleSubscribe = async (plan: string) => {
    setLoading(plan);
    setError('');
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ plan }),
      });
      const json = await res.json() as { url?: string; error?: string };
      if (json.error) { setError(json.error); return; }
      if (json.url) window.location.href = json.url;
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0A', color: 'white' }}>

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <Link
          href="/customer"
          className="flex items-center gap-2 text-[14px] font-medium transition-colors"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseOver={(e) => (e.currentTarget.style.color = 'white')}
          onMouseOut={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
        >
          <IconArrowLeft size={16} />
          Back to deals
        </Link>
        <Link href="/customer" className="font-display text-[20px] font-extrabold tracking-tight">
          Rep<span style={{ color: '#E85D04' }}>EAT</span>
        </Link>
        <div style={{ width: 100 }} />
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="text-center px-6 pt-20 pb-16 max-w-3xl mx-auto">
        {/* Logo */}
        <div className="inline-flex items-center gap-2 mb-6">
          <span
            className="font-display text-[56px] font-extrabold tracking-tight leading-none"
            style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #FCD34D 50%, #F59E0B 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}
          >
            RepEAT+
          </span>
        </div>

        <p className="text-[22px] font-semibold mb-3" style={{ color: 'rgba(255,255,255,0.9)' }}>
          Exclusive deals. Priority access. Real savings.
        </p>
        <p className="text-[16px] mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Join 2,400+ members saving big on every restaurant visit across the GTA and KW.
        </p>

        {/* Billing toggle */}
        <div className="inline-flex rounded-full p-1 mb-10" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {([
            { id: 'monthly',       label: 'Monthly'            },
            { id: 'three_monthly', label: '3 Months'           },
            { id: 'yearly',        label: 'Yearly (Best value)'},
          ] as const).map(({ id, label }) => (
            <button key={id} onClick={() => setBilling(id)}
              className="px-4 py-2 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap"
              style={billing === id ? { background: '#F59E0B', color: '#0A0A0A' } : { color: 'rgba(255,255,255,0.6)' }}
            >{label}</button>
          ))}
        </div>

        {/* Pricing cards — 3 tiers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left max-w-4xl mx-auto">

          {/* Free */}
          <div className="rounded-2xl p-6 border flex flex-col" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>Free</p>
            <div className="mb-1">
              <span className="font-display text-[36px] font-extrabold leading-none">$0</span>
            </div>
            <p className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>Free forever</p>
            <ul className="space-y-2 mb-6 flex-1">
              {['3 deals/month', '1 deal/day max', 'Browse all public deals', 'Standard QR claims', 'Basic profile'].map(f => (
                <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.65)' }}>
                  <IconCheck size={13} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0, marginTop: 2 }} />{f}
                </li>
              ))}
            </ul>
            <div className="w-full h-10 rounded-xl flex items-center justify-center text-[13px] font-semibold border"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}>
              Current plan
            </div>
          </div>

          {/* Starter */}
          <div className="rounded-2xl p-6 border flex flex-col" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.2)' }}>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#60a5fa' }}>Starter</p>
            <div className="mb-0.5">
              <span className="font-display text-[36px] font-extrabold leading-none">{PRICES.starter[billing].amount}</span>
              <span className="text-[14px] ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>/mo</span>
            </div>
            <p className="text-[12px] mb-5" style={{ color: '#60a5fa' }}>{PRICES.starter[billing].sub}</p>
            <ul className="space-y-2 mb-6 flex-1">
              {['20 deals/month', '3 deals/day max', 'Save favourite deals', 'Deal expiry reminders', 'Basic savings tracking'].map(f => (
                <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  <IconCheck size={13} style={{ color: '#60a5fa', flexShrink: 0, marginTop: 2 }} />{f}
                </li>
              ))}
            </ul>
            <button onClick={() => handleSubscribe(PLAN_KEYS.starter[billing])}
              disabled={!!loading}
              className="w-full h-10 rounded-xl text-[14px] font-bold transition-all hover:opacity-90 disabled:opacity-60 border"
              style={{ borderColor: '#60a5fa', color: '#60a5fa' }}>
              {loading === PLAN_KEYS.starter[billing] ? 'Redirecting…' : 'Start free trial'}
            </button>
          </div>

          {/* Pro */}
          <div className="rounded-2xl p-6 relative overflow-hidden border flex flex-col"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.14) 0%, rgba(252,211,77,0.06) 100%)', borderColor: '#F59E0B' }}>
            <div className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
              style={{ background: '#F59E0B', color: '#0A0A0A' }}>
              {billing === 'yearly' ? 'Best value' : 'Most popular'}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: '#F59E0B' }}>Pro</p>
            <div className="mb-0.5">
              <span className="font-display text-[36px] font-extrabold leading-none">{PRICES.pro[billing].amount}</span>
              <span className="text-[14px] ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>/mo</span>
            </div>
            <p className="text-[12px] mb-5" style={{ color: '#F59E0B' }}>{PRICES.pro[billing].sub}</p>
            <ul className="space-y-2 mb-6 flex-1">
              {['30 deals/month', '3 deals/day max', 'Early access (24hrs early)', 'RepEAT+ badge on profile', 'Advanced savings analytics', 'Birthday bonus deal', 'Priority notifications'].map(f => (
                <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: 'rgba(255,255,255,0.9)' }}>
                  <IconCheck size={13} style={{ color: '#F59E0B', flexShrink: 0, marginTop: 2 }} />{f}
                </li>
              ))}
            </ul>
            <button onClick={() => handleSubscribe(PLAN_KEYS.pro[billing])}
              disabled={!!loading}
              className="w-full h-10 rounded-xl text-[14px] font-bold transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: '#F59E0B', color: '#0A0A0A' }}>
              {loading === PLAN_KEYS.pro[billing] ? 'Redirecting…' : 'Start 3-day free trial'}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.35)' }}>
            <p className="text-[13px] font-semibold text-left" style={{ color: '#fca5a5' }}>
              {error}
            </p>
            <button
              onClick={() => { setError(''); }}
              className="text-[12px] font-bold whitespace-nowrap underline"
              style={{ color: '#fca5a5' }}
            >
              Dismiss
            </button>
          </div>
        )}
        <p className="text-center text-[12px] mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Secured by Stripe · Apple Pay & Google Pay · Cancel anytime
        </p>
      </section>

      {/* ── Benefits ─────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="font-display text-[32px] font-bold text-center mb-12">
          Why RepEAT+?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: '🏆',
              title: 'Exclusive Restaurant Partners',
              body: 'Access deals from premium restaurants not available to free users. New exclusive partners added every week.',
            },
            {
              icon: '⚡',
              title: 'Early Bird Access',
              body: 'See next week\'s deals every Sunday at 8 PM before they go public Monday morning. First come, first served.',
            },
            {
              icon: '📊',
              title: 'Real Savings Tracking',
              body: 'See exactly how much you\'ve saved, your weekly streak, deal history charts, and your favourite restaurants.',
            },
          ].map(({ icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl p-6 text-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="text-[40px] mb-4">{icon}</div>
              <h3 className="font-bold text-[17px] mb-2">{title}</h3>
              <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social proof ─────────────────────────────────────────────── */}
      <section
        className="py-10 text-center"
        style={{ background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.2)', borderBottom: '1px solid rgba(245,158,11,0.2)' }}
      >
        <div className="max-w-2xl mx-auto px-6">
          <div className="flex justify-center gap-10 flex-wrap">
            {[
              { num: '2,400+', label: 'Active members' },
              { num: '$180k+', label: 'Total saved by members' },
              { num: '47',     label: 'Exclusive restaurant partners' },
            ].map(({ num, label }) => (
              <div key={label} className="text-center">
                <p className="font-display text-[36px] font-extrabold" style={{ color: '#F59E0B' }}>{num}</p>
                <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <section className="max-w-2xl mx-auto px-6 py-16">
        <h2 className="font-display text-[32px] font-bold text-center mb-10">FAQ</h2>
        <div className="space-y-3">
          {FAQS.map((f) => <FaqItem key={f.q} {...f} />)}
        </div>
      </section>

      {/* ── Bottom CTA ───────────────────────────────────────────────── */}
      <section className="text-center px-6 py-16">
        <p className="font-display text-[28px] font-bold mb-3">Ready to start saving more?</p>
        <p className="text-[15px] mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
          3-day free trial. Cancel anytime. No credit card risk.
        </p>
        <button
          onClick={() => handleSubscribe(PLAN_KEYS.pro[billing])}
          disabled={!!loading}
          className="h-14 px-10 rounded-2xl text-[16px] font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#F59E0B', color: '#0A0A0A' }}
        >
          {loading ? 'Redirecting…' : 'Start free trial — it\'s on us'}
        </button>
        <p className="text-[12px] mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          3-day free trial · Cancel anytime · Secured by Stripe
        </p>
      </section>

    </div>
  );
}
