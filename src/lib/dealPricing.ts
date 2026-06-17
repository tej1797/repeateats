/** Shared deal-pricing display helpers — used by the customer card, deal detail
 *  modal, and the restaurant live preview so price math stays consistent.
 *
 *  base_price = the price of ONE item (what the customer pays for the first one).
 *  - BOGO (buy 1 get 1 free):  pay base_price, get a 2nd free.
 *  - BOGO half (buy 1 get 1 50% off): 1st = base_price, 2nd = base_price * 0.5.
 *  - set_price: base_price (or discount_value) IS the price.
 *  - percentage / dollar off: base_price is the regular price; we compute the
 *    discounted price for display.
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

/** Short price tag for the right side of a deal card (or null to omit). */
export function getDealPriceTag(deal: DealPricingInput): string | null {
  const dt = (deal.discount_type ?? '').toLowerCase();

  if (dt === 'free_item') {
    if (deal.free_condition_type === 'spend' && deal.free_condition_value) {
      const amt = formatPrice(numFromValue(deal.free_condition_value));
      return amt ? `Spend ${amt}+` : null;
    }
    if (deal.free_condition_type === 'item' && deal.free_condition_value) {
      return `+ ${deal.free_condition_value.trim()}`;
    }
    return null;
  }

  // Set price: prefer base_price, fall back to the numeric discount_value.
  const price = deal.base_price ?? (dt === 'set_price' ? numFromValue(deal.discount_value) : null);
  return formatPrice(price);
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

  if (base === null) {
    // set_price can still show its price from discount_value.
    if (dt === 'set_price') {
      const p = formatPrice(numFromValue(deal.discount_value));
      return p ? { lines: [{ label: 'Price', value: p }] } : null;
    }
    return null;
  }

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
    const second = base * 0.5;
    return {
      lines: [
        { label: '1st lb', value: baseStr },
        { label: '2nd lb (50% off)', value: formatPrice(second)! },
      ],
      total: `${formatPrice(base + second)} for 2 lb`,
    };
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

  // set_price / other: just show the price.
  return { lines: [{ label: 'Price', value: baseStr }] };
}
