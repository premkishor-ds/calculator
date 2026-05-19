import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Institutional Stock Watchlist & Portfolio Workspace | Vision Wealth',
  description: 'Access institutional-grade financial stock watchlists, sector tags, and multi-portfolio workspaces. Build, track, and manage your asset configurations with near real-time dynamic valuations.',
  keywords: 'watchlist, portfolio, financial screener, stock tracking, Indian markets, sector tags, wealth tracker',
  openGraph: {
    title: 'Institutional Stock Watchlist & Portfolio Workspace | Vision Wealth',
    description: 'Track and manage your asset configurations with near real-time dynamic valuations, custom tags, and multi-portfolio workspaces.',
    type: 'website',
  }
};

export default function WatchlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
