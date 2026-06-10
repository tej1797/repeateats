// Points economy — must match mobile src/constants/customerPoints.ts + DB RPCs.

export const POINTS_ECONOMY = {
  signupBonus:       50,
  scanRedemption:    10,
  firstScanBonus:    15,
} as const;

export type RewardKey =
  | 'extra_claim_today'
  | 'tomorrow_24h'
  | 'extra_claim_month'
  | 'plus_3d'
  | 'plus_7d';

export interface PointsReward {
  key:         RewardKey;
  cost:        number;
  title:       string;
  description: string;
  freeOnly?:   boolean;
}

export const POINTS_REWARDS: PointsReward[] = [
  { key: 'extra_claim_today', cost: 50,  title: '+1 redemption today',     description: 'Redeem one extra deal today' },
  { key: 'tomorrow_24h',      cost: 55,  title: "Claim tomorrow's deals",  description: '24h early access to tomorrow', freeOnly: true },
  { key: 'extra_claim_month', cost: 90,  title: '+1 redemption this month', description: 'One extra monthly redemption' },
  { key: 'plus_3d',           cost: 70,  title: 'RepEAT+ 3-day extension', description: 'Extend your Pro trial by 3 days', freeOnly: true },
  { key: 'plus_7d',           cost: 135, title: 'RepEAT+ 7-day extension', description: 'Extend your Pro trial by 7 days', freeOnly: true },
];

/** Sorted low → high cost for horizontal rewards scroll. */
export function sortedRewards(): PointsReward[] {
  return [...POINTS_REWARDS].sort((a, b) => a.cost - b.cost);
}

/** Hide free-only rewards for paid tiers (metadata only — no tier labels in UI). */
export function isRewardVisible(reward: PointsReward, tier: string): boolean {
  if (reward.freeOnly && tier !== 'free') return false;
  return true;
}
