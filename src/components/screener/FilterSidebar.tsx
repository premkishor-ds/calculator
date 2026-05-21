import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Filter, Search, Check } from 'lucide-react';

const FILTER_GROUPS = [
  { 
    id: 'general', label: 'General', 
    filters: ['Company Name', 'Symbol', 'Sector', 'Industry', 'Exchange', 'Market Cap Category', 'Listing Age', 'Business Type']
  },
  { 
    id: 'price', label: 'Price Action', 
    filters: ['Current Price', 'Daily Return', 'Weekly Return', 'Monthly Return', 'Quarterly Return', 'Half-Year Return', 'Yearly Return', '3-Year Return', '5-Year Return', 'CAGR', 'Price Change %', 'Gap Up %', 'Gap Down %', 'Intraday Change %', 'Price vs Open', 'Price vs Close', 'All Time High Distance', 'All Time Low Distance', '52 Week High Distance', '52 Week Low Distance'] 
  },
  { 
    id: 'valuation', label: 'Valuation', 
    filters: ['PE Ratio', 'Forward PE', 'PEG Ratio', 'PB Ratio', 'Price to Sales', 'Price to Cash Flow', 'Price to Free Cash Flow', 'EV', 'EV/EBITDA', 'EV/Sales', 'Enterprise Value', 'Dividend Yield', 'Earnings Yield', 'Reverse DCF', 'Intrinsic Value', 'Graham Number', 'Margin of Safety'] 
  },
  { 
    id: 'profitability', label: 'Profitability', 
    filters: ['ROE', 'ROCE', 'ROA', 'Gross Margin', 'Operating Margin', 'EBITDA Margin', 'Net Margin', 'PAT Margin', 'Return on Invested Capital'] 
  },
  { 
    id: 'growth', label: 'Growth', 
    filters: ['Revenue Growth', 'Revenue CAGR', 'Quarterly Revenue Growth', 'Profit Growth', 'Profit CAGR', 'Quarterly Profit Growth', 'EPS Growth', 'EPS CAGR', 'Book Value Growth', 'Cash Flow Growth', 'Asset Growth'] 
  },
  { 
    id: 'health', label: 'Financial Health', 
    filters: ['Debt to Equity', 'Current Ratio', 'Quick Ratio', 'Interest Coverage Ratio', 'Working Capital', 'Free Cash Flow', 'Operating Cash Flow', 'Cash Conversion Cycle', 'Inventory Days', 'Receivable Days', 'Payable Days', 'Debt Reduction %'] 
  },
  { 
    id: 'shareholding', label: 'Shareholding', 
    filters: ['Promoter Holding %', 'Promoter Holding Change', 'FII Holding %', 'FII Change %', 'DII Holding %', 'DII Change %', 'Mutual Fund Holding %', 'Public Holding %', 'Foreign Holding %', 'Insider Holding %', 'Insider Buying', 'Insider Selling', 'Pledged Shares %'] 
  },
  { 
    id: 'quality', label: 'Quality', 
    filters: ['Piotroski F Score', 'Altman Z Score', 'Beneish M Score', 'Financial Strength Score', 'Value Score', 'Growth Score', 'Quality Score', 'Momentum Score'] 
  },
  { 
    id: 'technical', label: 'Technical Indicators', 
    filters: ['RSI', 'MACD', 'Stochastic RSI', 'ATR', 'ADX', 'CCI', 'Momentum', 'Relative Strength', 'Williams %R', 'VWAP', 'Supertrend', 'Bollinger Bands', 'Ichimoku Cloud', 'Parabolic SAR', 'OBV', 'Money Flow Index', 'Chaikin Money Flow'] 
  },
  { 
    id: 'moving_average', label: 'Moving Average', 
    filters: ['SMA 5', 'SMA 10', 'SMA 20', 'SMA 50', 'SMA 100', 'SMA 200', 'EMA 5', 'EMA 10', 'EMA 20', 'EMA 50', 'EMA 100', 'EMA 200', 'Golden Cross', 'Death Cross', 'Price > 50 DMA', 'Price > 200 DMA'] 
  },
  { 
    id: 'volume', label: 'Volume', 
    filters: ['Volume', 'Average Volume', 'Relative Volume', 'Delivery %', 'Volume Spike', 'Delivery Spike', 'Volume Breakout'] 
  },
  { 
    id: 'patterns', label: 'Chart Patterns', 
    filters: ['Cup and Handle', 'Rounding Bottom', 'Double Bottom', 'Triple Bottom', 'Double Top', 'Triple Top', 'Ascending Triangle', 'Descending Triangle', 'Symmetrical Triangle', 'Bull Flag', 'Bear Flag', 'Pennant', 'Rectangle', 'Channel Breakout', 'Range Breakout', 'Head and Shoulders', 'Inverse Head and Shoulders', 'W Pattern', 'M Pattern'] 
  },
  { 
    id: 'candlestick', label: 'Candlestick Pattern', 
    filters: ['Doji', 'Hammer', 'Inverted Hammer', 'Shooting Star', 'Morning Star', 'Evening Star', 'Bullish Engulfing', 'Bearish Engulfing', 'Harami', 'Marubozu', 'Three White Soldiers', 'Three Black Crows', 'Piercing Line', 'Dark Cloud Cover'] 
  },
];

export const FilterSidebar = () => {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ general: true });
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [activeFilters, setActiveFilters] = useState<string[]>(['Market Cap Category']);

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSearch = (id: string, query: string) => {
    setSearchQueries(prev => ({ ...prev, [id]: query }));
  };

  const toggleFilter = (filterName: string) => {
    setActiveFilters(prev => 
      prev.includes(filterName) 
        ? prev.filter(f => f !== filterName)
        : [...prev, filterName]
    );
  };

  return (
    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white dark:bg-slate-900 z-10">
        <div className="flex items-center gap-2">
           <Filter className="w-5 h-5 text-blue-500" />
           <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
             Active ({activeFilters.length})
           </h2>
        </div>
        <button 
          onClick={() => setActiveFilters([])}
          className="text-xs text-slate-400 hover:text-blue-500 font-semibold transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="mb-4">
         <button className="w-full py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Custom Formula Builder
         </button>
      </div>

      <div className="space-y-2">
        {FILTER_GROUPS.map((group) => {
          const query = searchQueries[group.id] || '';
          const filteredItems = group.filters.filter(f => f.toLowerCase().includes(query.toLowerCase()));
          const activeCount = group.filters.filter(f => activeFilters.includes(f)).length;

          return (
            <div key={group.id} className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <button
                onClick={() => toggleGroup(group.id)}
                className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/30 hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{group.label}</span>
                  {activeCount > 0 ? (
                    <span className="text-[10px] bg-blue-500 px-1.5 py-0.5 rounded-md text-white font-bold">
                      {activeCount} Active
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-md text-slate-500 dark:text-slate-400 font-bold">
                      {group.filters.length}
                    </span>
                  )}
                </div>
                {expandedGroups[group.id] ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>
              
              {expandedGroups[group.id] && (
                <div className="p-3 bg-white dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3 text-xs">
                   <div className="relative">
                      <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder={`Search ${group.label.toLowerCase()}...`}
                        value={query}
                        onChange={(e) => handleSearch(group.id, e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:outline-none focus:border-blue-500 text-slate-700 dark:text-slate-200"
                      />
                   </div>

                   <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col gap-1 pr-1">
                      {filteredItems.length === 0 ? (
                        <div className="text-center py-2 text-slate-400 italic">No filters found</div>
                      ) : (
                        filteredItems.map(filterName => {
                          const isActive = activeFilters.includes(filterName);
                          return (
                            <button 
                              key={filterName}
                              onClick={() => toggleFilter(filterName)}
                              className={`flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                                isActive 
                                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold' 
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                              }`}
                            >
                              <span>{filterName}</span>
                              {isActive && <Check className="w-3.5 h-3.5" />}
                            </button>
                          );
                        })
                      )}
                   </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
