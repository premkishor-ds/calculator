import { RefreshCw } from 'lucide-react';

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center gap-4 transition-colors duration-300 font-sans">
      {/* Dynamic pulse background glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none animate-pulse" />
      
      {/* Floating glassmorphic card container */}
      <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-slate-800/80 p-8 shadow-2xl flex flex-col items-center gap-4 animate-pulse max-w-sm w-full mx-4">
        <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <div className="text-center">
          <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-1">
            Loading Vision Intelligence
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Synthesizing global stock market algorithms...
          </p>
        </div>
      </div>
    </div>
  );
}
