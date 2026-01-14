import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';
import { stockQuerySchema, alertSchema } from './types';
import { getHistoricalData, getStockInfo, searchSymbols, getMultipleQuotes } from './yahooFinance';
import { calculatePivotData, getLatestSignal } from './pivotCalculator';

// Context type
export interface Context {
  userId?: number;
}

// Create context from Web Request
export function createContext(req: Request): Context {
  const userIdHeader = req.headers.get('x-user-id');
  const userId = userIdHeader ? parseInt(userIdHeader) : 1;
  return {
    userId: isNaN(userId) ? 1 : userId,
  };
}

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure
const isAuthed = t.middleware(({ next, ctx }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource',
    });
  }
  return next({
    ctx: {
      userId: ctx.userId,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// In-memory stores (will reset on cold start - expected for serverless)
const watchlistStore = new Map<number, Set<string>>();
const alertStore = new Map<number, { id: number; ticker: string; priceLevel: number; direction: 'above' | 'below'; triggered: boolean; createdAt: Date }[]>();
const favoritesStore = new Map<number, Set<string>>();
const searchHistoryStore = new Map<number, { ticker: string; searchedAt: Date }[]>();
let alertIdCounter = 1;

// Stock router
const stockRouter = router({
  getHistoricalData: publicProcedure.input(stockQuerySchema).query(async ({ input }) => {
    const data = await getHistoricalData(input.ticker, input.period, input.interval);
    return data;
  }),

  getPivotAnalysis: publicProcedure.input(stockQuerySchema).query(async ({ input }) => {
    const ohlcData = await getHistoricalData(input.ticker, input.period, input.interval);
    const pivotData = calculatePivotData(ohlcData);
    const signalInfo = getLatestSignal(pivotData);

    let stockInfo = null;
    try {
      stockInfo = await getStockInfo(input.ticker);
    } catch {
      // Ignore errors for stock info
    }

    return {
      data: pivotData,
      signal: signalInfo,
      stockInfo,
    };
  }),

  getStockInfo: publicProcedure.input(z.object({ ticker: z.string() })).query(async ({ input }) => {
    return await getStockInfo(input.ticker);
  }),

  search: publicProcedure.input(z.object({ query: z.string().min(1) })).query(async ({ input }) => {
    return await searchSymbols(input.query);
  }),

  getQuotes: publicProcedure.input(z.object({ tickers: z.array(z.string()) })).query(async ({ input }) => {
    const quotes = await getMultipleQuotes(input.tickers);
    return Object.fromEntries(quotes);
  }),
});

// Watchlist router
const watchlistRouter = router({
  add: protectedProcedure.input(z.object({ ticker: z.string() })).mutation(async ({ input, ctx }) => {
    const userId = ctx.userId!;
    if (!watchlistStore.has(userId)) {
      watchlistStore.set(userId, new Set());
    }
    watchlistStore.get(userId)!.add(input.ticker.toUpperCase());
    return { success: true, ticker: input.ticker.toUpperCase() };
  }),

  remove: protectedProcedure.input(z.object({ ticker: z.string() })).mutation(async ({ input, ctx }) => {
    const userId = ctx.userId!;
    if (watchlistStore.has(userId)) {
      watchlistStore.get(userId)!.delete(input.ticker.toUpperCase());
    }
    return { success: true };
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId!;
    const tickers = watchlistStore.get(userId) ?? new Set(['^NSEI', 'AAPL', 'BTC-USD']);

    const tickerArray = Array.from(tickers);
    const quotes = await getMultipleQuotes(tickerArray);

    const results = await Promise.all(
      tickerArray.map(async (ticker) => {
        try {
          const ohlcData = await getHistoricalData(ticker, '5d', '15m');
          const pivotData = calculatePivotData(ohlcData);
          const signalInfo = getLatestSignal(pivotData);
          const quote = quotes.get(ticker);

          return {
            ticker,
            currentPrice: quote?.price ?? pivotData[pivotData.length - 1]?.close ?? 0,
            signal: signalInfo.signal,
            rsi: pivotData[pivotData.length - 1]?.rsi ?? null,
            currency: quote?.currency ?? 'USD',
            change: quote?.change ?? 0,
            changePercent: quote?.changePercent ?? 0,
          };
        } catch {
          return {
            ticker,
            currentPrice: 0,
            signal: 'Hold' as const,
            rsi: null,
            currency: 'USD',
            change: 0,
            changePercent: 0,
          };
        }
      })
    );

    return results;
  }),
});

// Alerts router
const alertsRouter = router({
  create: protectedProcedure.input(alertSchema).mutation(async ({ input, ctx }) => {
    const userId = ctx.userId!;
    if (!alertStore.has(userId)) {
      alertStore.set(userId, []);
    }

    const alert = {
      id: alertIdCounter++,
      ticker: input.ticker.toUpperCase(),
      priceLevel: input.priceLevel,
      direction: input.direction,
      triggered: false,
      createdAt: new Date(),
    };

    alertStore.get(userId)!.push(alert);
    return alert;
  }),

  getActive: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId!;
    return alertStore.get(userId)?.filter((a) => !a.triggered) ?? [];
  }),

  dismiss: protectedProcedure.input(z.object({ alertId: z.number() })).mutation(async ({ input, ctx }) => {
    const userId = ctx.userId!;
    const alerts = alertStore.get(userId);
    if (alerts) {
      const index = alerts.findIndex((a) => a.id === input.alertId);
      if (index !== -1) {
        alerts[index].triggered = true;
      }
    }
    return { success: true };
  }),

  delete: protectedProcedure.input(z.object({ alertId: z.number() })).mutation(async ({ input, ctx }) => {
    const userId = ctx.userId!;
    const alerts = alertStore.get(userId);
    if (alerts) {
      const index = alerts.findIndex((a) => a.id === input.alertId);
      if (index !== -1) {
        alerts.splice(index, 1);
      }
    }
    return { success: true };
  }),
});

// Favorites router
const favoritesRouter = router({
  add: protectedProcedure.input(z.object({ ticker: z.string() })).mutation(async ({ input, ctx }) => {
    const userId = ctx.userId!;
    if (!favoritesStore.has(userId)) {
      favoritesStore.set(userId, new Set());
    }
    favoritesStore.get(userId)!.add(input.ticker.toUpperCase());
    return { success: true };
  }),

  remove: protectedProcedure.input(z.object({ ticker: z.string() })).mutation(async ({ input, ctx }) => {
    const userId = ctx.userId!;
    if (favoritesStore.has(userId)) {
      favoritesStore.get(userId)!.delete(input.ticker.toUpperCase());
    }
    return { success: true };
  }),

  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId!;
    return Array.from(favoritesStore.get(userId) ?? []);
  }),
});

// Search history router
const searchHistoryRouter = router({
  add: protectedProcedure.input(z.object({ ticker: z.string() })).mutation(async ({ input, ctx }) => {
    const userId = ctx.userId!;
    if (!searchHistoryStore.has(userId)) {
      searchHistoryStore.set(userId, []);
    }
    const history = searchHistoryStore.get(userId)!;

    const existingIndex = history.findIndex((h) => h.ticker === input.ticker.toUpperCase());
    if (existingIndex !== -1) {
      history.splice(existingIndex, 1);
    }

    history.unshift({ ticker: input.ticker.toUpperCase(), searchedAt: new Date() });

    if (history.length > 10) {
      history.pop();
    }

    return { success: true };
  }),

  getRecent: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId!;
    return searchHistoryStore.get(userId) ?? [];
  }),

  clear: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.userId!;
    searchHistoryStore.delete(userId);
    return { success: true };
  }),
});

// Main app router
export const appRouter = router({
  stock: stockRouter,
  watchlist: watchlistRouter,
  alerts: alertsRouter,
  favorites: favoritesRouter,
  searchHistory: searchHistoryRouter,
});

export type AppRouter = typeof appRouter;
