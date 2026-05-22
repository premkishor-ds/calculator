export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-3xl">
        📡
      </div>
      <div>
        <h1 className="text-2xl font-extrabold text-white mb-2">You&apos;re Offline</h1>
        <p className="text-slate-400 text-sm max-w-xs leading-relaxed">
          No internet connection. Previously visited pages and cached data are still available.
        </p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <a
          href="/watchlist"
          className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl text-sm font-bold transition-colors"
        >
          Open Watchlist
        </a>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-2xl text-sm font-bold transition-colors"
        >
          Try Again
        </button>
      </div>
      <p className="text-xs text-slate-600 font-medium">Vision Wealth — Works offline with cached data</p>
    </div>
  );
}
