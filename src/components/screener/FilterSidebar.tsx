import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Filter } from 'lucide-react';

const FILTER_GROUPS = [
  { id: 'general', label: 'General', count: 8 },
  { id: 'price', label: 'Price Action', count: 12 },
  { id: 'valuation', label: 'Valuation', count: 15 },
  { id: 'profitability', label: 'Profitability', count: 9 },
  { id: 'growth', label: 'Growth', count: 11 },
  { id: 'health', label: 'Financial Health', count: 12 },
  { id: 'technical', label: 'Technical Indicators', count: 17 },
  { id: 'patterns', label: 'Chart Patterns', count: 19 },
];

export const FilterSidebar = () => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ general: true });

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm sticky top-24">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
           <Filter className="w-5 h-5 text-blue-500" />
           <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">Active Filters</h2>
        </div>
        <button className="text-xs text-slate-400 hover:text-blue-500 font-semibold transition-colors">
          Clear All
        </button>
      </div>

      <div className="mb-4">
         <button className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Custom Formula Builder
         </button>
      </div>

      <div className="space-y-2">
        {FILTER_GROUPS.map((group) => (
          <div key={group.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{group.label}</span>
                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-md text-slate-500 dark:text-slate-400 font-bold">
                  {group.count}
                </span>
              </div>
              {expandedGroups[group.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            
            {expandedGroups[group.id] && (
              <div className="p-3 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                 {/* Placeholder for dynamic filter inputs */}
                 <div className="p-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-lg text-center">
                    Select filters to add...
                 </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
