"use client";

import React from 'react';
import { Home, AlertCircle } from 'lucide-react';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="p-4 rounded-full bg-red-500/10 mb-6">
        <AlertCircle className="w-12 h-12 text-red-500" />
      </div>
      <h1 className="text-4xl font-bold mb-4">404: Page Not Found</h1>
      <p className="text-slate-500 mb-8 max-w-md">
        The wealth roadmap you are looking for has either moved or doesn&apos;t exist. Let&apos;s get you back to the calculator.
      </p>
      <Link 
        href="/" 
        className="flex items-center gap-2 px-8 py-4 rounded-full bg-blue-500 text-white font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/30"
      >
        <Home className="w-5 h-5" /> Return to Dashboard
      </Link>
    </div>
  );
}
