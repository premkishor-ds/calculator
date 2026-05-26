import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Custom Watchlist | Vision Wealth',
  description: 'Track your customized stock portfolio, set up AI predictions, and get alerts for your favorite assets.'
};

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
