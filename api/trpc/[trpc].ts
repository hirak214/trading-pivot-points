import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';
import yahooFinance from 'yahoo-finance2';

// Suppress yahoo-finance2 validation warnings
yahooFinance.setGlobalConfig({
  validation: { logErrors: false, logOptionsErrors: false },
});

// Initialize tRPC
const t = initTRPC.create({ transformer: superjson });

// ============ TYPES ============
type Period = '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '2y' | '5y' | 'max';
type Interval = '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo';

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

// ============ YAHOO FINANCE ============
function getPeriodStartDate(period: Period): Date {
  const now = new Date();
  const ms: Record<Period, number> = {
    '1d': 1, '5d': 5, '1mo': 30, '3mo': 90, '6mo': 180,
    '1y': 365, '2y': 730, '5y': 1825, 'max': 36500,
  };
  return new Date(now.getTime() - (ms[period] || 5) * 24 * 60 * 60 * 1000);
}

async function getHistoricalData(ticker: string, period: Period = '5d', interval: Interval = '15m'): Promise<OHLCData[]> {
  const result = await yahooFinance.chart(ticker.toUpperCase(), {
    period1: getPeriodStartDate(period),
    interval,
  });
  if (!result?.quotes?.length) throw new Error(`No data for ${ticker}`);
  return result.quotes
    .filter((q: any) => q.open != null && q.high != null && q.low != null && q.close != null)
    .map((q: any) => ({
      datetime: new Date(q.date),
      open: q.open!, high: q.high!, low: q.low!, close: q.close!,
      volume: q.volume ?? 0,
    }));
}

async function getStockInfo(ticker: string) {
  const quote = await yahooFinance.quote(ticker.toUpperCase());
  if (!quote) throw new Error(`No quote for ${ticker}`);
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

// ============ PIVOT CALCULATOR ============
function calculateRSI(closes: number[], period = 14): (number | null)[] {
  const rsi: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period + 1) return rsi;
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) avgGain += change; else avgLoss += Math.abs(change);
  }
  avgGain /= period; avgLoss /= period;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (change > 0 ? change : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (change < 0 ? Math.abs(change) : 0)) / period;
    rsi[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return rsi;
}

function calculateATR(highs: number[], lows: number[], closes: number[], period = 14): (number | null)[] {
  const atr: (number | null)[] = new Array(highs.length).fill(null);
  const tr: number[] = [];
  for (let i = 0; i < highs.length; i++) {
    if (i === 0) tr.push(highs[i] - lows[i]);
    else tr.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }
  for (let i = period - 1; i < highs.length; i++) {
    atr[i] = i === period - 1
      ? tr.slice(0, period).reduce((a, b) => a + b, 0) / period
      : ((atr[i - 1]! * (period - 1)) + tr[i]) / period;
  }
  return atr;
}

function calculateAMA(closes: number[], window = 14, fast = 2.0, slow = 30.0): (number | null)[] {
  const ama: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < window) return ama;
  const pct = [0, ...closes.slice(1).map((c, i) => (c - closes[i]) / closes[i])];
  const vol = new Array(closes.length).fill(0);
  for (let i = window - 1; i < closes.length; i++) {
    const slice = pct.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    vol[i] = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / slice.length);
  }
  const fastM = 2 / (fast * window + 1), slowM = 2 / (slow * window + 1), amaM = 2 / (window + 1);
  const fastE = [closes[0]], slowE = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    fastE.push(closes[i] * fastM + fastE[i - 1] * (1 - fastM));
    slowE.push(closes[i] * slowM + slowE[i - 1] * (1 - slowM));
  }
  let prev = fastE[0] + vol[0] * (closes[0] - slowE[0]);
  for (let i = 0; i < closes.length; i++) {
    const raw = fastE[i] + vol[i] * (closes[i] - slowE[i]);
    prev = raw * amaM + prev * (1 - amaM);
    ama[i] = prev;
  }
  return ama;
}

function calculatePivotPoints(data: OHLCData[], length = 14) {
  const pivotHigh = new Array(data.length).fill(false);
  const pivotLow = new Array(data.length).fill(false);
  for (let i = length; i < data.length - length; i++) {
    let isHigh = true, isLow = true;
    for (let j = i - length; j < i; j++) {
      if (data[j].high >= data[i].high) isHigh = false;
      if (data[j].low <= data[i].low) isLow = false;
    }
    for (let j = i + 1; j <= i + length; j++) {
      if (data[j].high >= data[i].high) isHigh = false;
      if (data[j].low <= data[i].low) isLow = false;
    }
    pivotHigh[i] = isHigh;
    pivotLow[i] = isLow;
  }
  return { pivotHigh, pivotLow };
}

function calculatePivotData(ohlc: OHLCData[]): PivotData[] {
  if (ohlc.length < 30) return ohlc.map((d) => ({ ...d, rsi: null, atr: null, ama: null, upper: null, lower: null, pivotHigh: false, pivotLow: false, signal: 'Hold' as const, upos: 0, dnos: 0 }));

  const closes = ohlc.map((d) => d.close), highs = ohlc.map((d) => d.high), lows = ohlc.map((d) => d.low);
  const rsi = calculateRSI(closes), atr = calculateATR(highs, lows, closes), ama = calculateAMA(closes);
  const { pivotHigh, pivotLow } = calculatePivotPoints(ohlc);

  const slope = ohlc.map((_, i) => (atr[i] ?? 0) / 14);
  const slopePh = [slope[0]], slopePl = [slope[0]];
  const upper: (number | null)[] = [highs[0]], lower: (number | null)[] = [lows[0]];
  const upos = [0], dnos = [0];

  for (let i = 1; i < ohlc.length; i++) {
    slopePh.push(pivotHigh[i] ? slope[i] : slopePh[i - 1]);
    slopePl.push(pivotLow[i] ? slope[i] : slopePl[i - 1]);
    upper.push(pivotHigh[i] ? highs[i] : (upper[i - 1] ?? highs[i]) - slopePh[i]);
    lower.push(pivotLow[i] ? lows[i] : (lower[i - 1] ?? lows[i]) + slopePl[i]);
    upos.push(!pivotHigh[i] && upper[i - 1] !== null && closes[i] > upper[i - 1]! ? 1 : 0);
    dnos.push(!pivotLow[i] && lower[i - 1] !== null && closes[i] < lower[i - 1]! ? 1 : 0);
  }

  const signals: ('Buy' | 'Sell' | 'Hold')[] = ['Hold'];
  for (let i = 1; i < ohlc.length; i++) {
    let sig: 'Buy' | 'Sell' | 'Hold' = upos[i] > upos[i - 1] ? 'Buy' : dnos[i] > dnos[i - 1] ? 'Sell' : 'Hold';
    if (sig === 'Buy' && rsi[i] !== null && rsi[i]! > 70) sig = 'Hold';
    if (sig === 'Sell' && rsi[i] !== null && rsi[i]! < 30) sig = 'Hold';
    signals.push(sig);
  }

  return ohlc.map((d, i) => ({ ...d, rsi: rsi[i], atr: atr[i], ama: ama[i], upper: upper[i], lower: lower[i], pivotHigh: pivotHigh[i], pivotLow: pivotLow[i], signal: signals[i], upos: upos[i], dnos: dnos[i] }));
}

function getLatestSignal(pivotData: PivotData[]) {
  if (!pivotData.length) return { signal: 'Hold' as const, lastSignal: 'Hold' as const, lastSignalTime: null, lastSignalPrice: null };
  const sorted = [...pivotData].sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  const lastNonHold = sorted.find((d) => d.signal !== 'Hold');
  return {
    signal: sorted[0].signal,
    lastSignal: lastNonHold?.signal ?? 'Hold',
    lastSignalTime: lastNonHold?.datetime ?? null,
    lastSignalPrice: lastNonHold?.close ?? null,
  };
}

// ============ SCHEMAS ============
const stockQuerySchema = z.object({
  ticker: z.string().min(1).max(20),
  period: z.enum(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', 'max']).default('5d'),
  interval: z.enum(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo']).default('15m'),
});

// ============ ROUTER ============
const appRouter = t.router({
  stock: t.router({
    getHistoricalData: t.procedure.input(stockQuerySchema).query(async ({ input }) => {
      return getHistoricalData(input.ticker, input.period, input.interval);
    }),
    getPivotAnalysis: t.procedure.input(stockQuerySchema).query(async ({ input }) => {
      const ohlc = await getHistoricalData(input.ticker, input.period, input.interval);
      const pivotData = calculatePivotData(ohlc);
      const signal = getLatestSignal(pivotData);
      let stockInfo = null;
      try { stockInfo = await getStockInfo(input.ticker); } catch {}
      return { data: pivotData, signal, stockInfo };
    }),
    getStockInfo: t.procedure.input(z.object({ ticker: z.string() })).query(async ({ input }) => {
      return getStockInfo(input.ticker);
    }),
  }),
  watchlist: t.router({
    getAll: t.procedure.query(async () => {
      const tickers = ['^NSEI', 'AAPL', 'BTC-USD'];
      const results = await Promise.all(tickers.map(async (ticker) => {
        try {
          const ohlc = await getHistoricalData(ticker, '5d', '15m');
          const pivotData = calculatePivotData(ohlc);
          const signalInfo = getLatestSignal(pivotData);
          const info = await getStockInfo(ticker);
          return {
            ticker,
            currentPrice: info.regularMarketPrice,
            signal: signalInfo.signal,
            rsi: pivotData[pivotData.length - 1]?.rsi ?? null,
            currency: info.currency,
            change: info.regularMarketChange,
            changePercent: info.regularMarketChangePercent,
          };
        } catch { return { ticker, currentPrice: 0, signal: 'Hold' as const, rsi: null, currency: 'USD', change: 0, changePercent: 0 }; }
      }));
      return results;
    }),
    add: t.procedure.input(z.object({ ticker: z.string() })).mutation(async ({ input }) => ({ success: true, ticker: input.ticker.toUpperCase() })),
    remove: t.procedure.input(z.object({ ticker: z.string() })).mutation(async () => ({ success: true })),
  }),
  alerts: t.router({
    getActive: t.procedure.query(async () => []),
    create: t.procedure.input(z.object({ ticker: z.string(), priceLevel: z.number(), direction: z.enum(['above', 'below']) })).mutation(async ({ input }) => ({ id: 1, ...input, triggered: false, createdAt: new Date() })),
    dismiss: t.procedure.input(z.object({ alertId: z.number() })).mutation(async () => ({ success: true })),
    delete: t.procedure.input(z.object({ alertId: z.number() })).mutation(async () => ({ success: true })),
  }),
  favorites: t.router({
    add: t.procedure.input(z.object({ ticker: z.string() })).mutation(async () => ({ success: true })),
    remove: t.procedure.input(z.object({ ticker: z.string() })).mutation(async () => ({ success: true })),
    getAll: t.procedure.query(async () => []),
  }),
  searchHistory: t.router({
    add: t.procedure.input(z.object({ ticker: z.string() })).mutation(async () => ({ success: true })),
    getRecent: t.procedure.query(async () => []),
    clear: t.procedure.mutation(async () => ({ success: true })),
  }),
});

export type AppRouter = typeof appRouter;

// Helper to call a procedure by path
async function callProcedure(caller: any, path: string, input: any): Promise<any> {
  const [namespace, procedure] = path.split('.');

  if (namespace === 'stock') {
    if (procedure === 'getPivotAnalysis') return caller.stock.getPivotAnalysis(input);
    if (procedure === 'getHistoricalData') return caller.stock.getHistoricalData(input);
    if (procedure === 'getStockInfo') return caller.stock.getStockInfo(input);
  } else if (namespace === 'watchlist') {
    if (procedure === 'getAll') return caller.watchlist.getAll();
    if (procedure === 'add') return caller.watchlist.add(input);
    if (procedure === 'remove') return caller.watchlist.remove(input);
  } else if (namespace === 'alerts') {
    if (procedure === 'getActive') return caller.alerts.getActive();
    if (procedure === 'create') return caller.alerts.create(input);
    if (procedure === 'dismiss') return caller.alerts.dismiss(input);
    if (procedure === 'delete') return caller.alerts.delete(input);
  } else if (namespace === 'favorites') {
    if (procedure === 'getAll') return caller.favorites.getAll();
    if (procedure === 'add') return caller.favorites.add(input);
    if (procedure === 'remove') return caller.favorites.remove(input);
  } else if (namespace === 'searchHistory') {
    if (procedure === 'getRecent') return caller.searchHistory.getRecent();
    if (procedure === 'add') return caller.searchHistory.add(input);
    if (procedure === 'clear') return caller.searchHistory.clear();
  }

  throw new Error(`Procedure not found: ${path}`);
}

// ============ VERCEL HANDLER ============
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Extract the path from the URL
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/').filter(Boolean);
    // Path is like /api/trpc/stock.getPivotAnalysis or /api/trpc/watchlist.getAll,stock.getPivotAnalysis
    const trpcPath = pathParts.slice(2).join('/'); // Get everything after /api/trpc/

    // Handle batched requests (comma-separated procedures)
    const procedures = trpcPath.split(',');

    // Get input from query params
    const input = req.query.input;
    let parsedInputs: any = {};

    if (input) {
      try {
        parsedInputs = typeof input === 'string' ? JSON.parse(input) : input;
      } catch (e) {
        parsedInputs = {};
      }
    }

    // Route to the appropriate procedures
    const caller = t.createCallerFactory(appRouter)({});
    const results: any[] = [];

    for (let i = 0; i < procedures.length; i++) {
      const procPath = procedures[i];
      const procInput = parsedInputs[String(i)]?.json;

      try {
        const result = await callProcedure(caller, procPath, procInput);
        results.push({ result: { data: superjson.serialize(result) } });
      } catch (error: any) {
        results.push({
          error: {
            message: error.message || 'Procedure error',
            code: 'INTERNAL_SERVER_ERROR'
          }
        });
      }
    }

    return res.status(200).json(results);

  } catch (error: any) {
    console.error('tRPC Error:', error);
    return res.status(500).json([{
      error: {
        message: error.message || 'Internal server error',
        code: 'INTERNAL_SERVER_ERROR'
      }
    }]);
  }
}
