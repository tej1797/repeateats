import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RepEAT — Discover Deals',
};

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-portal min-h-screen">
      {children}
    </div>
  );
}
