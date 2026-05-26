import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { symbol: string } }): Promise<Metadata> {
  const decodedSymbol = decodeURIComponent(params.symbol).toUpperCase();
  return {
    title: `${decodedSymbol} Share Price, Live Chart & AI Analysis | Vision Wealth`,
    description: `Get real-time stock price, quantitative analysis, technical indicators, and AI prediction for ${decodedSymbol}. Check buy/sell signals and institutional order blocks.`,
  };
}

export default function SymbolWatchlistLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
