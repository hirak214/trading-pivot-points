import { z } from 'zod';

// Stock data types
export interface OHLCData {
  datetime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PivotData extends OHLCData {
  rsi: number | null;
  atr: number | null;
  ama: number | null;
  upper: number | null;
  lower: number | null;
  pivotHigh: boolean;
  pivotLow: boolean;
  signal: 'Buy' | 'Sell' | 'Hold';
  upos: number;
  dnos: number;
}

export interface StockInfo {
  symbol: string;
  shortName: string;
  longName: string;
  currency: string;
  exchange: string;
  marketState: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketVolume: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketOpen: number;
  regularMarketPreviousClose: number;
}

export interface WatchlistItem {
  id: number;
  userId: number;
  ticker: string;
  addedAt: Date;
  currentPrice?: number;
  signal?: 'Buy' | 'Sell' | 'Hold';
  rsi?: number;
  currency?: string;
}

export interface Alert {
  id: number;
  userId: number;
  ticker: string;
  priceLevel: number;
  direction: 'above' | 'below';
  triggered: boolean;
  createdAt: Date;
  triggeredAt?: Date;
}

// Zod schemas for validation
export const tickerSchema = z.string().min(1).max(20).regex(/^[A-Z0-9\^.\-=]+$/i, 'Invalid ticker symbol');

export const periodSchema = z.enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max']);

export const intervalSchema = z.enum(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo']);

export const stockQuerySchema = z.object({
  ticker: tickerSchema,
  period: periodSchema.default('5d'),
  interval: intervalSchema.default('15m'),
});

export const alertSchema = z.object({
  ticker: tickerSchema,
  priceLevel: z.number().positive(),
  direction: z.enum(['above', 'below']),
});

export type StockQuery = z.infer<typeof stockQuerySchema>;
export type AlertInput = z.infer<typeof alertSchema>;

// Chart types
export type ChartType = 'candlestick' | 'line' | 'area';

export interface ChartSettings {
  showVolume: boolean;
  showPivotPoints: boolean;
  showBounds: boolean;
  showRSI: boolean;
  chartType: ChartType;
}

// Currency symbols mapping
export const currencySymbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  JPY: '¥',
  INR: '₹',
  CNY: '¥',
  KRW: '₩',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF',
  HKD: 'HK$',
  SGD: 'S$',
  BTC: '₿',
  ETH: 'Ξ',
};

export function getCurrencySymbol(currency: string): string {
  return currencySymbols[currency?.toUpperCase()] || currency || '$';
}

// Signal colors
export const signalColors = {
  Buy: '#10b981',
  Sell: '#ef4444',
  Hold: '#eab308',
} as const;

// Default tickers
export const defaultTickers = ['^NSEI', 'AAPL', 'BTC-USD'];
