// "use client" ensures client-side rendering
"use client";

import React, { useState } from 'react';

import { getBackendApiUrl } from '@/lib/backend-config';

interface WatchlistCreateFormProps {
  setWatchlists: React.Dispatch<React.SetStateAction<any[]>>;
  // Called after successful creation to make the new list active
  setSelectedWatchlist: (_name: string) => void;
  // Optional toast helper – if unavailable we fallback to alert()
  showToast?: (_msg: string, _type: 'success' | 'error' | 'info') => void;
}

export default function WatchlistCreateForm({
  setWatchlists,
  setSelectedWatchlist,
  showToast,
}: WatchlistCreateFormProps) {
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanName = newWatchlistName.trim();
    if (!cleanName) return;
    const BACKEND_API_URL = getBackendApiUrl();
    try {
      setCreating(true);
      const res = await fetch(`${BACKEND_API_URL}/watchlists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName }),
      });
      if (res.ok) {
        const data = await res.json();
        setWatchlists(prev => [...prev, data]);
        setSelectedWatchlist(data.name);
        setNewWatchlistName('');
        const toast = showToast || ((msg) => alert(msg));
        toast(`Workspace "${data.name}" created successfully`, 'success');
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to create watchlist');
        const toast = showToast || ((msg) => alert(msg));
        toast(errData.error || 'Failed to create watchlist', 'error');
      }
    } catch {
      const toast = showToast || ((msg) => alert(msg));
      toast('Unexpected error while creating watchlist', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <form onSubmit={handleCreate} className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row gap-2.5">
      <div className="relative flex-1 sm:w-64">
        <input
          type="text"
          maxLength={32}
          placeholder="New workspace name..."
          value={newWatchlistName}
          onChange={e => { setNewWatchlistName(e.target.value); setError(''); }}
          className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl text-xs font-bold text-slate-850 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-655 focus:outline-none focus:border-blue-500"
        />
        {error && (
          <span className="absolute left-1 top-full mt-1 text-[10px] text-red-500 font-bold">{error}</span>
        )}
      </div>
      <button
        type="submit"
        disabled={creating || !newWatchlistName.trim()}
        className="px-4 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white rounded-2xl text-xs font-bold transition-all shadow-md active:scale-[0.98] shrink-0"
      >
        {creating ? 'Creating...' : '+ Create Workspace'}
      </button>
    </form>
  );
}
