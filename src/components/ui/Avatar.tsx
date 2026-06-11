'use client';

type Size   = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Portal = 'customer' | 'restaurant' | 'influencer';

interface AvatarProps {
  src?:       string | null;
  name?:      string;
  size?:      Size;
  portal?:    Portal;
  hasBadge?:  boolean; // gold crown for RepEAT+
  className?: string;
}

const SIZE_PX: Record<Size, number> = {
  xs: 28, sm: 36, md: 44, lg: 64, xl: 80,
};

const SIZE_TEXT: Record<Size, string> = {
  xs: 'text-[11px]', sm: 'text-[13px]', md: 'text-[16px]', lg: 'text-[24px]', xl: 'text-[28px]',
};

const PORTAL_COLOR: Record<Portal, string> = {
  customer:   '#E85D04',
  restaurant: '#1249A9',
  influencer: '#7E22CE',
};

function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export default function Avatar({
  src, name, size = 'md', portal, hasBadge = false, className = '',
}: AvatarProps) {
  const px = SIZE_PX[size];
  const ringStyle = portal
    ? { border: `2.5px solid ${PORTAL_COLOR[portal]}` }
    : { border: '2px solid var(--bd)' };

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: px, height: px }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? 'avatar'}
          className="w-full h-full rounded-full object-cover"
          style={ringStyle}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full flex items-center justify-center font-display font-bold text-white ${SIZE_TEXT[size]}`}
          style={{ background: portal ? PORTAL_COLOR[portal] : '#E85D04', ...ringStyle }}
        >
          {initials(name)}
        </div>
      )}

      {hasBadge && (
        <span
          className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-[var(--bg)] flex items-center justify-center text-[9px]"
          aria-label="RepEAT+ member"
        >
          👑
        </span>
      )}
    </div>
  );
}
