import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TestResult {
  name: string;
  success: boolean;
  status?: number;
  error?: string;
  dataCheck?: {
    hasData: boolean;
    dataLength?: number;
    sampleFields?: string[];
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const baseUrl = `${protocol}://${host}`;

  const results: TestResult[] = [];

  // Test 1: stock.getPivotAnalysis - Critical for chart and plots
  try {
    const input = encodeURIComponent(
      JSON.stringify({ '0': { json: { ticker: 'AAPL', period: '5d', interval: '15m' } } })
    );
    const response = await fetch(`${baseUrl}/api/trpc/stock.getPivotAnalysis?input=${input}`, {
      headers: { 'x-user-id': '1' },
    });
    const data = await response.json();
    const result = data[0]?.result?.data?.json;

    const hasData = result?.data && Array.isArray(result.data) && result.data.length > 0;
    const hasSignal = result?.signal && typeof result.signal === 'object';
    const hasStockInfo = result?.stockInfo && typeof result.stockInfo === 'object';

    // Check if pivot data has the fields needed for plotting
    const sampleData = result?.data?.[0];
    const hasPlotFields = sampleData &&
      'datetime' in sampleData &&
      'open' in sampleData &&
      'high' in sampleData &&
      'low' in sampleData &&
      'close' in sampleData &&
      'upper' in sampleData &&
      'lower' in sampleData &&
      'signal' in sampleData &&
      'rsi' in sampleData;

    results.push({
      name: 'stock.getPivotAnalysis',
      success: response.ok && hasData && hasSignal && hasPlotFields,
      status: response.status,
      error: data[0]?.error?.message,
      dataCheck: {
        hasData,
        dataLength: result?.data?.length,
        sampleFields: sampleData ? Object.keys(sampleData) : [],
      },
    });
  } catch (error: unknown) {
    results.push({
      name: 'stock.getPivotAnalysis',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 2: stock.getStockInfo - For displaying stock info in UI
  try {
    const input = encodeURIComponent(JSON.stringify({ '0': { json: { ticker: 'AAPL' } } }));
    const response = await fetch(`${baseUrl}/api/trpc/stock.getStockInfo?input=${input}`, {
      headers: { 'x-user-id': '1' },
    });
    const data = await response.json();
    const result = data[0]?.result?.data?.json;

    const hasRequiredFields = result &&
      'symbol' in result &&
      'regularMarketPrice' in result &&
      'currency' in result;

    results.push({
      name: 'stock.getStockInfo',
      success: response.ok && hasRequiredFields,
      status: response.status,
      error: data[0]?.error?.message,
      dataCheck: {
        hasData: !!result,
        sampleFields: result ? Object.keys(result) : [],
      },
    });
  } catch (error: unknown) {
    results.push({
      name: 'stock.getStockInfo',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 3: stock.search - For ticker search functionality
  try {
    const input = encodeURIComponent(JSON.stringify({ '0': { json: { query: 'apple' } } }));
    const response = await fetch(`${baseUrl}/api/trpc/stock.search?input=${input}`, {
      headers: { 'x-user-id': '1' },
    });
    const data = await response.json();
    const result = data[0]?.result?.data?.json;

    results.push({
      name: 'stock.search',
      success: response.ok && Array.isArray(result),
      status: response.status,
      error: data[0]?.error?.message,
      dataCheck: {
        hasData: Array.isArray(result) && result.length > 0,
        dataLength: Array.isArray(result) ? result.length : 0,
      },
    });
  } catch (error: unknown) {
    results.push({
      name: 'stock.search',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 4: watchlist.getAll - For watchlist sidebar
  try {
    const response = await fetch(`${baseUrl}/api/trpc/watchlist.getAll`, {
      headers: { 'x-user-id': '1' },
    });
    const data = await response.json();
    const result = data[0]?.result?.data?.json;

    const hasValidItems = Array.isArray(result) && result.every(
      (item: Record<string, unknown>) =>
        'ticker' in item &&
        'currentPrice' in item &&
        'signal' in item
    );

    results.push({
      name: 'watchlist.getAll',
      success: response.ok && hasValidItems,
      status: response.status,
      error: data[0]?.error?.message,
      dataCheck: {
        hasData: Array.isArray(result) && result.length > 0,
        dataLength: Array.isArray(result) ? result.length : 0,
        sampleFields: result?.[0] ? Object.keys(result[0]) : [],
      },
    });
  } catch (error: unknown) {
    results.push({
      name: 'watchlist.getAll',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 5: favorites.getAll - Protected procedure test
  try {
    const response = await fetch(`${baseUrl}/api/trpc/favorites.getAll`, {
      headers: { 'x-user-id': '1' },
    });
    const data = await response.json();
    const result = data[0]?.result?.data?.json;

    results.push({
      name: 'favorites.getAll',
      success: response.ok && Array.isArray(result),
      status: response.status,
      error: data[0]?.error?.message,
      dataCheck: {
        hasData: true, // Empty array is valid
        dataLength: Array.isArray(result) ? result.length : 0,
      },
    });
  } catch (error: unknown) {
    results.push({
      name: 'favorites.getAll',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 6: alerts.getActive - Protected procedure test
  try {
    const response = await fetch(`${baseUrl}/api/trpc/alerts.getActive`, {
      headers: { 'x-user-id': '1' },
    });
    const data = await response.json();
    const result = data[0]?.result?.data?.json;

    results.push({
      name: 'alerts.getActive',
      success: response.ok && Array.isArray(result),
      status: response.status,
      error: data[0]?.error?.message,
      dataCheck: {
        hasData: true, // Empty array is valid
        dataLength: Array.isArray(result) ? result.length : 0,
      },
    });
  } catch (error: unknown) {
    results.push({
      name: 'alerts.getActive',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 7: searchHistory.getRecent - Protected procedure test
  try {
    const response = await fetch(`${baseUrl}/api/trpc/searchHistory.getRecent`, {
      headers: { 'x-user-id': '1' },
    });
    const data = await response.json();
    const result = data[0]?.result?.data?.json;

    results.push({
      name: 'searchHistory.getRecent',
      success: response.ok && Array.isArray(result),
      status: response.status,
      error: data[0]?.error?.message,
      dataCheck: {
        hasData: true, // Empty array is valid
        dataLength: Array.isArray(result) ? result.length : 0,
      },
    });
  } catch (error: unknown) {
    results.push({
      name: 'searchHistory.getRecent',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  // Test 8: Batched request (how the client actually calls)
  try {
    const batchedInput = encodeURIComponent(
      JSON.stringify({
        '0': { json: { ticker: '^NSEI', period: '5d', interval: '15m' } },
      })
    );
    const response = await fetch(
      `${baseUrl}/api/trpc/stock.getPivotAnalysis?batch=1&input=${batchedInput}`,
      {
        headers: { 'x-user-id': '1' },
      }
    );
    const data = await response.json();

    results.push({
      name: 'batched.request',
      success: response.ok && Array.isArray(data) && data.length > 0,
      status: response.status,
      error: data[0]?.error?.message,
      dataCheck: {
        hasData: Array.isArray(data) && data.length > 0,
        dataLength: Array.isArray(data) ? data.length : 0,
      },
    });
  } catch (error: unknown) {
    results.push({
      name: 'batched.request',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  const allPassed = results.every((r) => r.success);
  const criticalPassed = results
    .filter((r) => ['stock.getPivotAnalysis', 'watchlist.getAll'].includes(r.name))
    .every((r) => r.success);

  return res.status(200).json({
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
      allPassed,
      criticalPassed,
    },
    results,
    chartDataCheck: {
      description: 'Fields required for chart rendering',
      requiredFields: ['datetime', 'open', 'high', 'low', 'close', 'upper', 'lower', 'signal', 'rsi', 'volume'],
    },
  });
}
