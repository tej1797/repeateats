'use client';

import { useMemo, useState } from 'react';
import { IconX, IconLoader2, IconRepeat } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import { formatDealTitle } from '@/lib/utils';
import type { Deal } from '@/types';

const BLUE = '#1249A9';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDealDate(iso: string | null): string {
  if (!iso) return 'Not set';
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString('en-CA', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function shiftDateISO(iso: string, days: number): string {
  const base = new Date(`${iso}T12:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function dealDurationDays(from: string, until: string): number {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${until}T12:00:00`);
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

function defaultDuplicateDates(deal: Deal): { valid_from: string; valid_until: string } {
  if (deal.valid_from && deal.valid_until) {
    const span = Math.max(
      0,
      Math.round(
        (new Date(`${deal.valid_until}T12:00:00`).getTime()
          - new Date(`${deal.valid_from}T12:00:00`).getTime()) / 86_400_000,
      ),
    );
    const valid_from = todayISO();
    return { valid_from, valid_until: shiftDateISO(valid_from, span) };
  }
  const valid_from = todayISO();
  return { valid_from, valid_until: shiftDateISO(valid_from, 6) };
}

function formatAvailableDays(days: string[] | null | undefined): string {
  if (!days?.length || days[0] === 'all') return 'Every day';
  return days.join(', ');
}

function duplicateDealTitle(title: string): string {
  return `${formatDealTitle(title.replace(/\*+$/, '').trimEnd())}*`;
}

interface Props {
  deal: Deal;
  onCreated: (deal: Deal) => void;
  onClose: () => void;
}

export default function DuplicateDealModal({ deal, onCreated, onClose }: Props) {
  const supabase = createClient();
  const defaults = useMemo(() => defaultDuplicateDates(deal), [deal]);

  const [validFrom,  setValidFrom]  = useState(defaults.valid_from);
  const [validUntil, setValidUntil] = useState(defaults.valid_until);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');

  const newTitle = duplicateDealTitle(deal.title);
  const runDays = validFrom && validUntil && validUntil >= validFrom
    ? dealDurationDays(validFrom, validUntil)
    : 0;

  const handleSubmit = async () => {
    if (!validFrom || !validUntil) {
      setError('Please select both start and end dates.');
      return;
    }
    if (validUntil < validFrom) {
      setError('End date must be on or after the start date.');
      return;
    }

    setError('');
    setSubmitting(true);
    const meta = deal as Deal & { diet_type?: string };

    const { data, error: insertError } = await supabase
      .from('deals')
      .insert({
        restaurant_id:  deal.restaurant_id,
        title:          newTitle,
        description:    deal.description,
        discount_type:  deal.discount_type,
        discount_value: deal.discount_value,
        deal_types:     deal.deal_types,
        available_days: deal.available_days,
        scope:          deal.scope,
        scope_detail:   deal.scope_detail,
        emoji:          deal.emoji,
        photo_url:      deal.photo_url,
        valid_from:     validFrom,
        valid_until:    validUntil,
        max_claims:     deal.max_claims,
        current_claims: 0,
        is_coming:      false,
        is_active:      true,
        diet_type:      meta.diet_type ?? 'nonveg',
      })
      .select()
      .single();

    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (data) onCreated(data as Deal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div
        className="relative w-full max-w-[440px] max-h-[90vh] overflow-y-auto rounded-2xl p-6 shadow-2xl"
        style={{ background: '#141414', border: '1px solid #2a2a2a' }}
        role="dialog"
        aria-labelledby="duplicate-deal-title"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(18,73,169,0.15)' }}>
              <IconRepeat size={18} style={{ color: BLUE }} />
            </div>
            <div>
              <h3 id="duplicate-deal-title" className="font-bold text-[17px] text-tx">Duplicate deal</h3>
              <p className="text-[12px] text-t2">Original deal stays unchanged</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-t2 hover:text-tx hover:bg-white/5">
            <IconX size={16} />
          </button>
        </div>

        {/* Original deal summary */}
        <div className="rounded-xl p-4 mb-4 space-y-2" style={{ background: '#0f0f0f', border: '1px solid #222' }}>
          <div className="flex items-center gap-2">
            <span className="text-xl">{deal.emoji}</span>
            <div>
              <p className="text-[11px] font-semibold text-t3 uppercase tracking-wide">Original</p>
              <p className="font-semibold text-[14px] text-tx">{formatDealTitle(deal.title)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12px]">
            <p className="text-t2">Dates</p>
            <p className="text-tx font-medium text-right">
              {formatDealDate(deal.valid_from)} → {formatDealDate(deal.valid_until)}
            </p>
            <p className="text-t2">Available days</p>
            <p className="text-tx font-medium text-right">{formatAvailableDays(deal.available_days)}</p>
            <p className="text-t2">Claims used</p>
            <p className="text-tx font-medium text-right">
              {deal.current_claims}
              {deal.max_claims ? ` / ${deal.max_claims} max` : ' (no limit)'}
            </p>
            <p className="text-t2">Discount</p>
            <p className="text-tx font-medium text-right">{deal.discount_value ?? '—'}</p>
            <p className="text-t2">Type</p>
            <p className="text-tx font-medium text-right capitalize">{(deal.deal_types ?? []).join(', ') || '—'}</p>
          </div>
        </div>

        {/* New duplicate preview */}
        <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: 'rgba(18,73,169,0.08)', border: '1px solid rgba(18,73,169,0.25)' }}>
          <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: BLUE }}>New duplicate</p>
          <p className="text-[14px] font-semibold text-tx">{newTitle}</p>
          <p className="text-[12px] text-t2">
            Same details, discount, and available days · starts with <strong className="text-tx">0 claims</strong>
            {deal.max_claims ? ` (max ${deal.max_claims})` : ''}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold text-t3 uppercase">Start date</span>
              <input
                type="date"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg text-[13px] text-tx bg-[#0a0a0a] border border-[#333] outline-none focus:border-[#1249A9]"
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-t3 uppercase">End date</span>
              <input
                type="date"
                value={validUntil}
                min={validFrom || undefined}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1 w-full h-10 px-3 rounded-lg text-[13px] text-tx bg-[#0a0a0a] border border-[#333] outline-none focus:border-[#1249A9]"
              />
            </label>
          </div>

          {runDays > 0 && (
            <p className="text-[12px] text-t2">
              Run length: <span className="text-tx font-medium">{runDays} day{runDays !== 1 ? 's' : ''}</span>
              {' · '}
              Days: <span className="text-tx font-medium">{formatAvailableDays(deal.available_days)}</span>
            </p>
          )}
        </div>

        {error && (
          <p className="text-[12px] text-red-400 mb-3">{error}</p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 rounded-xl border border-[#333] text-[14px] font-semibold text-t2 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            className="flex-1 h-11 rounded-xl text-[14px] font-bold text-white disabled:opacity-60 inline-flex items-center justify-center gap-2"
            style={{ background: BLUE }}
          >
            {submitting ? <IconLoader2 size={16} className="animate-spin" /> : <IconRepeat size={16} />}
            {submitting ? 'Creating…' : 'Create duplicate'}
          </button>
        </div>
      </div>
    </div>
  );
}
