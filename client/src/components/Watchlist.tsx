import { Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { trpc } from '../lib/trpc';
import { formatPrice, formatPercent, cn, getSignalBgClass } from '../lib/utils';

interface WatchlistProps {
  onSelectTicker: (ticker: string) => void;
  selectedTicker: string;
}

export function Watchlist({ onSelectTicker, selectedTicker }: WatchlistProps) {
  const { data: watchlistData, isLoading } = trpc.watchlist.getAll.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const addMutation = trpc.watchlist.add.useMutation();
  const removeMutation = trpc.watchlist.remove.useMutation();

  const handleRemove = (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeMutation.mutate({ ticker });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-100">Watchlist</h2>
          <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Watchlist Items */}
      <div className="flex-1 overflow-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 bg-slate-800/50 rounded-lg animate-pulse">
                <div className="h-4 bg-slate-700 rounded w-1/2 mb-2" />
                <div className="h-5 bg-slate-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {watchlistData?.map((item) => (
              <button
                key={item.ticker}
                onClick={() => onSelectTicker(item.ticker)}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-all duration-200',
                  selectedTicker === item.ticker
                    ? 'bg-blue-600/20 border border-blue-500/30'
                    : 'bg-slate-800/30 hover:bg-slate-800/70 border border-transparent'
                )}
              >
                {/* Ticker and Signal */}
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-100">{item.ticker}</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium border',
                      getSignalBgClass(item.signal)
                    )}
                  >
                    {item.signal}
                  </span>
                </div>

                {/* Price and Change */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-slate-100">
                    {formatPrice(item.currentPrice, item.currency)}
                  </span>
                  <div
                    className={cn(
                      'flex items-center gap-1 text-sm',
                      item.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                    )}
                  >
                    {item.change >= 0 ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {formatPercent(item.changePercent)}
                  </div>
                </div>

                {/* RSI */}
                {item.rsi !== null && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-slate-500">RSI</span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          item.rsi >= 70 ? 'bg-red-500' : item.rsi <= 30 ? 'bg-emerald-500' : 'bg-blue-500'
                        )}
                        style={{ width: `${item.rsi}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 w-8">{item.rsi.toFixed(0)}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800">
        <p className="text-xs text-slate-500 text-center">
          Auto-refresh: 30s
        </p>
      </div>
    </div>
  );
}
