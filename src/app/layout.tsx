import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

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

import Link from 'next/link';

const Nav = () => (
  <nav className="sticky top-4 z-50 flex justify-center px-4">
    <div className="flex items-center gap-6 px-6 py-3 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-slate-200 dark:border-slate-800 shadow-lg">
      <Link href="/" className="text-sm font-bold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">Vision Wealth</Link>
      <div className="h-4 w-px bg-slate-300 dark:bg-slate-700"></div>
      <Link href="/about" className="text-xs font-medium hover:text-blue-500 transition-colors">About</Link>
      <Link href="/faq" className="text-xs font-medium hover:text-blue-500 transition-colors">FAQ</Link>
      <Link href="/blog" className="text-xs font-medium hover:text-blue-500 transition-colors">Blog</Link>
      <Link href="/watchlist" className="text-xs font-medium hover:text-blue-500 transition-colors">Watchlist</Link>
      <Link href="/chart" className="text-xs font-medium hover:text-blue-500 transition-colors">Terminal</Link>
    </div>
  </nav>
);

const Footer = () => (
  <footer className="mt-24 pb-12 border-t border-slate-200 dark:border-slate-800 pt-12">
    <div className="max-w-7xl mx-auto px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
      <div>
        <h4 className="font-bold mb-4">Vision Wealth</h4>
        <p className="text-xs text-slate-500 leading-relaxed">
          Premium financial engineering tools for high-conviction investors. Built for the Indian Equity Market.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <h4 className="font-bold mb-2">Platform</h4>
        <Link href="/about" className="text-xs text-slate-500 hover:text-blue-500">How it works</Link>
        <Link href="/faq" className="text-xs text-slate-500 hover:text-blue-500">Support & FAQ</Link>
        <Link href="/blog" className="text-xs text-slate-500 hover:text-blue-500">Wealth Articles</Link>
      </div>
      <div>
        <h4 className="font-bold mb-4">Domain</h4>
        <p className="text-xs text-slate-500 italic">Operating under dataforger.com</p>
      </div>
    </div>
  </footer>
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
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
      <body className={`${outfit.className} antialiased bg-slate-50 dark:bg-slate-950`}>
        {/* PRODUCTION READY: Add your Google Analytics Tag here */}
        {/* <Script src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX" /> */}
        
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
