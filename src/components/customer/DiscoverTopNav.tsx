'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconHome, IconTicket, IconUser } from '@tabler/icons-react';
import { CUSTOMER_UI } from '@/lib/customerUI';

const TABS = [
  { href: '/customer',         label: 'Home',    icon: IconHome },
  { href: '/customer/claims',  label: 'Claims',  icon: IconTicket },
  { href: '/customer/profile', label: 'Profile', icon: IconUser },
] as const;

export default function DiscoverTopNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === '/customer'
          ? pathname === '/customer'
          : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold transition-colors flex-shrink-0"
            style={
              active
                ? { background: CUSTOMER_UI.accent, color: '#fff' }
                : { color: CUSTOMER_UI.textSecondary }
            }
          >
            <Icon size={15} stroke={1.75} />
            <span className="hidden sm:inline">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
