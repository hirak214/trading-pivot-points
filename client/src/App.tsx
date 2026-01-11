import { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { Watchlist } from './components/Watchlist';
import { ChartPanel } from './components/ChartPanel';
import { AnalysisPanel } from './components/AnalysisPanel';
import { DataTable } from './components/DataTable';
import { trpc } from './lib/trpc';
import { useSearchHistory, useFavorites, useChartSettings } from './hooks/useLocalStorage';

export default function App() {
  const [selectedTicker, setSelectedTicker] = useState('^NSEI');
  const [period, setPeriod] = useState<'1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y'>('5d');
  const [interval, setInterval] = useState<'1m' | '5m' | '15m' | '1h' | '1d'>('15m');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

  const { history, addToHistory } = useSearchHistory();
  const { favorites, toggleFavorite, isFavorite } = useFavorites();
  const { settings, updateSettings } = useChartSettings();

  // Fetch pivot analysis data
  const { data: analysisData, isLoading, error, refetch } = trpc.stock.getPivotAnalysis.useQuery(
    { ticker: selectedTicker, period, interval },
    { refetchInterval: 60000 } // Refresh every minute
  );

  const handleTickerSelect = useCallback(
    (ticker: string) => {
      setSelectedTicker(ticker.toUpperCase());
      addToHistory(ticker);
    },
    [addToHistory]
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <Header
        selectedTicker={selectedTicker}
        onTickerSelect={handleTickerSelect}
        onRefresh={handleRefresh}
        isLoading={isLoading}
        history={history}
        favorites={favorites}
        isFavorite={isFavorite}
        toggleFavorite={toggleFavorite}
        leftSidebarOpen={leftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen}
        onToggleLeftSidebar={() => setLeftSidebarOpen(!leftSidebarOpen)}
        onToggleRightSidebar={() => setRightSidebarOpen(!rightSidebarOpen)}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Watchlist */}
        <aside
          className={`${
            leftSidebarOpen ? 'w-64 xl:w-72' : 'w-0'
          } transition-all duration-300 overflow-hidden border-r border-slate-800 bg-slate-900/50 flex-shrink-0 hidden md:block`}
        >
          <Watchlist onSelectTicker={handleTickerSelect} selectedTicker={selectedTicker} />
        </aside>

        {/* Main Chart Area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Chart Controls */}
          <div className="flex items-center gap-2 p-3 border-b border-slate-800 bg-slate-900/30 flex-wrap">
            {/* Period Selector */}
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
              {(['1d', '5d', '1mo', '3mo', '6mo', '1y'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    period === p
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {p.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Interval Selector */}
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-1">
              {(['1m', '5m', '15m', '1h', '1d'] as const).map((i) => (
                <button
                  key={i}
                  onClick={() => setInterval(i)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    interval === i
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {i.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Chart Settings */}
            <div className="flex items-center gap-2 ml-auto">
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showVolume}
                  onChange={(e) => updateSettings({ showVolume: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                Volume
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showBounds}
                  onChange={(e) => updateSettings({ showBounds: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                Trendlines
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.showPivotPoints}
                  onChange={(e) => updateSettings({ showPivotPoints: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                />
                Pivots
              </label>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 p-4 overflow-hidden">
            <ChartPanel
              data={analysisData?.data ?? []}
              stockInfo={analysisData?.stockInfo ?? null}
              isLoading={isLoading}
              error={error?.message}
              settings={settings}
            />
          </div>

          {/* Data Table */}
          <div className="h-64 lg:h-80 border-t border-slate-800 overflow-hidden">
            <DataTable data={analysisData?.data ?? []} isLoading={isLoading} currency={analysisData?.stockInfo?.currency} />
          </div>
        </main>

        {/* Right Sidebar - Analysis */}
        <aside
          className={`${
            rightSidebarOpen ? 'w-72 xl:w-80' : 'w-0'
          } transition-all duration-300 overflow-hidden border-l border-slate-800 bg-slate-900/50 flex-shrink-0 hidden lg:block`}
        >
          <AnalysisPanel
            data={analysisData?.data ?? []}
            stockInfo={analysisData?.stockInfo ?? null}
            signal={analysisData?.signal ?? null}
            isLoading={isLoading}
          />
        </aside>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 p-2 flex justify-around">
        <button
          onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
          className="flex flex-col items-center gap-1 text-xs text-slate-400 hover:text-white p-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          Watchlist
        </button>
        <button
          onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
          className="flex flex-col items-center gap-1 text-xs text-slate-400 hover:text-white p-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analysis
        </button>
      </div>
    </div>
  );
}
