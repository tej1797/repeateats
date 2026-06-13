/** Shared offer headline + badge labels for customer cards and restaurant live preview. */

export interface DealOfferInput {
  discount_type?: string | null;
  discount_value?: string | null;
  title?: string | null;
  scope_detail?: string | null;
}

/** Customer card headline (sentence case). */
export function getDealOfferHeadline(deal: DealOfferInput): string {
  const dt = (deal.discount_type ?? '').toLowerCase();
  const val = deal.discount_value ?? '';
  const t = (deal.title ?? '').toLowerCase();

  if (dt === 'bogo_half') return 'Buy 1 Get 1 50% Off';
  if (dt === 'bogo_lb') {
    const item = deal.scope_detail?.trim();
    return item ? `Buy 1 lb ${item}` : 'Buy by lb';
  }
  if (dt === 'bogo' || (t.includes('buy') && t.includes('get'))) return 'Buy 1 Get 1';
  if (dt === 'free_item' || dt === 'free') return 'Free Item';
  if (dt === 'percentage') {
    const num = String(val).replace(/[^0-9.]/g, '');
    return num ? `${num}% Off` : '% Off';
  }
  if (dt === 'fixed' || dt === 'dollar' || dt === 'set_price') {
    const num = String(val).replace(/[^0-9.]/g, '');
    if (dt === 'set_price' && num) return `$${num} Special`;
    return num ? `$${num} Off` : (val || 'Deal');
  }
  if (dt === 'free_delivery') return 'Free Delivery';
  if (t.includes('happy hour')) return 'Happy Hour';
  return val || 'Deal';
}

/** Compact uppercase badge for live preview (mobile parity). */
export function getDealOfferBadge(deal: DealOfferInput): string {
  const dt = (deal.discount_type ?? '').toLowerCase();
  const val = deal.discount_value ?? '';
  const t = (deal.title ?? '').toLowerCase();

  if (dt === 'bogo_half') return 'BUY 1 GET 1 50% OFF';
  if (dt === 'bogo_lb') return 'BUY BY LB';
  if (dt === 'bogo' || (t.includes('buy') && t.includes('get') && !t.includes('50%'))) return 'BUY 1 GET 1';
  if (dt === 'free_item' || dt === 'free') return 'FREE ITEM';
  if (dt === 'percentage') {
    const num = String(val).replace(/[^0-9.]/g, '');
    return num ? `${num}% OFF` : '% OFF';
  }
  if (dt === 'set_price') {
    const num = String(val).replace(/[^0-9.]/g, '');
    return num ? `$${num} SPECIAL` : 'SET PRICE';
  }
  if (dt === 'fixed' || dt === 'dollar') {
    const num = String(val).replace(/[^0-9.]/g, '');
    return num ? `$${num} OFF` : 'DEAL';
  }
  if (dt === 'free_delivery') return 'FREE DELIVERY';
  if (t.includes('happy hour')) return 'HAPPY HOUR';
  return (val || 'DEAL').toUpperCase().slice(0, 24);
}
