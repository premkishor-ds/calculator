'use client';

import React from 'react';
import { 
Area,   AreaChart, CartesianGrid, Tooltip, 
XAxis, YAxis} from 'recharts';

import { formatINR } from '@/utils/calculations';

interface ChartDataPoint {
  name: string;
  year: string;
  balance: number;
  realValue: number;
  invested: number;
  afterTax?: number;
}

interface Props {
  chartData: ChartDataPoint[];
  theme: 'dark' | 'light';
  chartMode: 'growth' | 'tax' | 'inflation' | 'yearly';
}

export default function WealthChartInner({ chartData, theme, chartMode }: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const rect = entries[0].contentRect;
      setDimensions({ width: rect.width, height: rect.height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full min-h-[300px]">
      {dimensions.width > 0 && dimensions.height > 0 && (
        <AreaChart width={dimensions.width} height={dimensions.height} data={chartData}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorAfterTax" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorYearly" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} vertical={false} />
          <XAxis dataKey="year" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} />
          <YAxis 
            stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(v) => {
              const num = Number(v);
              if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
              if (num >= 100000) return `₹${(num / 100000).toFixed(0)}L`;
              return `₹${num}`;
            }} 
          />
          
          <Tooltip 
            contentStyle={{ 
              backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
              border: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`, 
              borderRadius: '12px', 
              fontSize: '10px' 
            }} 
            formatter={(v) => formatINR(Number(v) || 0)} 
          />

          {chartMode === 'growth' && (
            <>
              <Area type="monotone" dataKey="balance" name="Nominal Corpus" stroke="#06b6d4" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={3} />
              <Area type="monotone" dataKey="invested" name="Invested Capital" stroke="#3b82f6" fillOpacity={1} fill="url(#colorInvested)" strokeWidth={2} strokeDasharray="5 5" />
            </>
          )}

          {chartMode === 'tax' && (
            <>
              <Area type="monotone" dataKey="balance" name="Before-Tax Corpus" stroke="#06b6d4" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="afterTax" name="Post-Tax Corpus (12.5% LTCG)" stroke="#ef4444" fillOpacity={1} fill="url(#colorAfterTax)" strokeWidth={3} />
            </>
          )}

          {chartMode === 'inflation' && (
            <>
              <Area type="monotone" dataKey="balance" name="Nominal Corpus" stroke="#06b6d4" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={2} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="realValue" name="Real Purchasing Power" stroke="#f97316" fillOpacity={1} fill="transparent" strokeWidth={3} />
            </>
          )}

          {chartMode === 'yearly' && (
            <Area type="monotone" dataKey="balance" name="Yearly Growth Portfolio" stroke="#6366f1" fillOpacity={1} fill="url(#colorYearly)" strokeWidth={3} />
          )}
        </AreaChart>
      )}
    </div>
  );
}
