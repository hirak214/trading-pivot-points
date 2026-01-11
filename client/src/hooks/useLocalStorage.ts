import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // Get initial value from localStorage or use default
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Update localStorage when value changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Wrapper to set value
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => (typeof value === 'function' ? (value as (prev: T) => T)(prev) : value));
  }, []);

  return [storedValue, setValue];
}

// Hook for search history
export function useSearchHistory() {
  const [history, setHistory] = useLocalStorage<string[]>('searchHistory', []);

  const addToHistory = useCallback(
    (ticker: string) => {
      setHistory((prev) => {
        const filtered = prev.filter((t) => t !== ticker.toUpperCase());
        return [ticker.toUpperCase(), ...filtered].slice(0, 10);
      });
    },
    [setHistory]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, [setHistory]);

  return { history, addToHistory, clearHistory };
}

// Hook for favorites
export function useFavorites() {
  const [favorites, setFavorites] = useLocalStorage<string[]>('favorites', []);

  const addFavorite = useCallback(
    (ticker: string) => {
      setFavorites((prev) => {
        if (prev.includes(ticker.toUpperCase())) return prev;
        return [...prev, ticker.toUpperCase()];
      });
    },
    [setFavorites]
  );

  const removeFavorite = useCallback(
    (ticker: string) => {
      setFavorites((prev) => prev.filter((t) => t !== ticker.toUpperCase()));
    },
    [setFavorites]
  );

  const isFavorite = useCallback(
    (ticker: string) => {
      return favorites.includes(ticker.toUpperCase());
    },
    [favorites]
  );

  const toggleFavorite = useCallback(
    (ticker: string) => {
      if (isFavorite(ticker)) {
        removeFavorite(ticker);
      } else {
        addFavorite(ticker);
      }
    },
    [isFavorite, addFavorite, removeFavorite]
  );

  return { favorites, addFavorite, removeFavorite, isFavorite, toggleFavorite };
}

// Hook for chart settings
export interface ChartSettings {
  showVolume: boolean;
  showPivotPoints: boolean;
  showBounds: boolean;
  showRSI: boolean;
  chartType: 'candlestick' | 'line' | 'area';
}

const defaultChartSettings: ChartSettings = {
  showVolume: true,
  showPivotPoints: true,
  showBounds: true,
  showRSI: false,
  chartType: 'candlestick',
};

export function useChartSettings() {
  const [settings, setSettings] = useLocalStorage<ChartSettings>('chartSettings', defaultChartSettings);

  const updateSettings = useCallback(
    (updates: Partial<ChartSettings>) => {
      setSettings((prev) => ({ ...prev, ...updates }));
    },
    [setSettings]
  );

  const resetSettings = useCallback(() => {
    setSettings(defaultChartSettings);
  }, [setSettings]);

  return { settings, updateSettings, resetSettings };
}
