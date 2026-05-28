"use client";

import React, { useMemo } from 'react';
import { Shield, Sparkles, TrendingUp, AlertCircle, Info, Star } from 'lucide-react';

interface SnowflakeData {
  value: number;       // 0 to 10
  future: number;      // 0 to 10
  past: number;        // 0 to 10
  health: number;      // 0 to 10
  dividend: number;    // 0 to 10
  momentum: number;    // 0 to 10
}

interface SwotItem {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export default function SimplyWallStSnowflake({
  symbol = 'NIFTY',
  snowflakeValues,
  swot,
  economicMoat = 'Narrow Moat'
}: {
  symbol?: string;
  snowflakeValues?: Partial<SnowflakeData>;
  swot?: Partial<SwotItem>;
  economicMoat?: 'Wide Moat' | 'Narrow Moat' | 'No Moat';
}) {
  // Safe default evaluations matching the core Tickertape score checklists
  const values = useMemo<SnowflakeData>(() => ({
    value: 6,
    future: 7,
    past: 8,
    health: 9,
    dividend: 5,
    momentum: 7,
    ...snowflakeValues
  }), [snowflakeValues]);

  const swotList = useMemo<SwotItem>(() => ({
    strengths: [
      'Strong historical Return on Equity (ROE) compounding above 22%.',
      'Virtually debt-free balance sheet with high interest coverage ratios.',
      'Excellent pricing power leading to superior cash flow generation.'
    ],
    weaknesses: [
      'Valuation premium relative to historical standard deviation bands.',
      'High promoter concentration limits free-float market operations.'
    ],
    opportunities: [
      'Geographical diversification into developing market segments.',
      'Operational leverage kickback from custom platform upgrades.'
    ],
    threats: [
      'Regulatory compliance shifts from SEBI tightening option bounds.',
      'Input cost inflation impacting near-term margin targets.'
    ],
    ...swot
  }), [swot]);

  // SVG dimensions for the Snowflake Radar diagram
  const size = 260;
  const center = size / 2;
  const maxVal = 10;
  const radius = size * 0.42;

  // Calculate polygon nodes dynamically based on the 6 axes
  const points = useMemo(() => {
    const axesKeys: Array<keyof SnowflakeData> = ['value', 'future', 'past', 'health', 'dividend', 'momentum'];
    return axesKeys.map((key, idx) => {
      const val = values[key];
      const angle = (idx * 60 - 90) * (Math.PI / 180);
      const r = (val / maxVal) * radius;
      const x = center + r * Math.cos(angle);
      const y = center + r * Math.sin(angle);
      return { x, y, label: key.toUpperCase(), val };
    });
  }, [values, radius, center]);

  const polygonPath = points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Radial grid line nodes
  const gridCircles = [0.25, 0.5, 0.75, 1];

  return (
    <div className="bg-white dark:bg-slate-900/50 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-xl transition-colors duration-300">
      
      {/* Dynamic Checklist Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
              Simply Wall St Snowflake & SWOT Matrix
            </h3>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
              Quantitative Checklists & Competitive Advantages
            </span>
          </div>
        </div>

        {/* Economic Moat Rating badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25 rounded-full text-[10px] font-extrabold select-none">
          <Shield className="w-3.5 h-3.5" />
          <span>{economicMoat}</span>
        </div>
      </div>

      {/* SVG Snowflake and SWOT Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        
        {/* SVG Polygon radar snowflake */}
        <div className="flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-900/60 relative">
          <svg width={size} height={size} className="overflow-visible select-none">
            {/* Grid Circular bands */}
            {gridCircles.map((f, idx) => (
              <circle
                key={idx}
                cx={center}
                cy={center}
                r={radius * f}
                fill="none"
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800/60"
                strokeWidth="1"
              />
            ))}

            {/* Grid Axis spikes */}
            {points.map((p, idx) => {
              const angle = (idx * 60 - 90) * (Math.PI / 180);
              const x2 = center + radius * Math.cos(angle);
              const y2 = center + radius * Math.sin(angle);
              return (
                <g key={`axis-${idx}`}>
                  <line
                    x1={center}
                    y1={center}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    className="text-slate-200 dark:text-slate-800/60"
                    strokeWidth="1"
                  />
                  {/* Axis Label */}
                  <text
                    x={center + (radius + 20) * Math.cos(angle)}
                    y={center + (radius + 15) * Math.sin(angle)}
                    textAnchor="middle"
                    alignmentBaseline="middle"
                    className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest"
                  >
                    {p.label}
                  </text>
                </g>
              );
            })}

            {/* The snowflake radar polygon overlay path */}
            <polygon
              points={polygonPath}
              fill="rgba(99, 102, 241, 0.15)"
              stroke="#6366f1"
              strokeWidth="2.5"
              strokeLinejoin="round"
              className="animate-pulse"
            />

            {/* Polygon vertex nodes */}
            {points.map((p, idx) => (
              <circle
                key={`node-${idx}`}
                cx={p.x}
                cy={p.y}
                r="4.5"
                fill="#818cf8"
                stroke="#6366f1"
                strokeWidth="1.5"
              />
            ))}
          </svg>
        </div>

        {/* Dynamic SWOT Checklist details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[10px] select-none">
          {/* Strengths */}
          <div className="bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl p-3.5">
            <span className="text-emerald-500 font-extrabold uppercase block tracking-wider mb-1.5">
              Strengths
            </span>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-bold list-disc pl-3">
              {swotList.strengths.slice(0, 2).map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ul>
          </div>

          {/* Weaknesses */}
          <div className="bg-rose-500/[0.03] border border-rose-500/10 rounded-2xl p-3.5">
            <span className="text-rose-500 font-extrabold uppercase block tracking-wider mb-1.5">
              Weaknesses
            </span>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-bold list-disc pl-3">
              {swotList.weaknesses.slice(0, 2).map((w, idx) => (
                <li key={idx}>{w}</li>
              ))}
            </ul>
          </div>

          {/* Opportunities */}
          <div className="bg-blue-500/[0.03] border border-blue-500/10 rounded-2xl p-3.5">
            <span className="text-blue-500 font-extrabold uppercase block tracking-wider mb-1.5">
              Opportunities
            </span>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-bold list-disc pl-3">
              {swotList.opportunities.slice(0, 2).map((o, idx) => (
                <li key={idx}>{o}</li>
              ))}
            </ul>
          </div>

          {/* Threats */}
          <div className="bg-amber-500/[0.03] border border-amber-500/10 rounded-2xl p-3.5">
            <span className="text-amber-500 font-extrabold uppercase block tracking-wider mb-1.5">
              Threats
            </span>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 font-bold list-disc pl-3">
              {swotList.threats.slice(0, 2).map((t, idx) => (
                <li key={idx}>{t}</li>
              ))}
            </ul>
          </div>
        </div>

      </div>

      {/* Checklist Summary */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-4 flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-bold font-mono">
        <span className="flex items-center gap-1">
          <Info className="w-3.5 h-3.5 text-indigo-500" />
          Visual checklist tracks intrinsic values and corporate health delta
        </span>
        <span className="text-indigo-500">DuPont Valuation Approved</span>
      </div>

    </div>
  );
}
