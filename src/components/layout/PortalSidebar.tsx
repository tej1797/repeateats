'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

type Portal = 'restaurant' | 'influencer';

interface SidebarItem {
  icon:   ReactNode;
  label:  string;
  href:   string;
  badge?: number;
}

interface PortalSidebarProps {
  portal:     Portal;
  items:      SidebarItem[];
  activeItem?: string;
}

const PORTAL_COLOR: Record<Portal, string> = {
  restaurant: '#1249A9',
  influencer: '#7E22CE',
};

export default function PortalSidebar({ portal, items, activeItem }: PortalSidebarProps) {
  const pathname = usePathname();
  const color    = PORTAL_COLOR[portal];

  return (
    <aside className="hidden lg:flex flex-col w-56 flex-shrink-0 bg-surface border-r border-[var(--bd)] min-h-screen pt-4">
      <nav className="flex flex-col gap-0.5 px-2">
        {items.map((item) => {
          const active = activeItem
            ? activeItem === item.label
            : pathname === item.href;

          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-brands text-[13px] font-semibold transition-all"
              style={active
                ? { color, background: `${color}15` }
                : { color: 'var(--t2)' }
              }
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                  style={{ background: color }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
