import { Metadata } from 'next';

import { SITE_URL } from '@/lib/backend-config';

interface Props {
  params: Promise<{ symbol: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const decoded = decodeURIComponent(symbol);
  const ticker = decoded.replace('.NS', '').toUpperCase();

  let name = ticker;
  let price = '';
  try {
    const res = await fetch(
      `${SITE_URL}/api/watchlist?symbols=${encodeURIComponent(decoded)}`,
      { next: { revalidate: 3600 } }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data[0]) {
        name = data[0].name || ticker;
        price = data[0].price ? `₹${data[0].price.toFixed(2)}` : '';
      }
    }
  } catch {
    // fallback to ticker
  }

  const title = `${name} (${ticker}) Share Price${price ? ` ${price}` : ''} | Financials, PE Ratio, Technical Analysis & AI Insights`;
  const description = `Complete analysis of ${name} (${ticker}): live share price, P/E ratio, ROE, revenue growth, balance sheet, cash flow, AI outlook, Piotroski score, Reverse DCF valuation, peer comparison, and technical indicators.`;
  const url = `${SITE_URL}/watchlist/${encodeURIComponent(decoded)}`;
  const ogImage = `${SITE_URL}/api/og?symbol=${encodeURIComponent(decoded)}&name=${encodeURIComponent(name)}`;

  return {
    title,
    description,
    keywords: [
      `${ticker} share price`, `${ticker} stock analysis`, `${name} PE ratio`,
      `${name} financials`, `${ticker} NSE`, `${name} ROE`, `${name} revenue growth`,
      `${ticker} technical analysis`, `${name} AI insights`, `${ticker} valuation`,
      'Indian stock analysis', 'NSE stock screener', 'fundamental analysis India',
    ],
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [{ url: ogImage, width: 1200, height: 630, alt: `${name} stock analysis` }],
      siteName: 'Vision Wealth',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      site: '@VisionWealth',
    },
    other: {
      'article:tag': `${ticker}, ${name}, NSE, Indian Stocks, Fundamental Analysis`,
    },
  };
}

export default async function StockLayout({ children, params }: { children: React.ReactNode; params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const decoded = decodeURIComponent(symbol);
  const ticker = decoded.replace('.NS', '').toUpperCase();

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Watchlist', item: `${SITE_URL}/watchlist` },
      { '@type': 'ListItem', position: 3, name: ticker, item: `${SITE_URL}/watchlist/${encodeURIComponent(decoded)}` },
    ],
  };

  const financialSchema = {
    '@context': 'https://schema.org',
    '@type': 'FinancialService',
    name: `${ticker} Stock Analysis`,
    description: `Live share price, fundamentals, AI insights and technical analysis for ${ticker} on NSE India.`,
    url: `${SITE_URL}/watchlist/${encodeURIComponent(decoded)}`,
    areaServed: 'IN',
    serviceType: 'Stock Research',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbSchema, financialSchema]) }}
      />
      {children}
    </>
  );
}
