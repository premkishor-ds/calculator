'use client';

import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { formatINR } from '@/utils/calculations';
import type { ChartDataPoint } from './WealthVisuals';

interface Props {
  chartData: ChartDataPoint[];
  theme: 'dark' | 'light';
}

export default function WealthChartInner({ chartData, theme }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <AreaChart data={chartData}>
        <defs>
          <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorInvested" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#1e293b' : '#e2e8f0'} vertical={false} />
        <XAxis dataKey="year" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} />
        <YAxis stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${(Number(v) / 10000000).toFixed(1)}Cr`} />
        <Tooltip contentStyle={{ backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '10px' }} formatter={(v) => formatINR(Number(v) || 0)} />
        <Area type="monotone" dataKey="balance" name="Nominal" stroke="#06b6d4" fillOpacity={1} fill="url(#colorBalance)" strokeWidth={3} />
        <Area type="monotone" dataKey="realValue" name="Inflation Adj." stroke="#f97316" fillOpacity={1} fill="transparent" strokeWidth={2} strokeDasharray="4 4" />
        <Area type="monotone" dataKey="invested" name="Invested" stroke="#3b82f6" strokeDasharray="5 5" fillOpacity={1} fill="url(#colorInvested)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
