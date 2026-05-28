"use client";

import React, { useState } from 'react';
import { Plus, X, Pencil, Check } from 'lucide-react';
import type { WatchlistItem } from '@/hooks/useWatchlistStore';

interface WatchlistSwitcherProps {
  watchlists: WatchlistItem[];
  selectedWatchlist: string;
  onSelect: (name: string) => void;
  onCreate: (name: string) => Promise<{ ok: boolean; error?: string }>;
  onRename: (oldName: string, newName: string) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (name: string) => Promise<boolean>;
}

/**
 * Horizontal watchlist tabs with inline create, rename, and delete.
 */
export default function WatchlistSwitcher({
  watchlists,
  selectedWatchlist,
  onSelect,
  onCreate,
  onRename,
  onDelete,
}: WatchlistSwitcherProps) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [editingWl, setEditingWl] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setError('');
    const result = await onCreate(newName);
    if (result.ok) {
      setNewName('');
    } else {
      setError(result.error || 'Error');
    }
  };

  const handleRename = async (oldName: string) => {
    if (!editName.trim() || editName.trim() === oldName) {
      setEditingWl(null);
      return;
    }
    const result = await onRename(oldName, editName);
    if (result.ok) {
      setEditingWl(null);
    } else {
      setError(result.error || 'Error');
    }
  };

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Delete watchlist "${name}" and all its stocks?`)) return;
    await onDelete(name);
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-150 dark:border-slate-800/80">
      <div className="flex justify-between items-center mb-2">
        <label className="text-[9px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
          Active Workspace
        </label>
        <form onSubmit={handleCreate} className="flex gap-1 items-center">
          <input
            type="text"
            placeholder="+ New…"
            value={newName}
            onChange={e => { setNewName(e.target.value); setError(''); }}
            className="w-20 px-2 py-1 bg-white dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-lg text-[9px] font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-blue-500/40 transition-all"
          />
          {newName.trim() && (
            <button
              type="submit"
              className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-[9px] font-bold transition-colors shadow-sm"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </form>
      </div>

      {error && <p className="text-[8px] text-red-500 font-extrabold mb-1.5">{error}</p>}

      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin">
        {watchlists.map(wl => {
          const active = selectedWatchlist === wl.name;
          const isDefault = wl.isDefault || wl.name === 'default';
          const isEditing = editingWl === wl.name;

          return (
            <div
              key={wl.name}
              onClick={() => { if (!isEditing) onSelect(wl.name); }}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-bold border transition-all select-none group/wl ${
                isEditing ? 'ring-2 ring-blue-500/30' : 'cursor-pointer'
              } ${
                active
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-655 dark:text-blue-400 font-black shadow-sm'
                  : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {isEditing ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); handleRename(wl.name); }}
                  className="flex items-center gap-1"
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-20 px-1 py-0.5 bg-white dark:bg-slate-950 border border-blue-400 rounded text-[9px] font-bold focus:outline-none"
                    autoFocus
                    onBlur={() => handleRename(wl.name)}
                    onKeyDown={e => { if (e.key === 'Escape') setEditingWl(null); }}
                  />
                  <button type="submit" className="text-blue-500 hover:text-blue-700">
                    <Check className="w-3 h-3" />
                  </button>
                </form>
              ) : (
                <>
                  <span className="truncate max-w-[80px]">
                    {isDefault ? '🏛️ Default' : wl.name}
                  </span>
                  {!isDefault && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/wl:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingWl(wl.name);
                          setEditName(wl.name);
                          setError('');
                        }}
                        className="text-slate-400 hover:text-blue-500 transition-colors"
                        title="Rename"
                      >
                        <Pencil className="w-2.5 h-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(wl.name, e)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Delete"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
