'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { RepEATLogo } from '@/components/RepEATLogo';
import Avatar from '@/components/ui/Avatar';
import { IconLogout, IconUser, IconTicket, IconChartBar, IconCrown } from '@tabler/icons-react';
import { useState } from 'react';

type Portal = 'customer' | 'restaurant' | 'influencer';

interface PortalHeaderUser {
  email?:        string;
  name?:         string;
  avatarUrl?:    string | null;
  isRepeatPlus?: boolean;
}

interface PortalHeaderProps {
  portal:     Portal;
  user?:      PortalHeaderUser | null;
  onSignOut?: () => void;
  children?:  ReactNode; // slot for search bar etc.
}

const PORTAL_COLOR: Record<Portal, string> = {
  customer:   '#E85D04',
  restaurant: '#065F46',
  influencer: '#7E22CE',
};

const PORTAL_HOME: Record<Portal, string> = {
  customer:   '/customer',
  restaurant: '/restaurant',
  influencer: '/influencer',
};

const CUSTOMER_NAV = [
  { href: '/profile', icon: <IconUser size={15} />, label: 'My Profile' },
  { href: '/profile', icon: <IconTicket size={15} />, label: 'My Claims' },
  { href: '/profile', icon: <IconChartBar size={15} />, label: 'Savings' },
];

export default function PortalHeader({ portal, user, onSignOut, children }: PortalHeaderProps) {
  const [open, setOpen] = useState(false);
  const color = PORTAL_COLOR[portal];

  const displayName = user?.name || user?.email?.split('@')[0] || 'Account';

  return (
    <header
      className="sticky top-0 z-40 bg-surface border-b border-[var(--bd)] shadow-sm"
      style={{ borderBottomColor: `${color}22` }}
    >
      <div className="max-w-[1100px] mx-auto px-4 h-16 flex items-center gap-3">
        {/* Logo */}
        <RepEATLogo
          portal={portal}
          size="md"
          onClick={() => { /* navigation handled by Link below */ }}
        />
        <Link href={PORTAL_HOME[portal]} className="mr-2" aria-label="Go to portal home">
          {/* invisible overlay so logo click navigates */}
        </Link>

        {/* Slot for search / tabs */}
        <div className="flex-1 min-w-0">
          {children}
        </div>

        {/* User section */}
        {user && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-brands px-2 py-1 hover:bg-surface2 transition-colors"
              aria-label="Account menu"
            >
              <Avatar
                src={user.avatarUrl}
                name={displayName}
                size="sm"
                portal={portal}
                hasBadge={user.isRepeatPlus}
              />
              <span className="hidden sm:block text-[13px] font-semibold text-t2 max-w-[100px] truncate">
                {displayName}
              </span>
            </button>

            {open && (
              <>
                {/* Backdrop */}
                <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
                {/* Dropdown */}
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-surface border border-[var(--bd)] rounded-brands shadow-brand2 z-50 py-1 animate-[slideUp_0.15s_ease]">
                  <div className="px-3 py-2 border-b border-[var(--bd)]">
                    <p className="text-[13px] font-bold truncate">{displayName}</p>
                    {user.email && (
                      <p className="text-[11px] text-t3 truncate">{user.email}</p>
                    )}
                  </div>

                  {portal === 'customer' && CUSTOMER_NAV.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[13px] text-tx hover:bg-surface2 transition-colors"
                    >
                      <span className="text-t3">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}

                  {portal === 'customer' && (
                    <Link
                      href="/repeat-plus"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-3 py-2 text-[13px] font-semibold hover:bg-surface2 transition-colors"
                      style={{ color: '#F59E0B' }}
                    >
                      <IconCrown size={14} style={{ color: '#F59E0B' }} />
                      RepEAT+
                    </Link>
                  )}

                  <div className="border-t border-[var(--bd)] mt-1 pt-1">
                    <button
                      onClick={() => { setOpen(false); onSignOut?.(); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <IconLogout size={14} /> Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Portal accent bar */}
      <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
    </header>
  );
}
