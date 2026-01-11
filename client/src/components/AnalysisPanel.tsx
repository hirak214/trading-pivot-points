import { Bell, TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';
import { formatPrice, formatDateTime, cn, getSignalBgClass, getRSIInterpretation } from '../lib/utils';

interface PivotData {
  datetime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  rsi: number | null;
  atr: number | null;
  ama: number | null;
  upper: number | null;
  lower: number | null;
  pivotHigh: boolean;
  pivotLow: boolean;
  signal: 'Buy' | 'Sell' | 'Hold';
}

interface StockInfo {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  exchange: string;
  regularMarketPrice: number;
}

interface AnalysisPanelProps {
  data: PivotData[];
  stockInfo: StockInfo | null;
  signal: {
    signal: 'Buy' | 'Sell' | 'Hold';
    lastSignal: 'Buy' | 'Sell' | 'Hold';
    lastSignalTime: Date | null;
    lastSignalPrice: number | null;
  } | null;
  isLoading: boolean;
}

export function AnalysisPanel({ data, stockInfo, signal, isLoading }: AnalysisPanelProps) {
  // Safely ensure data is an array
  const safeData = Array.isArray(data) ? data : [];

  // Get latest data point safely
  const latestData = safeData.length > 0
    ? [...safeData].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime())[0]
    : null;

  const rsiValue = latestData?.rsi;
  const rsiInterpretation = rsiValue != null
    ? getRSIInterpretation(rsiValue)
    : { text: 'N/A', color: 'text-slate-400' };

  if (isLoading && !latestData) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-slate-800">
          <h2 className="font-semibold text-slate-100">Analysis</h2>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse space-y-4 w-full p-4">
            <div className="h-20 bg-slate-800 rounded-lg" />
            <div className="h-32 bg-slate-800 rounded-lg" />
            <div className="h-24 bg-slate-800 rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // Safe access to upper and lower bounds
  const upperBound = latestData?.upper;
  const lowerBound = latestData?.lower;
  const hasValidBounds = upperBound != null && lowerBound != null;

  return (
    <div className="h-full flex flex-col overflow-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <h2 className="font-semibold text-slate-100">Analysis</h2>
        {stockInfo && (
          <p className="text-sm text-slate-400 mt-1">{stockInfo.longName}</p>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Current Signal */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-slate-300">Current Signal</span>
          </div>
          <div className="flex items-center justify-between">
            <span
              className={cn(
                'px-4 py-2 rounded-lg text-lg font-bold border',
                getSignalBgClass(signal?.signal ?? 'Hold')
              )}
            >
              {signal?.signal ?? 'Hold'}
            </span>
            {signal?.signal === 'Buy' && <TrendingUp className="w-8 h-8 text-emerald-400" />}
            {signal?.signal === 'Sell' && <TrendingDown className="w-8 h-8 text-red-400" />}
          </div>

          {/* Last Signal Info */}
          {signal?.lastSignalTime && (
            <div className="mt-4 pt-3 border-t border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <Clock className="w-4 h-4" />
                Last {signal.lastSignal} Signal
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">
                  {formatDateTime(signal.lastSignalTime)}
                </span>
                <span className="font-mono text-slate-100">
                  {formatPrice(signal.lastSignalPrice ?? 0, stockInfo?.currency)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* OHLC Data */}
        {latestData && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-300">Latest OHLC</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <span className="text-xs text-slate-500 block">Open</span>
                <span className="font-mono text-slate-100">
                  {formatPrice(latestData.open, stockInfo?.currency)}
                </span>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <span className="text-xs text-slate-500 block">High</span>
                <span className="font-mono text-emerald-400">
                  {formatPrice(latestData.high, stockInfo?.currency)}
                </span>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <span className="text-xs text-slate-500 block">Low</span>
                <span className="font-mono text-red-400">
                  {formatPrice(latestData.low, stockInfo?.currency)}
                </span>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <span className="text-xs text-slate-500 block">Close</span>
                <span className="font-mono text-slate-100">
                  {formatPrice(latestData.close, stockInfo?.currency)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* RSI Indicator */}
        {rsiValue != null && (
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-slate-300">RSI (14)</span>
              </div>
              <span className={cn('text-sm font-medium', rsiInterpretation.color)}>
                {rsiInterpretation.text}
              </span>
            </div>
            <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
              {/* RSI zones */}
              <div className="absolute inset-0 flex">
                <div className="w-[30%] bg-emerald-500/20" />
                <div className="w-[40%] bg-slate-700/50" />
                <div className="w-[30%] bg-red-500/20" />
              </div>
              {/* RSI marker */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white rounded-full shadow-lg transition-all duration-300"
                style={{ left: `${Math.min(100, Math.max(0, rsiValue))}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>0</span>
              <span>30</span>
              <span>50</span>
              <span>70</span>
              <span>100</span>
            </div>
            <div className="text-center mt-2">
              <span className="text-2xl font-bold text-slate-100">{rsiValue.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* ATR Indicator */}
        {latestData?.atr != null && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-300">ATR (14)</span>
            </div>
            <div className="text-xl font-bold text-slate-100">
              {formatPrice(latestData.atr, stockInfo?.currency)}
            </div>
            <p className="text-xs text-slate-500 mt-1">Average True Range - Volatility indicator</p>
          </div>
        )}

        {/* Trendline Bounds */}
        {hasValidBounds && latestData && (
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-300">Trendline Bounds</span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-orange-500 rounded" />
                  Upper Bound
                </span>
                <span className="font-mono text-orange-400">
                  {formatPrice(upperBound, stockInfo?.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400 flex items-center gap-2">
                  <div className="w-3 h-0.5 bg-blue-500 rounded" />
                  Lower Bound
                </span>
                <span className="font-mono text-blue-400">
                  {formatPrice(lowerBound, stockInfo?.currency)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-slate-700">
                <span className="text-slate-400">Current Price</span>
                <span className="font-mono text-slate-100">
                  {formatPrice(latestData.close, stockInfo?.currency)}
                </span>
              </div>
              <div className="text-xs text-slate-500">
                {latestData.close > upperBound && (
                  <span className="text-emerald-400">Price is above upper bound (Bullish)</span>
                )}
                {latestData.close < lowerBound && (
                  <span className="text-red-400">Price is below lower bound (Bearish)</span>
                )}
                {latestData.close >= lowerBound && latestData.close <= upperBound && (
                  <span className="text-yellow-400">Price is within bounds (Consolidating)</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Alerts Section */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-300">Price Alerts</span>
            </div>
          </div>
          <button className="w-full py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors flex items-center justify-center gap-2">
            <Bell className="w-4 h-4" />
            Set Alert
          </button>
          <p className="text-xs text-slate-500 mt-2 text-center">
            Get notified when price crosses your target
          </p>
        </div>
      </div>
    </div>
  );
}
