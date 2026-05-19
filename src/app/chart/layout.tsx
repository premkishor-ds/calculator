import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Advanced Multi-Portfolio Trading Terminal & Technical Analytics | Vision Wealth',
  description: 'Experience a high-performance, Bloomberg-grade trading terminal equipped with lightweight technical indicators, live asset summaries, dynamic strategy scores, and seamless multi-workspace selectors.',
  keywords: 'trading terminal, chart, lightweight charts, technical analysis, moving averages, relative strength, financial analytics, portfolio workspace',
  openGraph: {
    title: 'Advanced Multi-Portfolio Trading Terminal & Technical Analytics | Vision Wealth',
    description: 'High-performance interactive candlestick terminal equipped with custom indicators, real-time metrics, and dynamic strategy scoring.',
    type: 'website',
  }
};

export default function ChartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
