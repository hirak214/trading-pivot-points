import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPrice(value: number, currency: string = 'USD'): string {
  const symbols: Record<string, string> = {
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

  const symbol = symbols[currency?.toUpperCase()] || currency || '$';
  const decimals = ['JPY', 'KRW'].includes(currency?.toUpperCase()) ? 0 : 2;

  return `${symbol}${formatNumber(value, decimals)}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getSignalColor(signal: 'Buy' | 'Sell' | 'Hold'): string {
  switch (signal) {
    case 'Buy':
      return '#10b981';
    case 'Sell':
      return '#ef4444';
    case 'Hold':
      return '#eab308';
    default:
      return '#94a3b8';
  }
}

export function getSignalBgClass(signal: 'Buy' | 'Sell' | 'Hold'): string {
  switch (signal) {
    case 'Buy':
      return 'signal-buy';
    case 'Sell':
      return 'signal-sell';
    case 'Hold':
      return 'signal-hold';
    default:
      return '';
  }
}

export function getRSIInterpretation(rsi: number | null): { text: string; color: string } {
  if (rsi === null) return { text: 'N/A', color: 'text-slate-400' };
  if (rsi >= 70) return { text: 'Overbought', color: 'text-red-400' };
  if (rsi >= 60) return { text: 'Strong', color: 'text-emerald-400' };
  if (rsi >= 40) return { text: 'Neutral', color: 'text-slate-400' };
  if (rsi >= 30) return { text: 'Weak', color: 'text-yellow-400' };
  return { text: 'Oversold', color: 'text-emerald-400' };
}
