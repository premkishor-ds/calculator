import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Advanced Stock Screener | Vision Wealth',
  description: 'Screen Indian stocks using advanced AI predictors, technical analysis, and fundamental ratios. Find the best stocks to invest in today.'
};

export default function ScreenerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
