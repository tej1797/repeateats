'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  IconTag, IconTicket, IconUser,
  IconLayoutDashboard, IconStar, IconChartBar, IconSettings,
  IconUsers, IconMessage, IconCoin,
} from '@tabler/icons-react';
import type { ReactNode } from 'react';

type Portal = 'customer' | 'restaurant' | 'influencer';

interface NavItem {
  href:  string;
  icon:  ReactNode;
  label: string;
}

const NAV_ITEMS: Record<Portal, NavItem[]> = {
  customer: [
    { href: '/customer',                          icon: <IconTag size={22} />,    label: 'Deals' },
    { href: '/customer/profile?tab=claims',       icon: <IconTicket size={22} />, label: 'Claims' },
    { href: '/customer/points',                   icon: <IconStar size={22} />,   label: 'Rewards' },
    { href: '/customer/profile',                  icon: <IconUser size={22} />,   label: 'Profile' },
  ],
  restaurant: [
    { href: '/restaurant',        icon: <IconLayoutDashboard size={22} />, label: 'Dashboard' },
    { href: '/restaurant?tab=deals', icon: <IconTag size={22} />,          label: 'Deals' },
    { href: '/restaurant?tab=analytics', icon: <IconChartBar size={22} />, label: 'Analytics' },
    { href: '/restaurant?tab=settings',  icon: <IconSettings size={22} />, label: 'Settings' },
  ],
  influencer: [
    { href: '/influencer',        icon: <IconUsers size={22} />,           label: 'Collabs' },
    { href: '/influencer',        icon: <IconMessage size={22} />,         label: 'Chat' },
    { href: '/influencer/profile',icon: <IconCoin size={22} />,            label: 'Earnings' },
    { href: '/influencer/profile',icon: <IconStar size={22} />,            label: 'Profile' },
  ],
};

const PORTAL_COLOR: Record<Portal, string> = {
  customer:   '#FF6B00',
  restaurant: '#1249A9',
  influencer: '#7E22CE',
};

interface MobileNavProps {
  portal: Portal;
}

export default function MobileNav({ portal }: MobileNavProps) {
  const pathname = usePathname();
  const items    = NAV_ITEMS[portal];
  const color    = PORTAL_COLOR[portal];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-[var(--bd)] flex md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {items.map((item) => {
        // Match pathname + optional query string comparison
        const [itemPath, itemQuery] = item.href.split('?');
        const pathMatch = pathname === itemPath;
        const active = pathMatch && (!itemQuery || (typeof window !== 'undefined' && window.location.search.includes(itemQuery)));
        return (
          <Link
            key={item.label}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
            style={{ color: active ? color : 'var(--t3)' }}
          >
            {item.icon}
            <span className="text-[10px] font-semibold">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
