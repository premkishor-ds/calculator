'use client';

import React from 'react';
import { Cell, Pie, PieChart, Tooltip } from 'recharts';

import { formatINR } from '@/utils/calculations';

interface Props {
  invested: number;
  gains: number;
  theme: 'dark' | 'light';
}

export default function CapitalCompositionInner({ invested, gains, theme }: Props) {
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

  const data = [
    { name: 'Invested Capital', value: invested, color: '#3b82f6' },
    { name: 'Est. Capital Gains', value: gains, color: '#10b981' }
  ];

  const total = invested + gains;

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center relative min-h-[220px]">
      {dimensions.width > 0 && (
        <PieChart width={dimensions.width} height={220}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={85}
            paddingAngle={4}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', 
              border: `1px solid ${theme === 'dark' ? '#1e293b' : '#e2e8f0'}`, 
              borderRadius: '12px', 
              fontSize: '10px' 
            }} 
            formatter={(v) => formatINR(Number(v))} 
          />
        </PieChart>
      )}
      
      {/* Center Label inside Donut */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-[-10px]">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Est. Wealth</span>
        <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">{formatINR(total)}</span>
      </div>

      {/* Legend */}
      <div className="flex gap-4 justify-center mt-3 text-xs font-semibold">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-slate-600 dark:text-slate-350">Invested ({((invested / total) * 100).toFixed(0)}%)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span className="text-slate-600 dark:text-slate-350">Gains ({((gains / total) * 100).toFixed(0)}%)</span>
        </div>
      </div>
    </div>
  );
}
