import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import { SITE_URL } from '@/lib/backend-config';

const outfit = Outfit({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#020617' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: 'Vision Wealth | Advanced SIP & CAGR Compounding Calculator',
  description: 'The most accurate wealth planner for Indian equity investors. Calculate Step-Up SIP, CAGR growth, and retirement goals with inflation and tax adjustments.',
  keywords: [
    'SIP Calculator', 'Step-Up SIP Calculator', 'CAGR Wealth Planner', 
    'Multibagger Portfolio Tracker', 'Indian Stock Market Calculator', 
    'Financial Freedom Planner', 'Compound Interest Calculator', 
    'Retirement Goal Planner', 'LTCG Tax Calculator'
  ],
  authors: [{ name: 'Vision Wealth AI' }],
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Vision Wealth',
    startupImage: '/icons/icon-512.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Vision Wealth',
    title: 'Vision Wealth | Advanced SIP & CAGR Compounding Calculator',
    description: 'The most accurate wealth planner for Indian equity investors. Calculate Step-Up SIP, CAGR growth, and retirement goals with inflation and tax adjustments.',
    url: SITE_URL,
    images: [{ url: `${SITE_URL}/og-default.png`, width: 1200, height: 630, alt: 'Vision Wealth' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@VisionWealth',
    title: 'Vision Wealth | Advanced SIP & CAGR Compounding Calculator',
    description: 'The most accurate wealth planner for Indian equity investors.',
    images: [`${SITE_URL}/og-default.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="canonical" href="https://worth-calculator.netlify.app/" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var d=s?s==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
        {/* Advanced JSON-LD for AEO & GEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify([
              {
                "@context": "https://schema.org",
                "@type": "FinancialCalculator",
                "name": "Vision Wealth: Multibagger Compounding Planner",
                "description": "Advanced financial tool to calculate Step-Up SIP, CAGR growth, and inflation-adjusted wealth for stock market investors.",
                "url": "https://worth-calculator.netlify.app/",
                "category": "Investment Calculator"
              },
              {
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "Worth Calculator",
                "operatingSystem": "All",
                "applicationCategory": "FinanceApplication",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                }
              },
              {
                "@context": "https://schema.org",
                "@type": "FAQPage",
                "mainEntity": [
                  {
                    "@type": "Question",
                    "name": "How to calculate CAGR for stock investments?",
                    "acceptedAnswer": {
                      "@type": "Answer",
                      "text": "Growth can be calculated using the formula: Final Value = Initial * (1 + CAGR)^n. This dashboard automates this for high-growth equity portfolios."
                    }
                  }
                ]
              }
            ]),
          }}
        />
      </head>
      <body className={`${outfit.className} antialiased bg-slate-50 dark:bg-slate-950 overflow-x-hidden`} suppressHydrationWarning>
        {/* PRODUCTION READY: Add your Google Analytics Tag here */}
        {/* <Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX" /> */}
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
