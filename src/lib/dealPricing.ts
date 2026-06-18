/** Shared deal-pricing display helpers — used by the customer card, deal detail
 *  modal, and the restaurant live preview so price math stays consistent.
 *
 *  base_price = the REGULAR price of one item.
 *  - BOGO (buy 1 get 1 free):  pay base_price, get a 2nd free.
 *  - BOGO half (buy 1 get 1 50% off): 1st = base_price, 2nd = base_price * 0.5.
 *  - BOGO lb (buy by weight): base_price is the price per lb.
 *  - percentage / dollar off: base_price is the regular price; we compute the
 *    discounted price and show the regular price struck through.
 *  - set_price: base_price is the regular price; discount_value is the special
 *    price the customer pays (regular shown struck through).
 *  - free_item: no price — a qualifying condition is shown instead.
 */

export interface DealPricingInput {
  discount_type?: string | null;
  discount_value?: string | null;
  base_price?: number | null;
  free_condition_type?: 'spend' | 'item' | null;
  free_condition_value?: string | null;
}

/** True for every discount type that takes a base price (everything but free_item). */
export function dealUsesBasePrice(discountType?: string | null): boolean {
  return (discountType ?? '').toLowerCase() !== 'free_item';
}

export function isFreeItemDiscount(discountType?: string | null): boolean {
  return (discountType ?? '').toLowerCase() === 'free_item';
}

/** Format a numeric price as $X, dropping a trailing .00 (e.g. 10 → "$10", 12.5 → "$12.50"). */
export function formatPrice(n: number | null | undefined): string | null {
  if (n === null || n === undefined || Number.isNaN(n)) return null;
  const rounded = Math.round(n * 100) / 100;
  const str = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
  return `$${str}`;
}

/** Parse a number out of discount_value text like "$12" or "20%". */
function numFromValue(val?: string | null): number | null {
  if (!val) return null;
  const n = parseFloat(String(val).replace(/[^0-9.]/g, ''));
  return Number.isNaN(n) ? null : n;
}

/** Short condition tag for a free-item deal (or null). */
function freeItemTag(deal: DealPricingInput): string | null {
  if (deal.free_condition_type === 'spend' && deal.free_condition_value) {
    const amt = formatPrice(numFromValue(deal.free_condition_value));
    return amt ? `Spend ${amt}+` : null;
  }
  if (deal.free_condition_type === 'item' && deal.free_condition_value) {
    return `+ ${deal.free_condition_value.trim()}`;
  }
  return null;
}

/** The price the customer effectively pays — used for the auto price-tag bucket. */
export function getEffectivePrice(deal: DealPricingInput): number | null {
  const dt = (deal.discount_type ?? '').toLowerCase();
  if (dt === 'free_item') return null;
  const base = deal.base_price ?? null;

  if (dt === 'set_price') {
    const special = numFromValue(deal.discount_value);
    return special ?? base;
  }
  if (base === null) return null;
  if (dt === 'percentage') {
    const pct = numFromValue(deal.discount_value);
    return pct ? Math.round(base * (1 - pct / 100) * 100) / 100 : base;
  }
  if (dt === 'fixed' || dt === 'dollar') {
    const off = numFromValue(deal.discount_value);
    return off ? Math.max(0, base - off) : base;
  }
  return base; // bogo, bogo_half, bogo_lb, other
}

export interface DealPriceParts { final: string | null; original?: string }

/** Final price + (optional) struck-through original, for cards / preview / title. */
export function getDealPriceParts(deal: DealPricingInput): DealPriceParts {
  const dt = (deal.discount_type ?? '').toLowerCase();
  const base = deal.base_price ?? null;

  if (dt === 'free_item') return { final: freeItemTag(deal) };

  if (dt === 'percentage') {
    const pct = numFromValue(deal.discount_value);
    if (base !== null && pct) return { final: formatPrice(base * (1 - pct / 100))!, original: formatPrice(base)! };
    return { final: base !== null ? formatPrice(base) : null };
  }
  if (dt === 'fixed' || dt === 'dollar') {
    const off = numFromValue(deal.discount_value);
    if (base !== null && off) return { final: formatPrice(Math.max(0, base - off))!, original: formatPrice(base)! };
    return { final: base !== null ? formatPrice(base) : null };
  }
  if (dt === 'set_price') {
    const special = numFromValue(deal.discount_value);
    if (base !== null && special !== null && base > special) return { final: formatPrice(special)!, original: formatPrice(base)! };
    if (special !== null) return { final: formatPrice(special) };
    return { final: base !== null ? formatPrice(base) : null };
  }
  if (dt === 'bogo_lb') {
    return { final: base !== null ? `${formatPrice(base)}/lb` : null };
  }
  // bogo, bogo_half, other
  return { final: base !== null ? formatPrice(base) : null };
}

/** Short price tag for the right side of a deal card (final price only, or null). */
export function getDealPriceTag(deal: DealPricingInput): string | null {
  return getDealPriceParts(deal).final;
}

export interface PriceLine { label: string; value: string }
export interface DealPriceBreakdown { lines: PriceLine[]; total?: string; note?: string }

/** Detailed price breakdown for the deal detail modal (or null when nothing to show). */
export function getDealPriceBreakdown(deal: DealPricingInput): DealPriceBreakdown | null {
  const dt = (deal.discount_type ?? '').toLowerCase();
  const base = deal.base_price ?? null;

  if (dt === 'free_item') {
    if (deal.free_condition_type === 'spend' && deal.free_condition_value) {
      const amt = formatPrice(numFromValue(deal.free_condition_value));
      return amt ? { lines: [], note: `Free item when you spend ${amt} or more` } : null;
    }
    if (deal.free_condition_type === 'item' && deal.free_condition_value) {
      return { lines: [], note: `Free item with purchase of ${deal.free_condition_value.trim()}` };
    }
    return null;
  }

  if (dt === 'set_price') {
    const special = numFromValue(deal.discount_value);
    if (base !== null && special !== null && base > special) {
      return { lines: [
        { label: 'Regular price', value: formatPrice(base)! },
        { label: 'You pay', value: formatPrice(special)! },
      ] };
    }
    const price = formatPrice(special ?? base);
    return price ? { lines: [{ label: 'Price', value: price }] } : null;
  }

  if (base === null) return null;
  const baseStr = formatPrice(base)!;

  if (dt === 'bogo') {
    return {
      lines: [
        { label: 'You pay', value: baseStr },
        { label: 'You get', value: '2 items' },
      ],
      total: `${baseStr} for 2`,
    };
  }

  if (dt === 'bogo_half') {
    const second = base * 0.5;
    return {
      lines: [
        { label: '1st item', value: baseStr },
        { label: '2nd item (50% off)', value: formatPrice(second)! },
      ],
      total: `${formatPrice(base + second)} total`,
    };
  }

  if (dt === 'bogo_lb') {
    return { lines: [{ label: 'Price per lb', value: baseStr }] };
  }

  if (dt === 'percentage') {
    const pct = numFromValue(deal.discount_value);
    if (pct) {
      const pay = base * (1 - pct / 100);
      return {
        lines: [
          { label: 'Regular price', value: baseStr },
          { label: `You pay (${pct}% off)`, value: formatPrice(pay)! },
        ],
      };
    }
    return { lines: [{ label: 'Regular price', value: baseStr }] };
  }

  if (dt === 'fixed' || dt === 'dollar') {
    const off = numFromValue(deal.discount_value);
    if (off) {
      const pay = Math.max(0, base - off);
      return {
        lines: [
          { label: 'Regular price', value: baseStr },
          { label: `You pay (${formatPrice(off)} off)`, value: formatPrice(pay)! },
        ],
      };
    }
    return { lines: [{ label: 'Regular price', value: baseStr }] };
  }

  return { lines: [{ label: 'Price', value: baseStr }] };
}

/** Auto price-tag bucket from the effective price (≤6 → under6, ≤12 → under12). */
export function priceTagForPrice(price: number | null): 'under6' | 'under12' | null {
  if (price === null || Number.isNaN(price)) return null;
  if (price <= 6) return 'under6';
  if (price <= 12) return 'under12';
  return null;
}
