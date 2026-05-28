import React, { useState, useCallback } from 'react';
import { getBackendApiUrl } from '@/lib/backend-config';
import { DEFAULT_SEEDS } from '@/utils/symbols';

interface LogEntry {
  timestamp: string;
  message: string;
  success: boolean;
}

export default function WatchlistTest() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [running, setRunning] = useState(false);

  const addLog = useCallback((msg: string, success = true) => {
    setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message: msg, success }]);
  }, []);

  const runTest = async () => {
    setRunning(true);
    setLogs([]);
    const BACKEND_API_URL = getBackendApiUrl();
    try {
      // 1. Create 5 watchlists
      const watchlistNames = Array.from({ length: 5 }, (_, i) => `TestWL${i + 1}`);
      for (const name of watchlistNames) {
        const res = await fetch(`${BACKEND_API_URL}/watchlists`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        if (res.ok) {
          addLog(`Created watchlist ${name}`);
        } else {
          const err = await res.json();
          addLog(`Failed to create watchlist ${name}: ${err.error || 'unknown'}`, false);
        }
      }

      // 2. Add random stocks to each watchlist (3 stocks each)
      for (const name of watchlistNames) {
        const randomStocks = Array.from({ length: 3 }, () => DEFAULT_SEEDS[Math.floor(Math.random() * DEFAULT_SEEDS.length)]);
        for (const stock of randomStocks) {
          const res = await fetch(`${BACKEND_API_URL}/stocks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symbol: stock.symbol, name: stock.name, isFavourite: false, watchlist: name })
          });
          if (res.ok) {
            addLog(`Added ${stock.symbol} to ${name}`);
          } else {
            const err = await res.json();
            addLog(`Failed to add ${stock.symbol} to ${name}: ${err.error || 'unknown'}`, false);
          }
        }
      }

      // 3. Verify watchlists exist
      const wlRes = await fetch(`${BACKEND_API_URL}/watchlists`);
      if (wlRes.ok) {
        const wls = await wlRes.json();
        const missing = watchlistNames.filter(n => !wls.find((w: any) => w.name === n));
        if (missing.length === 0) {
          addLog('All created watchlists verified');
        } else {
          addLog(`Missing watchlists after verification: ${missing.join(', ')}`, false);
        }
      } else {
        addLog('Failed to fetch watchlists for verification', false);
      }

      // 4. Verify stocks per watchlist
      for (const name of watchlistNames) {
        const res = await fetch(`${BACKEND_API_URL}/stocks?watchlist=${encodeURIComponent(name)}`);
        if (res.ok) {
          const stocks = await res.json();
          if (stocks.length >= 3) {
            addLog(`Watchlist ${name} has ${stocks.length} stocks as expected`);
          } else {
            addLog(`Watchlist ${name} has insufficient stocks (${stocks.length})`, false);
          }
        } else {
          addLog(`Failed to fetch stocks for ${name}`, false);
        }
      }

      // 5. Toggle favourite on first stock of first watchlist
      const firstWL = watchlistNames[0];
      const stocksRes = await fetch(`${BACKEND_API_URL}/stocks?watchlist=${encodeURIComponent(firstWL)}`);
      if (stocksRes.ok) {
        const stocks = await stocksRes.json();
        const target = stocks[0];
        if (target) {
          const patchRes = await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(target.symbol)}?watchlist=${encodeURIComponent(firstWL)}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isFavourite: true })
          });
          if (patchRes.ok) {
            addLog(`Toggled favourite for ${target.symbol} in ${firstWL}`);
          } else {
            const err = await patchRes.json();
            addLog(`Failed to toggle favourite: ${err.error || 'unknown'}`, false);
          }
        } else {
          addLog('No stock found to toggle favourite', false);
        }
      } else {
        addLog('Failed to retrieve stocks for favourite toggle', false);
      }

      // 6. Delete a stock from second watchlist
      const secondWL = watchlistNames[1];
      const stRes = await fetch(`${BACKEND_API_URL}/stocks?watchlist=${encodeURIComponent(secondWL)}`);
      if (stRes.ok) {
        const stocks = await stRes.json();
        const toDelete = stocks[0];
        if (toDelete) {
          const delRes = await fetch(`${BACKEND_API_URL}/stocks/${encodeURIComponent(toDelete.symbol)}?watchlist=${encodeURIComponent(secondWL)}`, {
            method: 'DELETE'
          });
          if (delRes.ok) {
            addLog(`Deleted stock ${toDelete.symbol} from ${secondWL}`);
          } else {
            const err = await delRes.json();
            addLog(`Failed to delete stock: ${err.error || 'unknown'}`, false);
          }
        } else {
          addLog('No stock to delete in second watchlist', false);
        }
      } else {
        addLog('Failed to fetch stocks for deletion', false);
      }

      // 7. Delete all five watchlists
      for (const name of watchlistNames) {
        const delRes = await fetch(`${BACKEND_API_URL}/watchlists/${encodeURIComponent(name)}`, { method: 'DELETE' });
        if (delRes.ok) {
          addLog(`Deleted watchlist ${name}`);
        } else {
          const err = await delRes.json();
          addLog(`Failed to delete watchlist ${name}: ${err.error || 'unknown'}`, false);
        }
      }

      // 8. Final verification that watchlists are gone
      const finalRes = await fetch(`${BACKEND_API_URL}/watchlists`);
      if (finalRes.ok) {
        const finalWls = await finalRes.json();
        const stillExists = watchlistNames.filter(n => finalWls.find((w: any) => w.name === n));
        if (stillExists.length === 0) {
          addLog('All test watchlists successfully removed');
        } else {
          addLog(`Some watchlists still present: ${stillExists.join(', ')}`, false);
        }
      } else {
        addLog('Failed to verify final watchlist state', false);
      }
    } catch (err) {
      addLog(`Unexpected error: ${(err as any).message || err}`, false);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="my-6 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg shadow">
      <button
        onClick={runTest}
        disabled={running}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
      >
        {running ? 'Running Test...' : 'Run Watchlist CRUD Test'}
      </button>
      <div className="mt-4 max-h-64 overflow-y-auto text-sm">
        {logs.map((l, i) => (
          <div key={i} className={l.success ? 'text-green-600' : 'text-red-600'}>
            [{l.timestamp}] {l.message}
          </div>
        ))}
      </div>
    </div>
  );
}
