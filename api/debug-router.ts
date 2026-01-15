import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const results: Record<string, unknown> = {
    nodeVersion: process.version,
    cwd: process.cwd(),
  };

  // Test loading router module
  try {
    const routerModule = await import('./lib/router');
    results.routerLoaded = true;
    results.hasAppRouter = 'appRouter' in routerModule;
    results.hasCreateContext = 'createContext' in routerModule;
  } catch (error: unknown) {
    results.routerLoaded = false;
    results.routerError = error instanceof Error ? error.message : String(error);
    results.routerStack = error instanceof Error ? error.stack : undefined;
  }

  // Test loading types module
  try {
    const typesModule = await import('./lib/types');
    results.typesLoaded = true;
    results.hasStockQuerySchema = 'stockQuerySchema' in typesModule;
  } catch (error: unknown) {
    results.typesLoaded = false;
    results.typesError = error instanceof Error ? error.message : String(error);
  }

  // Test loading yahooFinance module
  try {
    const yahooModule = await import('./lib/yahooFinance');
    results.yahooLoaded = true;
    results.hasGetHistoricalData = 'getHistoricalData' in yahooModule;
  } catch (error: unknown) {
    results.yahooLoaded = false;
    results.yahooError = error instanceof Error ? error.message : String(error);
  }

  // Test loading pivotCalculator module
  try {
    const pivotModule = await import('./lib/pivotCalculator');
    results.pivotLoaded = true;
    results.hasCalculatePivotData = 'calculatePivotData' in pivotModule;
  } catch (error: unknown) {
    results.pivotLoaded = false;
    results.pivotError = error instanceof Error ? error.message : String(error);
  }

  return res.status(200).json(results);
}
