import yahooFinance from 'yahoo-finance2';
import type { OHLCData, StockInfo } from '@shared/types';

// Configure yahoo-finance2 to suppress validation warnings
yahooFinance.setGlobalConfig({
  validation: {
    logErrors: false,
    logOptionsErrors: false,
  },
});

type Period = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max';
type Interval = '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo';

/**
 * Fetch historical stock data from Yahoo Finance
 */
export async function getHistoricalData(
  ticker: string,
  period: Period = '5d',
  interval: Interval = '15m'
): Promise<OHLCData[]> {
  try {
    const result = await yahooFinance.chart(ticker.toUpperCase(), {
      period1: getPeriodStartDate(period),
      interval: interval,
    });

    if (!result || !result.quotes || result.quotes.length === 0) {
      throw new Error(`No data found for ticker: ${ticker}`);
    }

    return result.quotes
      .filter((quote) => quote.open !== null && quote.high !== null && quote.low !== null && quote.close !== null)
      .map((quote) => ({
        datetime: new Date(quote.date),
        open: quote.open!,
        high: quote.high!,
        low: quote.low!,
        close: quote.close!,
        volume: quote.volume ?? 0,
      }));
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    throw new Error(`Failed to fetch data for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get stock info and quote from Yahoo Finance
 */
export async function getStockInfo(ticker: string): Promise<StockInfo> {
  try {
    const quote = await yahooFinance.quote(ticker.toUpperCase());

    if (!quote) {
      throw new Error(`No quote data found for ticker: ${ticker}`);
    }

    return {
      symbol: quote.symbol ?? ticker,
      shortName: quote.shortName ?? ticker,
      longName: quote.longName ?? quote.shortName ?? ticker,
      currency: quote.currency ?? 'USD',
      exchange: quote.exchange ?? '',
      marketState: quote.marketState ?? 'CLOSED',
      regularMarketPrice: quote.regularMarketPrice ?? 0,
      regularMarketChange: quote.regularMarketChange ?? 0,
      regularMarketChangePercent: quote.regularMarketChangePercent ?? 0,
      regularMarketVolume: quote.regularMarketVolume ?? 0,
      regularMarketDayHigh: quote.regularMarketDayHigh ?? 0,
      regularMarketDayLow: quote.regularMarketDayLow ?? 0,
      regularMarketOpen: quote.regularMarketOpen ?? 0,
      regularMarketPreviousClose: quote.regularMarketPreviousClose ?? 0,
    };
  } catch (error) {
    console.error(`Error fetching info for ${ticker}:`, error);
    throw new Error(`Failed to fetch info for ${ticker}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search for stock symbols
 */
export async function searchSymbols(query: string): Promise<{ symbol: string; name: string; exchange: string }[]> {
  try {
    const results = await yahooFinance.search(query, {
      quotesCount: 10,
      newsCount: 0,
    });

    return (results.quotes ?? [])
      .filter((q): q is typeof q & { symbol: string; shortname?: string; exchange?: string } =>
        'symbol' in q && typeof q.symbol === 'string' && q.symbol.length > 0
      )
      .map((q) => ({
        symbol: q.symbol,
        name: q.shortname ?? q.symbol,
        exchange: q.exchange ?? '',
      }));
  } catch (error) {
    console.error(`Error searching for ${query}:`, error);
    return [];
  }
}

/**
 * Get real-time quote for multiple tickers
 */
export async function getMultipleQuotes(
  tickers: string[]
): Promise<Map<string, { price: number; change: number; changePercent: number; currency: string }>> {
  const result = new Map<string, { price: number; change: number; changePercent: number; currency: string }>();

  try {
    const quotes = await Promise.all(
      tickers.map(async (ticker) => {
        try {
          const quote = await yahooFinance.quote(ticker.toUpperCase());
          return {
            ticker: ticker.toUpperCase(),
            price: quote?.regularMarketPrice ?? 0,
            change: quote?.regularMarketChange ?? 0,
            changePercent: quote?.regularMarketChangePercent ?? 0,
            currency: quote?.currency ?? 'USD',
          };
        } catch {
          return null;
        }
      })
    );

    quotes.forEach((quote) => {
      if (quote) {
        result.set(quote.ticker, {
          price: quote.price,
          change: quote.change,
          changePercent: quote.changePercent,
          currency: quote.currency,
        });
      }
    });
  } catch (error) {
    console.error('Error fetching multiple quotes:', error);
  }

  return result;
}

/**
 * Convert period string to start date
 */
function getPeriodStartDate(period: Period): Date {
  const now = new Date();
  switch (period) {
    case '1d':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '5d':
      return new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    case '1mo':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '3mo':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case '6mo':
      return new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
    case '1y':
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    case '2y':
      return new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
    case '5y':
      return new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
    case 'max':
      return new Date('1970-01-01');
    default:
      return new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
  }
}
