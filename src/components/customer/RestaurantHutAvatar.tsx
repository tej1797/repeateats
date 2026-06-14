'use client';

import { IconBuildingStore } from '@tabler/icons-react';
import { CUSTOMER_UI } from '@/lib/customerUI';

/** Mobile parity — orange circle with restaurant hut icon. */
export default function RestaurantHutAvatar({ size = 44 }: { size?: number }) {
  const iconSize = Math.round(size * 0.48);
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, background: CUSTOMER_UI.accent }}
      aria-hidden
    >
      <IconBuildingStore size={iconSize} style={{ color: '#1a1100' }} stroke={2} />
    </div>
  );
}
