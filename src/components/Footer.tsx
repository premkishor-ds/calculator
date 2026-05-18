import Link from 'next/link';

export const Footer = () => (
  <footer className="mt-16 sm:mt-24 pb-8 sm:pb-12 border-t border-slate-200 dark:border-slate-800 pt-10 sm:pt-12 safe-bottom">
    <div className="max-w-7xl mx-auto px-4 sm:px-8 grid grid-cols-1 md:grid-cols-3 gap-8 sm:gap-12">
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
