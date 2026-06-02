'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  IconArrowLeft, IconStar, IconBolt, IconCoin, IconBell,
  IconCrown, IconChartBar, IconGift, IconCheck, IconChevronDown,
} from '@tabler/icons-react';

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
    q: 'Is the 7-day free trial available for the yearly plan too?',
    a: 'Yes! The 7-day free trial applies to both monthly and yearly plans. You won\'t be charged until the trial ends, and you can cancel before then with no charge.',
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

const PLUS_FEATURES = [
  { icon: IconStar,     text: 'Exclusive deals from premium restaurants' },
  { icon: IconBolt,     text: 'Early access — 24hrs before public drop' },
  { icon: IconCoin,     text: 'Double savings tracking' },
  { icon: IconBell,     text: 'Priority deal notifications' },
  { icon: IconCrown,    text: 'RepEAT+ badge on profile' },
  { icon: IconChartBar, text: 'Advanced savings analytics' },
  { icon: IconGift,     text: 'Birthday bonus deal every year' },
];

const FREE_FEATURES = [
  'Browse all public deals',
  'Standard QR claims',
  'Basic profile',
  'All cities included',
];

export default function RepeatPlusPage() {
  const [billing,  setBilling]  = useState<'monthly' | 'three_monthly' | 'yearly'>('yearly');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const handleSubscribe = async (plan: 'monthly' | 'three_monthly' | 'yearly') => {
    setLoading(true);
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
      setLoading(false);
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
        <Link href="/" className="font-display text-[20px] font-extrabold tracking-tight">
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

        {/* Billing toggle — 3 options */}
        <div className="inline-flex rounded-full p-1 mb-10" style={{ background: 'rgba(255,255,255,0.08)' }}>
          {([
            { id: 'monthly',       label: 'Monthly' },
            { id: 'three_monthly', label: '3 Months' },
            { id: 'yearly',        label: 'Yearly (Best value)' },
          ] as const).map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setBilling(id)}
              className="px-4 py-2 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap"
              style={billing === id
                ? { background: '#F59E0B', color: '#0A0A0A' }
                : { color: 'rgba(255,255,255,0.6)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-left max-w-2xl mx-auto">

          {/* Free plan */}
          <div
            className="rounded-2xl p-6 border"
            style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)' }}
          >
            <p className="text-[12px] font-bold uppercase tracking-widest mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>Free</p>
            <p className="font-display text-[40px] font-extrabold leading-none mb-1">$0</p>
            <p className="text-[14px] mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>Free forever</p>
            <ul className="space-y-3 mb-6">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-[14px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  <IconCheck size={15} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
            <div
              className="w-full h-11 rounded-xl flex items-center justify-center text-[14px] font-semibold border"
              style={{ borderColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)' }}
            >
              Current plan
            </div>
          </div>

          {/* RepEAT+ plan */}
          <div
            className="rounded-2xl p-6 relative overflow-hidden border"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(252,211,77,0.06) 100%)', borderColor: '#F59E0B' }}
          >
            {/* Badge */}
            <div
              className="absolute top-4 right-4 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide"
              style={{ background: '#F59E0B', color: '#0A0A0A' }}
            >
              {billing === 'yearly' ? 'Best value' : billing === 'three_monthly' ? 'Save 20%' : 'Most popular'}
            </div>

            <p className="text-[12px] font-bold uppercase tracking-widest mb-4" style={{ color: '#F59E0B' }}>RepEAT+</p>
            <div className="mb-1">
              {billing === 'monthly' && (
                <>
                  <span className="font-display text-[40px] font-extrabold leading-none">$4.99</span>
                  <span className="text-[16px] ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>/month</span>
                </>
              )}
              {billing === 'three_monthly' && (
                <>
                  <span className="font-display text-[40px] font-extrabold leading-none">$3.99</span>
                  <span className="text-[16px] ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>/month</span>
                </>
              )}
              {billing === 'yearly' && (
                <>
                  <span className="font-display text-[40px] font-extrabold leading-none">$3.33</span>
                  <span className="text-[16px] ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>/month</span>
                </>
              )}
            </div>
            {billing === 'three_monthly' && (
              <p className="text-[13px] mb-1" style={{ color: '#F59E0B' }}>$11.99 every 3 months — save 20%</p>
            )}
            {billing === 'yearly' && (
              <p className="text-[13px] mb-1" style={{ color: '#F59E0B' }}>$39.99/year — save 33%</p>
            )}
            <p className="text-[13px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>7-day free trial, cancel anytime</p>

            <ul className="space-y-3 mb-6">
              {PLUS_FEATURES.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-[14px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
                  <Icon size={15} style={{ color: '#F59E0B', flexShrink: 0 }} />
                  {text}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe(billing)}
              disabled={loading}
              className="w-full h-11 rounded-xl text-[15px] font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
              style={{ background: '#F59E0B', color: '#0A0A0A' }}
            >
              {loading ? 'Redirecting to Stripe…' : 'Start 7-day free trial'}
            </button>
            {error && (
              <p className="text-center text-[12px] mt-2" style={{ color: '#f87171' }}>{error}</p>
            )}
            <p className="text-center text-[11px] mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Secured by Stripe · Apple Pay & Google Pay accepted
            </p>
          </div>
        </div>
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
          7-day free trial. Cancel anytime. No credit card risk.
        </p>
        <button
          onClick={() => handleSubscribe(billing)}
          disabled={loading}
          className="h-14 px-10 rounded-2xl text-[16px] font-bold transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          style={{ background: '#F59E0B', color: '#0A0A0A' }}
        >
          {loading ? 'Redirecting…' : 'Start free trial — it\'s on us'}
        </button>
        <p className="text-[12px] mt-4" style={{ color: 'rgba(255,255,255,0.3)' }}>
          7-day free trial · Cancel anytime · Secured by Stripe
        </p>
      </section>

    </div>
  );
}
