"use client";

import React, { useState } from 'react';
import { FilterSidebar } from '@/components/screener/FilterSidebar';
import { ResultsTable } from '@/components/screener/ResultsTable';
import { ResultsCards } from '@/components/screener/ResultsCards';
import { Search, LayoutGrid, List, X } from 'lucide-react';

export default function ScreenerPage() {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<string[]>(['Market Cap Category']);

  const handleToggleFilter = (filterName: string) => {
    setActiveFilters(prev => 
      prev.includes(filterName) 
        ? prev.filter(f => f !== filterName)
        : [...prev, filterName]
    );
  };

  const handleClearAll = () => {
    setActiveFilters([]);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300 font-sans pb-20">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 max-w-[1800px] mx-auto">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent tracking-tight">
              Advanced Screener
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 font-medium">
              Professional-grade stock screening platform. Combine technicals, fundamentals, options, and patterns.
            </p>
          </div>
          <div className="flex gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
               <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
               <input
                 type="text"
                 placeholder="Quick search..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
               />
             </div>
             <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
               <button
                 onClick={() => setViewMode('table')}
                 className={`p-1.5 rounded-lg ${viewMode === 'table' ? 'bg-slate-100 dark:bg-slate-800 text-blue-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
               >
                 <List className="w-4 h-4" />
               </button>
               <button
                 onClick={() => setViewMode('cards')}
                 className={`p-1.5 rounded-lg ${viewMode === 'cards' ? 'bg-slate-100 dark:bg-slate-800 text-blue-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
               >
                 <LayoutGrid className="w-4 h-4" />
               </button>
             </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full lg:w-80 shrink-0">
            <FilterSidebar 
              activeFilters={activeFilters}
              onToggleFilter={handleToggleFilter}
              onClearAll={handleClearAll}
            />
          </div>

          {/* Results Area */}
          <div className="flex-1 bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4">
               <div className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  Showing <span className="text-blue-500">2,451</span> matching stocks
               </div>
               <button className="px-4 py-2 bg-blue-500 text-white rounded-xl text-xs font-bold hover:bg-blue-600 shadow-md">
                 Save Screen
               </button>
            </div>

            {/* Active Filters Display */}
            {activeFilters.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2 items-center p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                 <span className="text-xs font-bold text-slate-500 mr-2 uppercase tracking-wider">Applied Filters:</span>
                 {activeFilters.map(filter => (
                   <div key={filter} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm group">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{filter}</span>
                      <button 
                        onClick={() => handleToggleFilter(filter)}
                        className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                   </div>
                 ))}
              </div>
            )}
            
            {viewMode === 'table' ? <ResultsTable /> : <ResultsCards />}
          </div>
        </div>

      </div>
    </div>
  );
}
