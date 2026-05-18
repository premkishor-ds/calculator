import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

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
  metadataBase: new URL('https://dataforger.com'),
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
                "url": "https://visionwealth.netlify.app",
                "category": "Investment Calculator"
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
      </body>
    </html>
  );
}
