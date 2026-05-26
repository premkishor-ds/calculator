import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Live Chart Analysis | Vision Wealth',
  description: 'Analyze real-time stock charts with integrated AI Market Intelligence, institutional order blocks, and quantitative indicators.'
};

export default function ChartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
