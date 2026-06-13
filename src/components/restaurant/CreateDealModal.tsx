'use client';

// CreateDealModal — restaurant staff can create a new deal from the dashboard
// Submits directly to Supabase via the browser client.

import { useState } from 'react';
import { IconX, IconLoader2, IconCheck } from '@tabler/icons-react';
import { createClient } from '@/lib/supabase/client';
import {
  DISCOUNT_TYPE_OPTIONS,
  PRICE_TAG_OPTIONS,
  defaultDiscountValue,
  discountValuePlaceholder,
  discountValueRequired,
  isLbDiscount,
  normalizeDiscountType,
  toDbDiscountType,
  type PriceTag,
  type RestaurantDiscountType,
} from '@/lib/restaurantDealForm';
import DealLivePreview from '@/components/restaurant/DealLivePreview';

const BLUE = '#1249A9';
const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
const DEAL_TYPES = ['dine-in', 'pickup'] as const;
type DayKey = typeof DAYS[number];
type DealTypeKey = typeof DEAL_TYPES[number];

interface ExistingDeal {
  id: string; emoji: string | null; title: string; description: string | null;
  discount_type: string | null; discount_value: string | null;
  deal_types: string[]; available_days: string[];
  max_claims: number | null; valid_from: string | null; valid_until: string | null;
  is_coming: boolean;
  diet_type?: string | null;
  price_tag?: PriceTag;
  scope_detail?: string | null;
}

interface Props {
  restaurantId:       string;
  restaurantName?:    string;
  restaurantCity?:    string;
  restaurantCoverUrl?: string | null;
  existingDeal?:      ExistingDeal;
  onCreated:          (deal: Record<string, unknown>) => void;
  onClose:            () => void;
}

function initialDiet(existing?: ExistingDeal): 'veg' | 'nonveg' {
  if (existing?.diet_type === 'nonveg') return 'nonveg';
  return 'veg';
}

export default function CreateDealModal({
  restaurantId,
  restaurantName = 'Your Restaurant',
  restaurantCity,
  restaurantCoverUrl,
  existingDeal,
  onCreated,
  onClose,
}: Props) {
  const supabase = createClient();
  const isEdit   = !!existingDeal;

  const initialDiscount = normalizeDiscountType(existingDeal?.discount_type ?? 'percentage');

  const emoji = existingDeal?.emoji ?? '🍽️';
  const [title,          setTitle]          = useState(existingDeal?.title ?? '');
  const [description,    setDescription]    = useState(existingDeal?.description ?? '');
  const [discountType,   setDiscountType]   = useState<RestaurantDiscountType>(initialDiscount);
  const [discountValue,  setDiscountValue]  = useState(
    existingDeal?.discount_value ?? defaultDiscountValue(initialDiscount),
  );
  const [lbItem,         setLbItem]         = useState(
    isLbDiscount(initialDiscount) ? (existingDeal?.scope_detail ?? '') : '',
  );
  const [lbQty,          setLbQty]          = useState('1');
  const [priceTag,       setPriceTag]       = useState<PriceTag>(existingDeal?.price_tag ?? null);
  const [selectedTypes,  setSelectedTypes]  = useState<Set<DealTypeKey>>(new Set<DealTypeKey>(
    ((existingDeal?.deal_types ?? ['dine-in']) as string[]).filter((t): t is DealTypeKey => t === 'dine-in' || t === 'pickup'),
  ));
  const [allDays,        setAllDays]        = useState(!existingDeal || existingDeal.available_days[0] === 'all');
  const [selectedDays,   setSelectedDays]   = useState<Set<DayKey>>(new Set((existingDeal?.available_days ?? []).filter(d => d !== 'all') as DayKey[]));
  const [unlimited,      setUnlimited]      = useState(!existingDeal || existingDeal.max_claims === null);
  const [maxClaims,      setMaxClaims]      = useState(existingDeal?.max_claims?.toString() ?? '');
  const [validFrom,      setValidFrom]      = useState(existingDeal?.valid_from ?? '');
  const [validUntil,     setValidUntil]     = useState(existingDeal?.valid_until ?? '');
  const [isComing,       setIsComing]       = useState(existingDeal?.is_coming ?? false);
  const [dietType,       setDietType]       = useState<'veg' | 'nonveg'>(initialDiet(existingDeal));
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState('');
  const [done,           setDone]           = useState(false);

  const handleDiscountTypeChange = (next: RestaurantDiscountType) => {
    setDiscountType(next);
    const preset = defaultDiscountValue(next);
    if (preset) setDiscountValue(preset);
  };

  const toggleType = (t: DealTypeKey) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) { next.delete(t); } else { next.add(t); }
      return next;
    });
  };

  const toggleDay = (d: DayKey) => {
    setSelectedDays(prev => {
      const next = new Set(prev);
      if (next.has(d)) { next.delete(d); } else { next.add(d); }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { setError('Dish name is required'); return; }

    const resolvedValue = discountValue.trim() || defaultDiscountValue(discountType);
    if (discountValueRequired(discountType) && !resolvedValue) {
      setError('Discount value is required');
      return;
    }
    if (isLbDiscount(discountType) && !lbItem.trim()) {
      setError('Enter the item name for your lb deal (e.g. Fish Pakora)');
      return;
    }
    if (selectedTypes.size === 0) { setError('Select at least one deal type'); return; }
    if (!allDays && selectedDays.size === 0) { setError('Select at least one day'); return; }

    setError('');
    setSubmitting(true);

    const scopeDetail = isLbDiscount(discountType) ? lbItem.trim() : null;

    const payload = {
      restaurant_id:  restaurantId,
      emoji:          emoji.trim() || '🍽️',
      diet_type:      dietType,
      title:          title.trim(),
      description:    description.trim() || null,
      discount_type:  toDbDiscountType(discountType),
      discount_value: resolvedValue || null,
      deal_types:     Array.from(selectedTypes),
      available_days: allDays ? ['all'] : Array.from(selectedDays),
      max_claims:     unlimited ? null : (parseInt(maxClaims) || null),
      is_active:      !isComing,
      is_coming:      isComing,
      valid_from:     validFrom || null,
      valid_until:    validUntil || null,
      scope:          isLbDiscount(discountType) ? 'single' : 'menu',
      scope_detail:   scopeDetail,
      price_tag:      priceTag,
    };

    let data: Record<string, unknown> | null = null;
    let opError: { message: string } | null = null;

    if (isEdit && existingDeal) {
      const { data: updated, error: updateError } = await supabase
        .from('deals').update(payload).eq('id', existingDeal.id).select().single();
      data = updated as Record<string, unknown> | null;
      opError = updateError;
    } else {
      const { data: created, error: insertError } = await supabase
        .from('deals').insert({ ...payload, current_claims: 0 }).select().single();
      data = created as Record<string, unknown> | null;
      opError = insertError;
    }

    setSubmitting(false);

    if (opError) {
      setError(opError.message);
      return;
    }

    setDone(true);
    setTimeout(() => {
      onCreated(data as Record<string, unknown>);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full sm:max-w-[540px] max-h-[92vh] overflow-y-auto scrollbar-none bg-surface rounded-t-[20px] sm:rounded-brand shadow-2xl flex flex-col"
        style={{ animation: 'slideUp 0.25s ease' }}
      >
        <div className="sticky top-0 bg-surface z-10 px-5 pt-5 pb-4 border-b border-[var(--bd)] flex items-center justify-between">
          <div>
            <h2 className="font-display text-[20px] font-extrabold">{isEdit ? 'Edit Deal' : 'Create a Deal'}</h2>
            <p className="text-[13px] text-t2 mt-0.5">Fill in the details below</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-surface2 flex items-center justify-center text-t2 hover:text-tx transition-colors">
            <IconX size={18} />
          </button>
        </div>

        {done ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(18,73,169,0.1)' }}>
              <IconCheck size={32} style={{ color: BLUE }} />
            </div>
            <p className="font-bold text-[18px]" style={{ color: BLUE }}>{isEdit ? 'Deal updated!' : 'Deal created!'}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-5">
            <div>
              <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-1.5">Dish name</label>
              <div className="flex gap-2">
                <div className="w-14 h-11 rounded-brands border-2 border-[var(--bd2)] overflow-hidden flex-shrink-0 bg-surface2">
                  {restaurantCoverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={restaurantCoverUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[22px]">{emoji}</div>
                  )}
                </div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Chole Bhature"
                  className="flex-1 h-11 px-3 border-2 border-[var(--bd2)] rounded-brands bg-surface text-tx text-[15px] outline-none focus:border-[var(--brand)] transition-colors"
                />
              </div>
              <p className="text-[11px] text-t3 mt-1">Deal type (e.g. Buy 1 Get 1 50% Off) shows on the card from the discount section.</p>
            </div>

            <div>
              <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-1.5">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={1}
                placeholder="Any conditions or extra details..."
                className="w-full px-3 py-2 border-2 border-[var(--bd2)] rounded-brands bg-surface text-tx text-[14px] outline-none focus:border-[var(--brand)] transition-colors resize-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-1.5">Discount</label>
              <div className="flex gap-2">
                <select
                  value={discountType}
                  onChange={(e) => handleDiscountTypeChange(e.target.value as RestaurantDiscountType)}
                  className="h-11 px-3 border-2 border-[var(--bd2)] rounded-brands bg-surface text-tx text-[14px] outline-none focus:border-[var(--brand)] transition-colors max-w-[52%]"
                >
                  {DISCOUNT_TYPE_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <input
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder={discountValuePlaceholder(discountType)}
                  className="flex-1 h-11 px-3 border-2 border-[var(--bd2)] rounded-brands bg-surface text-tx text-[14px] outline-none focus:border-[var(--brand)] transition-colors"
                />
              </div>
              {discountType === 'bogo_half' && (
                <p className="text-[11px] text-t3 mt-1.5">
                  Second item is 50% off — great for takeout specials like Chole Bhature.
                </p>
              )}
            </div>

            {isLbDiscount(discountType) && (
              <div className="rounded-brands border-2 border-[var(--bd2)] p-3 space-y-3 bg-surface2/50">
                <p className="text-[12px] font-bold text-t2 uppercase tracking-wide">Lb deal details</p>
                <div className="grid grid-cols-[72px_1fr] gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-t2 mb-1">Qty (lb)</label>
                    <input
                      type="text"
                      value={lbQty}
                      onChange={(e) => {
                        setLbQty(e.target.value);
                      }}
                      placeholder="1"
                      className="w-full h-10 px-2 border-2 border-[var(--bd2)] rounded-brands bg-surface text-tx text-[14px] outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-t2 mb-1">Item name</label>
                    <input
                      type="text"
                      value={lbItem}
                      onChange={(e) => setLbItem(e.target.value)}
                      placeholder="e.g. Fish Pakora"
                      className="w-full h-10 px-3 border-2 border-[var(--bd2)] rounded-brands bg-surface text-tx text-[14px] outline-none focus:border-[var(--brand)]"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-t3">
                  Example: Buy 1 lb Fish Pakora, get the 2nd lb 50% off (Wednesdays).
                </p>
              </div>
            )}

            <div>
              <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-1.5">
                Price tag <span className="normal-case font-normal text-t3">(optional)</span>
              </label>
              <div className="flex gap-2 flex-wrap">
                {PRICE_TAG_OPTIONS.map(({ id, label }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setPriceTag(id)}
                    className="h-9 px-4 rounded-brands border-2 text-[13px] font-semibold transition-all"
                    style={priceTag === id
                      ? { borderColor: BLUE, background: 'rgba(18,73,169,0.08)', color: BLUE }
                      : { borderColor: 'var(--bd2)', color: 'var(--t2)', background: 'transparent' }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-t3 mt-1.5">
                Tag $6 or $12 specials so customers can find them under &quot;Under CA$6&quot; / &quot;Under CA$10&quot;.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-1.5">Deal type</label>
                <div className="flex gap-2 flex-wrap">
                  {DEAL_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleType(t)}
                      className="h-9 px-4 rounded-brands border-2 text-[13px] font-semibold capitalize transition-all"
                      style={selectedTypes.has(t)
                        ? { borderColor: BLUE, background: 'rgba(18,73,169,0.08)', color: BLUE }
                        : { borderColor: 'var(--bd2)', color: 'var(--t2)', background: 'transparent' }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-1.5">Available days</label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setAllDays(true)}
                    className="h-9 px-3 rounded-brands border-2 text-[12px] font-semibold transition-all"
                    style={allDays
                      ? { borderColor: BLUE, background: 'rgba(18,73,169,0.08)', color: BLUE }
                      : { borderColor: 'var(--bd2)', color: 'var(--t2)', background: 'transparent' }}
                  >
                    Every day
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllDays(false)}
                    className="h-9 px-3 rounded-brands border-2 text-[12px] font-semibold transition-all"
                    style={!allDays
                      ? { borderColor: BLUE, background: 'rgba(18,73,169,0.08)', color: BLUE }
                      : { borderColor: 'var(--bd2)', color: 'var(--t2)', background: 'transparent' }}
                  >
                    Select days
                  </button>
                </div>
              </div>
            </div>

            {!allDays && (
              <div className="flex gap-1.5 flex-wrap -mt-2">
                {DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className="w-11 h-9 rounded-brands border-2 text-[13px] font-semibold transition-all"
                    style={selectedDays.has(d)
                      ? { borderColor: BLUE, background: 'rgba(18,73,169,0.08)', color: BLUE }
                      : { borderColor: 'var(--bd2)', color: 'var(--t2)', background: 'transparent' }}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}

            <div>
              <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-1.5">Claim limit</label>
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => setUnlimited(true)}
                  className="h-9 px-4 rounded-brands border-2 text-[13px] font-semibold transition-all"
                  style={unlimited
                    ? { borderColor: BLUE, background: 'rgba(18,73,169,0.08)', color: BLUE }
                    : { borderColor: 'var(--bd2)', color: 'var(--t2)', background: 'transparent' }}
                >
                  Unlimited
                </button>
                <button
                  type="button"
                  onClick={() => setUnlimited(false)}
                  className="h-9 px-4 rounded-brands border-2 text-[13px] font-semibold transition-all"
                  style={!unlimited
                    ? { borderColor: BLUE, background: 'rgba(18,73,169,0.08)', color: BLUE }
                    : { borderColor: 'var(--bd2)', color: 'var(--t2)', background: 'transparent' }}
                >
                  Set limit
                </button>
                {!unlimited && (
                  <input
                    type="number"
                    min="1"
                    value={maxClaims}
                    onChange={(e) => setMaxClaims(e.target.value)}
                    placeholder="e.g. 50"
                    className="w-24 h-9 px-3 border-2 border-[var(--bd2)] rounded-brands bg-surface text-tx text-[14px] outline-none focus:border-[var(--brand)] transition-colors"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-1.5">Start date (opt.)</label>
                <input
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                  className="w-full h-11 px-3 border-2 border-[var(--bd2)] rounded-brands bg-surface text-tx text-[14px] outline-none focus:border-[var(--brand)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-1.5">End date (opt.)</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full h-11 px-3 border-2 border-[var(--bd2)] rounded-brands bg-surface text-tx text-[14px] outline-none focus:border-[var(--brand)] transition-colors"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--bd)]">
              <label className="block text-[12px] font-bold text-t2 uppercase tracking-wide mb-2">
                Diet type <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {([
                  { id: 'veg',    label: '🟢 Vegetarian',      dot: '#16a34a' },
                  { id: 'nonveg', label: '🔴 Non-Vegetarian', dot: '#dc2626' },
                ] as const).map(({ id, label, dot }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setDietType(id)}
                    className={`flex-1 py-2 text-[12px] font-semibold rounded-brands border-2 transition-all ${dietType === id ? 'text-tx' : 'text-t2 border-[var(--bd2)]'}`}
                    style={dietType === id ? { borderColor: dot, background: `${dot}12` } : {}}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-t3 mt-1.5">*eggs are considered as non-veg</p>
            </div>

            <div className="flex items-center justify-between py-2 border-t border-[var(--bd)]">
              <div>
                <p className="font-semibold text-[14px]">Mark as coming soon</p>
                <p className="text-[12px] text-t2">Visible but not claimable yet</p>
              </div>
              <button
                type="button"
                onClick={() => setIsComing(!isComing)}
                className="relative w-12 h-6 rounded-full transition-colors"
                style={{ background: isComing ? BLUE : 'var(--bd2)' }}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={{ transform: isComing ? 'translateX(24px)' : 'translateX(0)' }}
                />
              </button>
            </div>

            <DealLivePreview
              title={title}
              discountType={discountType}
              discountValue={discountValue.trim() || defaultDiscountValue(discountType)}
              scopeDetail={isLbDiscount(discountType) ? lbItem : undefined}
              dealTypes={Array.from(selectedTypes)}
              dietType={dietType}
              priceTag={priceTag}
              isComing={isComing}
              restaurantName={restaurantName}
              restaurantCity={restaurantCity}
            />

            {error && (
              <p className="text-[13px] text-red-600 flex items-center gap-1.5">
                <IconX size={14} /> {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 font-bold text-[15px] text-white rounded-brands transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: BLUE }}
            >
              {submitting ? <><IconLoader2 size={18} className="animate-spin" /> Creating…</> : (isEdit ? 'Save Deal' : 'Create Deal')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
