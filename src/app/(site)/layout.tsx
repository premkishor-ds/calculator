'use client';

import dynamic from 'next/dynamic';

import { Footer } from '@/components/Footer';

const Navigation = dynamic(() => import('@/components/Navigation').then(mod => mod.Navigation), {
  ssr: false
});

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navigation />
      {children}
      <Footer />
    </>
  );
}
