'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowRight, Sparkles, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    try {
      setError(null);
      setMessage(null);
      setSubmitting(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error('Failed to generate reset request');
      const data = await res.json();
      setMessage(data.message || 'Verification email generated. If the account exists, a reset link will be sent.');
    } catch (err: any) {
      setError(err.message || 'An error occurred while requesting password reset');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="max-w-md w-full space-y-8 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xl relative overflow-hidden">
        
        {/* Decorative dynamic glows */}
        <div className="absolute -top-10 -left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="text-center relative">
          <div className="inline-flex p-3 bg-blue-500/10 rounded-2xl text-blue-500 border border-blue-500/20 mb-4">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Reset Password
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold">
            Provide your email address to receive a secure recovery code.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold px-4 py-3 rounded-2xl">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold px-4 py-3 rounded-2xl">
            {message}
          </div>
        )}

        {!message && (
          <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-4 text-xs font-bold text-slate-400">
              <div>
                <label className="block uppercase mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="name@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 pl-10 pr-4 py-3 rounded-xl outline-none focus:border-blue-500 text-slate-800 dark:text-slate-200"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:opacity-95 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
            >
              {submitting ? 'Generating link...' : 'Send Recovery Code'} <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        <div className="text-center mt-6">
          <Link href="/login" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-blue-500 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to login
          </Link>
        </div>

      </div>
    </div>
  );
}
