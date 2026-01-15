import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initTRPC, TRPCError } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { z } from 'zod';
import yahooFinance from 'yahoo-finance2';

// ============================================================================
// TYPES
// ============================================================================

interface OHLCData {
  datetime: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface PivotData extends OHLCData {
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

interface StockInfo {
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

const tickerSchema = z.string().min(1).max(20).regex(/^[A-Z0-9\^.\-=]+$/i, 'Invalid ticker symbol');
const periodSchema = z.enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max']);
const intervalSchema = z.enum(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo']);

const stockQuerySchema = z.object({
  ticker: tickerSchema,
  period: periodSchema.default('5d'),
  interval: intervalSchema.default('15m'),
});

const alertSchema = z.object({
  ticker: tickerSchema,
  priceLevel: z.number().positive(),
  direction: z.enum(['above', 'below']),
});

type Period = z.infer<typeof periodSchema>;
type Interval = z.infer<typeof intervalSchema>;

// ============================================================================
// YAHOO FINANCE SERVICE
// ============================================================================

yahooFinance.setGlobalConfig({
  validation: { logErrors: false, logOptionsErrors: false },
});

function getPeriodStartDate(period: Period): Date {
  const now = new Date();
  const ms = {
    '1d': 24 * 60 * 60 * 1000,
    '5d': 5 * 24 * 60 * 60 * 1000,
    '1mo': 30 * 24 * 60 * 60 * 1000,
    '3mo': 90 * 24 * 60 * 60 * 1000,
    '6mo': 180 * 24 * 60 * 60 * 1000,
    '1y': 365 * 24 * 60 * 60 * 1000,
    '2y': 2 * 365 * 24 * 60 * 60 * 1000,
    '5y': 5 * 365 * 24 * 60 * 60 * 1000,
    'max': Date.now() - new Date('1970-01-01').getTime(),
  };
  return new Date(now.getTime() - (ms[period] || ms['5d']));
}

async function getHistoricalData(ticker: string, period: Period = '5d', interval: Interval = '15m'): Promise<OHLCData[]> {
  const result = await yahooFinance.chart(ticker.toUpperCase(), {
    period1: getPeriodStartDate(period),
    interval: interval,
  });

  if (!result?.quotes?.length) {
    throw new Error(`No data found for ticker: ${ticker}`);
  }

  return result.quotes
    .filter((q) => q.open != null && q.high != null && q.low != null && q.close != null)
    .map((q) => ({
      datetime: new Date(q.date),
      open: q.open!,
      high: q.high!,
      low: q.low!,
      close: q.close!,
      volume: q.volume ?? 0,
    }));
}

async function getStockInfo(ticker: string): Promise<StockInfo> {
  const quote = await yahooFinance.quote(ticker.toUpperCase());
  if (!quote) throw new Error(`No quote data found for ticker: ${ticker}`);

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
}

async function searchSymbols(query: string): Promise<{ symbol: string; name: string; exchange: string }[]> {
  try {
    const results = await yahooFinance.search(query, { quotesCount: 10, newsCount: 0 });
    return (results.quotes ?? [])
      .filter((q): q is typeof q & { symbol: string } => 'symbol' in q && typeof q.symbol === 'string')
      .map((q) => ({
        symbol: q.symbol,
        name: ('shortname' in q ? q.shortname : q.symbol) as string,
        exchange: ('exchange' in q ? q.exchange : '') as string,
      }));
  } catch {
    return [];
  }
}

async function getMultipleQuotes(tickers: string[]): Promise<Map<string, { price: number; change: number; changePercent: number; currency: string }>> {
  const result = new Map<string, { price: number; change: number; changePercent: number; currency: string }>();
  await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const quote = await yahooFinance.quote(ticker.toUpperCase());
        if (quote) {
          result.set(ticker.toUpperCase(), {
            price: quote.regularMarketPrice ?? 0,
            change: quote.regularMarketChange ?? 0,
            changePercent: quote.regularMarketChangePercent ?? 0,
            currency: quote.currency ?? 'USD',
          });
        }
      } catch { /* ignore */ }
    })
  );
  return result;
}

// ============================================================================
// PIVOT CALCULATOR (Trading strategy - DO NOT MODIFY)
// ============================================================================

function calculateRSI(closes: number[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return rsi;

  let gains: number[] = [], losses: number[] = [];
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = gains.reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
  }
  return rsi;
}

function calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): (number | null)[] {
  const atr: (number | null)[] = new Array(highs.length).fill(null);
  const trueRanges: number[] = [];

  for (let i = 0; i < highs.length; i++) {
    if (i === 0) trueRanges.push(highs[i] - lows[i]);
    else {
      const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
      trueRanges.push(tr);
    }
  }

  for (let i = period - 1; i < highs.length; i++) {
    if (i === period - 1) atr[i] = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    else atr[i] = ((atr[i - 1]! * (period - 1)) + trueRanges[i]) / period;
  }
  return atr;
}

function calculateAMA(closes: number[], window: number = 14, fastFactor: number = 2.0, slowFactor: number = 30.0): (number | null)[] {
  const ama: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < window) return ama;

  const pctChanges: number[] = [0];
  for (let i = 1; i < closes.length; i++) pctChanges.push((closes[i] - closes[i - 1]) / closes[i - 1]);

  const volatility: number[] = new Array(closes.length).fill(0);
  for (let i = window - 1; i < closes.length; i++) {
    const slice = pctChanges.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    volatility[i] = Math.sqrt(slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length);
  }

  const fastMult = 2 / (fastFactor * window + 1);
  const slowMult = 2 / (slowFactor * window + 1);
  const fastEma: number[] = [closes[0]], slowEma: number[] = [closes[0]];

  for (let i = 1; i < closes.length; i++) {
    fastEma.push(closes[i] * fastMult + fastEma[i - 1] * (1 - fastMult));
    slowEma.push(closes[i] * slowMult + slowEma[i - 1] * (1 - slowMult));
  }

  const amaMult = 2 / (window + 1);
  let prevAma = fastEma[0] + volatility[0] * (closes[0] - slowEma[0]);
  for (let i = 0; i < closes.length; i++) {
    prevAma = (fastEma[i] + volatility[i] * (closes[i] - slowEma[i])) * amaMult + prevAma * (1 - amaMult);
    ama[i] = prevAma;
  }
  return ama;
}

function calculatePivotPoints(data: OHLCData[], length: number = 14): { pivotHigh: boolean[]; pivotLow: boolean[] } {
  const pivotHigh: boolean[] = new Array(data.length).fill(false);
  const pivotLow: boolean[] = new Array(data.length).fill(false);

  for (let i = length; i < data.length - length; i++) {
    let isHigh = true, isLow = true;
    for (let j = i - length; j < i; j++) {
      if (data[j].high >= data[i].high) isHigh = false;
      if (data[j].low <= data[i].low) isLow = false;
    }
    for (let j = i + 1; j <= i + length && (isHigh || isLow); j++) {
      if (data[j].high >= data[i].high) isHigh = false;
      if (data[j].low <= data[i].low) isLow = false;
    }
    pivotHigh[i] = isHigh;
    pivotLow[i] = isLow;
  }
  return { pivotHigh, pivotLow };
}

function calculatePivotData(ohlcData: OHLCData[]): PivotData[] {
  if (ohlcData.length < 30) {
    return ohlcData.map((d) => ({ ...d, rsi: null, atr: null, ama: null, upper: null, lower: null, pivotHigh: false, pivotLow: false, signal: 'Hold' as const, upos: 0, dnos: 0 }));
  }

  const closes = ohlcData.map((d) => d.close);
  const highs = ohlcData.map((d) => d.high);
  const lows = ohlcData.map((d) => d.low);

  const rsi = calculateRSI(closes, 14);
  const atr = calculateATR(highs, lows, closes, 14);
  const ama = calculateAMA(closes, 14, 2.0, 30.0);
  const { pivotHigh, pivotLow } = calculatePivotPoints(ohlcData, 14);

  const phVal: (number | null)[] = new Array(ohlcData.length).fill(null);
  const plVal: (number | null)[] = new Array(ohlcData.length).fill(null);
  const slopePh: number[] = new Array(ohlcData.length).fill(0);
  const slopePl: number[] = new Array(ohlcData.length).fill(0);
  const upper: (number | null)[] = new Array(ohlcData.length).fill(null);
  const lower: (number | null)[] = new Array(ohlcData.length).fill(null);
  const upos: number[] = new Array(ohlcData.length).fill(0);
  const dnos: number[] = new Array(ohlcData.length).fill(0);

  const slope: number[] = ohlcData.map((_, i) => (atr[i] !== null ? atr[i]! / 14 : 0));
  slopePh[0] = slope[0]; slopePl[0] = slope[0];

  for (let i = 1; i < ohlcData.length; i++) {
    if (pivotHigh[i]) { phVal[i] = highs[i]; slopePh[i] = slope[i]; }
    else { phVal[i] = phVal[i - 1]; slopePh[i] = slopePh[i - 1]; }
    if (pivotLow[i]) { plVal[i] = lows[i]; slopePl[i] = slope[i]; }
    else { plVal[i] = plVal[i - 1]; slopePl[i] = slopePl[i - 1]; }
  }

  for (let i = 0; i < ohlcData.length; i++) {
    if (i === 0) { upper[i] = highs[i]; lower[i] = lows[i]; }
    else {
      upper[i] = pivotHigh[i] ? highs[i] : (upper[i - 1] ?? highs[i]) - slopePh[i];
      lower[i] = pivotLow[i] ? lows[i] : (lower[i - 1] ?? lows[i]) + slopePl[i];
    }
  }

  for (let i = 1; i < ohlcData.length; i++) {
    if (!pivotHigh[i] && upper[i - 1] !== null && closes[i] > upper[i - 1]!) upos[i] = 1;
    if (!pivotLow[i] && lower[i - 1] !== null && closes[i] < lower[i - 1]!) dnos[i] = 1;
  }

  const signals: ('Buy' | 'Sell' | 'Hold')[] = new Array(ohlcData.length).fill('Hold');
  for (let i = 1; i < ohlcData.length; i++) {
    if (upos[i] > upos[i - 1]) signals[i] = 'Buy';
    else if (dnos[i] > dnos[i - 1]) signals[i] = 'Sell';
  }
  for (let i = 1; i < ohlcData.length; i++) {
    if (signals[i] === 'Buy' && rsi[i] !== null && rsi[i]! > 70) signals[i] = 'Hold';
    else if (signals[i] === 'Sell' && rsi[i] !== null && rsi[i]! < 30) signals[i] = 'Hold';
  }

  return ohlcData.map((d, i) => ({ ...d, rsi: rsi[i], atr: atr[i], ama: ama[i], upper: upper[i], lower: lower[i], pivotHigh: pivotHigh[i], pivotLow: pivotLow[i], signal: signals[i], upos: upos[i], dnos: dnos[i] }));
}

function getLatestSignal(pivotData: PivotData[]): { signal: 'Buy' | 'Sell' | 'Hold'; lastSignal: 'Buy' | 'Sell' | 'Hold'; lastSignalTime: Date | null; lastSignalPrice: number | null } {
  if (pivotData.length === 0) return { signal: 'Hold', lastSignal: 'Hold', lastSignalTime: null, lastSignalPrice: null };
  const sorted = [...pivotData].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  const lastNonHold = sorted.find((d) => d.signal !== 'Hold');
  return { signal: sorted[0].signal, lastSignal: lastNonHold?.signal ?? 'Hold', lastSignalTime: lastNonHold?.datetime ?? null, lastSignalPrice: lastNonHold?.close ?? null };
}

// ============================================================================
// TRPC ROUTER
// ============================================================================

interface Context { userId?: number; }

function createContext(req: Request): Context {
  const userId = parseInt(req.headers.get('x-user-id') || '1') || 1;
  return { userId: isNaN(userId) ? 1 : userId };
}

const t = initTRPC.context<Context>().create({ transformer: superjson, errorFormatter: ({ shape }) => shape });
const router = t.router;
const publicProcedure = t.procedure;
const protectedProcedure = t.procedure.use(t.middleware(({ next, ctx }) => {
  if (!ctx.userId) throw new TRPCError({ code: 'UNAUTHORIZED' });
  return next({ ctx: { userId: ctx.userId } });
}));

// In-memory stores
const watchlistStore = new Map<number, Set<string>>();
const alertStore = new Map<number, { id: number; ticker: string; priceLevel: number; direction: 'above' | 'below'; triggered: boolean; createdAt: Date }[]>();
const favoritesStore = new Map<number, Set<string>>();
const searchHistoryStore = new Map<number, { ticker: string; searchedAt: Date }[]>();
let alertIdCounter = 1;

const stockRouter = router({
  getHistoricalData: publicProcedure.input(stockQuerySchema).query(async ({ input }) => getHistoricalData(input.ticker, input.period, input.interval)),
  getPivotAnalysis: publicProcedure.input(stockQuerySchema).query(async ({ input }) => {
    const ohlcData = await getHistoricalData(input.ticker, input.period, input.interval);
    const pivotData = calculatePivotData(ohlcData);
    let stockInfo = null;
    try { stockInfo = await getStockInfo(input.ticker); } catch { /* ignore */ }
    return { data: pivotData, signal: getLatestSignal(pivotData), stockInfo };
  }),
  getStockInfo: publicProcedure.input(z.object({ ticker: z.string() })).query(async ({ input }) => getStockInfo(input.ticker)),
  search: publicProcedure.input(z.object({ query: z.string().min(1) })).query(async ({ input }) => searchSymbols(input.query)),
  getQuotes: publicProcedure.input(z.object({ tickers: z.array(z.string()) })).query(async ({ input }) => Object.fromEntries(await getMultipleQuotes(input.tickers))),
});

const watchlistRouter = router({
  add: protectedProcedure.input(z.object({ ticker: z.string() })).mutation(async ({ input, ctx }) => {
    if (!watchlistStore.has(ctx.userId!)) watchlistStore.set(ctx.userId!, new Set());
    watchlistStore.get(ctx.userId!)!.add(input.ticker.toUpperCase());
    return { success: true, ticker: input.ticker.toUpperCase() };
  }),
  remove: protectedProcedure.input(z.object({ ticker: z.string() })).mutation(async ({ input, ctx }) => {
    watchlistStore.get(ctx.userId!)?.delete(input.ticker.toUpperCase());
    return { success: true };
  }),
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const tickers = Array.from(watchlistStore.get(ctx.userId!) ?? new Set(['^NSEI', 'AAPL', 'BTC-USD']));
    const quotes = await getMultipleQuotes(tickers);
    return Promise.all(tickers.map(async (ticker) => {
      try {
        const ohlcData = await getHistoricalData(ticker, '5d', '15m');
        const pivotData = calculatePivotData(ohlcData);
        const quote = quotes.get(ticker);
        return { ticker, currentPrice: quote?.price ?? pivotData[pivotData.length - 1]?.close ?? 0, signal: getLatestSignal(pivotData).signal, rsi: pivotData[pivotData.length - 1]?.rsi ?? null, currency: quote?.currency ?? 'USD', change: quote?.change ?? 0, changePercent: quote?.changePercent ?? 0 };
      } catch { return { ticker, currentPrice: 0, signal: 'Hold' as const, rsi: null, currency: 'USD', change: 0, changePercent: 0 }; }
    }));
  }),
});

const alertsRouter = router({
  create: protectedProcedure.input(alertSchema).mutation(async ({ input, ctx }) => {
    if (!alertStore.has(ctx.userId!)) alertStore.set(ctx.userId!, []);
    const alert = { id: alertIdCounter++, ticker: input.ticker.toUpperCase(), priceLevel: input.priceLevel, direction: input.direction, triggered: false, createdAt: new Date() };
    alertStore.get(ctx.userId!)!.push(alert);
    return alert;
  }),
  getActive: protectedProcedure.query(async ({ ctx }) => alertStore.get(ctx.userId!)?.filter((a) => !a.triggered) ?? []),
  dismiss: protectedProcedure.input(z.object({ alertId: z.number() })).mutation(async ({ input, ctx }) => {
    const alerts = alertStore.get(ctx.userId!);
    const idx = alerts?.findIndex((a) => a.id === input.alertId) ?? -1;
    if (idx !== -1) alerts![idx].triggered = true;
    return { success: true };
  }),
  delete: protectedProcedure.input(z.object({ alertId: z.number() })).mutation(async ({ input, ctx }) => {
    const alerts = alertStore.get(ctx.userId!);
    const idx = alerts?.findIndex((a) => a.id === input.alertId) ?? -1;
    if (idx !== -1) alerts!.splice(idx, 1);
    return { success: true };
  }),
});

const favoritesRouter = router({
  add: protectedProcedure.input(z.object({ ticker: z.string() })).mutation(async ({ input, ctx }) => {
    if (!favoritesStore.has(ctx.userId!)) favoritesStore.set(ctx.userId!, new Set());
    favoritesStore.get(ctx.userId!)!.add(input.ticker.toUpperCase());
    return { success: true };
  }),
  remove: protectedProcedure.input(z.object({ ticker: z.string() })).mutation(async ({ input, ctx }) => {
    favoritesStore.get(ctx.userId!)?.delete(input.ticker.toUpperCase());
    return { success: true };
  }),
  getAll: protectedProcedure.query(async ({ ctx }) => Array.from(favoritesStore.get(ctx.userId!) ?? [])),
});

const searchHistoryRouter = router({
  add: protectedProcedure.input(z.object({ ticker: z.string() })).mutation(async ({ input, ctx }) => {
    if (!searchHistoryStore.has(ctx.userId!)) searchHistoryStore.set(ctx.userId!, []);
    const history = searchHistoryStore.get(ctx.userId!)!;
    const idx = history.findIndex((h) => h.ticker === input.ticker.toUpperCase());
    if (idx !== -1) history.splice(idx, 1);
    history.unshift({ ticker: input.ticker.toUpperCase(), searchedAt: new Date() });
    if (history.length > 10) history.pop();
    return { success: true };
  }),
  getRecent: protectedProcedure.query(async ({ ctx }) => searchHistoryStore.get(ctx.userId!) ?? []),
  clear: protectedProcedure.mutation(async ({ ctx }) => { searchHistoryStore.delete(ctx.userId!); return { success: true }; }),
});

const appRouter = router({
  stock: stockRouter,
  watchlist: watchlistRouter,
  alerts: alertsRouter,
  favorites: favoritesRouter,
  searchHistory: searchHistoryRouter,
});

// ============================================================================
// VERCEL HANDLER
// ============================================================================

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.url}`;

    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value != null) {
        if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
        else headers.set(key, value);
      }
    }

    const webRequest = new Request(url, {
      method: req.method || 'GET',
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' && req.body ? JSON.stringify(req.body) : undefined,
    });

    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: webRequest,
      router: appRouter,
      createContext: ({ req }) => createContext(req),
    });

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));
    return res.send(await response.text());
  } catch (error: unknown) {
    console.error('tRPC handler error:', error);
    return res.status(500).json([{ error: { message: error instanceof Error ? error.message : 'Internal server error', code: 'INTERNAL_SERVER_ERROR' } }]);
  }
}
