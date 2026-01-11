import { useState, useRef, useEffect } from 'react';
import { Search, RefreshCw, Star, X, Menu, PanelLeftClose, PanelRightClose, History, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';

interface HeaderProps {
  selectedTicker: string;
  onTickerSelect: (ticker: string) => void;
  onRefresh: () => void;
  isLoading: boolean;
  history: string[];
  favorites: string[];
  isFavorite: (ticker: string) => boolean;
  toggleFavorite: (ticker: string) => void;
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  onToggleLeftSidebar: () => void;
  onToggleRightSidebar: () => void;
}

const quickAccessTickers = ['^NSEI', 'AAPL', 'GOOGL', 'BTC-USD', 'ETH-USD', 'EURUSD=X'];

export function Header({
  selectedTicker,
  onTickerSelect,
  onRefresh,
  isLoading,
  history,
  favorites,
  isFavorite,
  toggleFavorite,
  leftSidebarOpen,
  rightSidebarOpen,
  onToggleLeftSidebar,
  onToggleRightSidebar,
}: HeaderProps) {
  const [searchValue, setSearchValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      onTickerSelect(searchValue.trim());
      setSearchValue('');
      setShowDropdown(false);
    }
  };

  const handleSelect = (ticker: string) => {
    onTickerSelect(ticker);
    setSearchValue('');
    setShowDropdown(false);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-4 py-3">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-blue-500" />
          <span className="font-semibold text-lg hidden sm:block">TradePivot</span>
        </div>

        {/* Sidebar Toggles */}
        <button
          onClick={onToggleLeftSidebar}
          className={cn(
            'p-2 rounded-lg transition-colors hidden md:flex',
            leftSidebarOpen ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          )}
          title="Toggle Watchlist"
        >
          <PanelLeftClose className="w-5 h-5" />
        </button>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xl" ref={dropdownRef}>
          <form onSubmit={handleSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search ticker (e.g., AAPL, ^NSEI, BTC-USD)"
              className="w-full pl-10 pr-20 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => setSearchValue('')}
                className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={() => toggleFavorite(selectedTicker)}
              className={cn(
                'absolute right-3 top-1/2 -translate-y-1/2 p-1 transition-colors',
                isFavorite(selectedTicker) ? 'text-yellow-400' : 'text-slate-400 hover:text-yellow-400'
              )}
              title={isFavorite(selectedTicker) ? 'Remove from favorites' : 'Add to favorites'}
            >
              <Star className="w-5 h-5" fill={isFavorite(selectedTicker) ? 'currentColor' : 'none'} />
            </button>
          </form>

          {/* Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-80 overflow-auto">
              {/* Quick Access */}
              <div className="p-2 border-b border-slate-700">
                <div className="text-xs font-medium text-slate-500 px-2 py-1">Quick Access</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {quickAccessTickers.map((ticker) => (
                    <button
                      key={ticker}
                      onClick={() => handleSelect(ticker)}
                      className={cn(
                        'px-2 py-1 text-xs rounded-md transition-colors',
                        ticker === selectedTicker
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      )}
                    >
                      {ticker}
                    </button>
                  ))}
                </div>
              </div>

              {/* Favorites */}
              {favorites.length > 0 && (
                <div className="p-2 border-b border-slate-700">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 px-2 py-1">
                    <Star className="w-3 h-3" />
                    Favorites
                  </div>
                  {favorites.map((ticker) => (
                    <button
                      key={ticker}
                      onClick={() => handleSelect(ticker)}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 rounded flex items-center justify-between"
                    >
                      {ticker}
                      <Star className="w-4 h-4 text-yellow-400" fill="currentColor" />
                    </button>
                  ))}
                </div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="p-2">
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500 px-2 py-1">
                    <History className="w-3 h-3" />
                    Recent
                  </div>
                  {history.slice(0, 5).map((ticker) => (
                    <button
                      key={ticker}
                      onClick={() => handleSelect(ticker)}
                      className="w-full px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 rounded"
                    >
                      {ticker}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Current Ticker Display */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
          <span className="text-slate-400 text-sm">Viewing:</span>
          <span className="font-semibold text-blue-400">{selectedTicker}</span>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className={cn(
            'p-2 rounded-lg transition-colors',
            isLoading
              ? 'text-slate-600 cursor-not-allowed'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          )}
          title="Refresh Data"
        >
          <RefreshCw className={cn('w-5 h-5', isLoading && 'animate-spin')} />
        </button>

        {/* Right Sidebar Toggle */}
        <button
          onClick={onToggleRightSidebar}
          className={cn(
            'p-2 rounded-lg transition-colors hidden lg:flex',
            rightSidebarOpen ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
          )}
          title="Toggle Analysis Panel"
        >
          <PanelRightClose className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
