import type { OHLCData, PivotData } from './types';

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(closes: number[], period: number = 14): (number | null)[] {
  const rsi: (number | null)[] = new Array(closes.length).fill(null);

  if (closes.length < period + 1) return rsi;

  let gains: number[] = [];
  let losses: number[] = [];

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = gains.reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) {
    rsi[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsi[period] = 100 - (100 / (1 + rs));
  }

  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - (100 / (1 + rs));
    }
  }

  return rsi;
}

/**
 * Calculate Average True Range (ATR)
 */
export function calculateATR(
  highs: number[],
  lows: number[],
  closes: number[],
  period: number = 14
): (number | null)[] {
  const atr: (number | null)[] = new Array(highs.length).fill(null);
  const trueRanges: number[] = [];

  for (let i = 0; i < highs.length; i++) {
    if (i === 0) {
      trueRanges.push(highs[i] - lows[i]);
    } else {
      const highLow = highs[i] - lows[i];
      const highClose = Math.abs(highs[i] - closes[i - 1]);
      const lowClose = Math.abs(lows[i] - closes[i - 1]);
      trueRanges.push(Math.max(highLow, highClose, lowClose));
    }
  }

  for (let i = period - 1; i < highs.length; i++) {
    if (i === period - 1) {
      atr[i] = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    } else {
      atr[i] = ((atr[i - 1]! * (period - 1)) + trueRanges[i]) / period;
    }
  }

  return atr;
}

/**
 * Calculate Adaptive Moving Average (AMA)
 */
export function calculateAMA(
  closes: number[],
  window: number = 14,
  fastFactor: number = 2.0,
  slowFactor: number = 30.0
): (number | null)[] {
  const ama: (number | null)[] = new Array(closes.length).fill(null);

  if (closes.length < window) return ama;

  const pctChanges: number[] = [0];
  for (let i = 1; i < closes.length; i++) {
    pctChanges.push((closes[i] - closes[i - 1]) / closes[i - 1]);
  }

  const volatility: number[] = new Array(closes.length).fill(0);
  for (let i = window - 1; i < closes.length; i++) {
    const slice = pctChanges.slice(i - window + 1, i + 1);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / slice.length;
    volatility[i] = Math.sqrt(variance);
  }

  const fastSpan = fastFactor * window;
  const fastMultiplier = 2 / (fastSpan + 1);
  const fastEma: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    fastEma.push(closes[i] * fastMultiplier + fastEma[i - 1] * (1 - fastMultiplier));
  }

  const slowSpan = slowFactor * window;
  const slowMultiplier = 2 / (slowSpan + 1);
  const slowEma: number[] = [closes[0]];
  for (let i = 1; i < closes.length; i++) {
    slowEma.push(closes[i] * slowMultiplier + slowEma[i - 1] * (1 - slowMultiplier));
  }

  const amaMultiplier = 2 / (window + 1);
  let prevAma = fastEma[0] + volatility[0] * (closes[0] - slowEma[0]);
  for (let i = 0; i < closes.length; i++) {
    const rawAma = fastEma[i] + volatility[i] * (closes[i] - slowEma[i]);
    prevAma = rawAma * amaMultiplier + prevAma * (1 - amaMultiplier);
    ama[i] = prevAma;
  }

  return ama;
}

/**
 * Calculate pivot points (high and low)
 */
export function calculatePivotPoints(
  data: OHLCData[],
  length: number = 14
): { pivotHigh: boolean[]; pivotLow: boolean[] } {
  const pivotHigh: boolean[] = new Array(data.length).fill(false);
  const pivotLow: boolean[] = new Array(data.length).fill(false);

  for (let i = length; i < data.length - length; i++) {
    const currentHigh = data[i].high;
    let isPivotHigh = true;

    for (let j = i - length; j < i; j++) {
      if (data[j].high >= currentHigh) {
        isPivotHigh = false;
        break;
      }
    }

    if (isPivotHigh) {
      for (let j = i + 1; j <= i + length; j++) {
        if (data[j].high >= currentHigh) {
          isPivotHigh = false;
          break;
        }
      }
    }

    pivotHigh[i] = isPivotHigh;
  }

  for (let i = length; i < data.length - length; i++) {
    const currentLow = data[i].low;
    let isPivotLow = true;

    for (let j = i - length; j < i; j++) {
      if (data[j].low <= currentLow) {
        isPivotLow = false;
        break;
      }
    }

    if (isPivotLow) {
      for (let j = i + 1; j <= i + length; j++) {
        if (data[j].low <= currentLow) {
          isPivotLow = false;
          break;
        }
      }
    }

    pivotLow[i] = isPivotLow;
  }

  return { pivotHigh, pivotLow };
}

/**
 * Main function to calculate all pivot data with trendlines and signals
 */
export function calculatePivotData(ohlcData: OHLCData[]): PivotData[] {
  if (ohlcData.length < 30) {
    return ohlcData.map((d) => ({
      ...d,
      rsi: null,
      atr: null,
      ama: null,
      upper: null,
      lower: null,
      pivotHigh: false,
      pivotLow: false,
      signal: 'Hold' as const,
      upos: 0,
      dnos: 0,
    }));
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

  slopePh[0] = slope[0];
  slopePl[0] = slope[0];

  for (let i = 1; i < ohlcData.length; i++) {
    if (pivotHigh[i]) {
      phVal[i] = highs[i];
      slopePh[i] = slope[i];
    } else {
      phVal[i] = phVal[i - 1];
      slopePh[i] = slopePh[i - 1];
    }

    if (pivotLow[i]) {
      plVal[i] = lows[i];
      slopePl[i] = slope[i];
    } else {
      plVal[i] = plVal[i - 1];
      slopePl[i] = slopePl[i - 1];
    }
  }

  for (let i = 0; i < ohlcData.length; i++) {
    if (i === 0) {
      upper[i] = highs[i];
      lower[i] = lows[i];
    } else {
      if (pivotHigh[i]) {
        upper[i] = highs[i];
      } else {
        upper[i] = (upper[i - 1] ?? highs[i]) - slopePh[i];
      }

      if (pivotLow[i]) {
        lower[i] = lows[i];
      } else {
        lower[i] = (lower[i - 1] ?? lows[i]) + slopePl[i];
      }
    }
  }

  for (let i = 1; i < ohlcData.length; i++) {
    if (!pivotHigh[i]) {
      const upperLimit = upper[i - 1];
      if (upperLimit !== null && closes[i] > upperLimit) {
        upos[i] = 1;
      }
    }

    if (!pivotLow[i]) {
      const lowerLimit = lower[i - 1];
      if (lowerLimit !== null && closes[i] < lowerLimit) {
        dnos[i] = 1;
      }
    }
  }

  const signals: ('Buy' | 'Sell' | 'Hold')[] = new Array(ohlcData.length).fill('Hold');

  for (let i = 1; i < ohlcData.length; i++) {
    if (upos[i] > upos[i - 1]) {
      signals[i] = 'Buy';
    } else if (dnos[i] > dnos[i - 1]) {
      signals[i] = 'Sell';
    } else {
      signals[i] = 'Hold';
    }
  }

  for (let i = 1; i < ohlcData.length; i++) {
    if (signals[i] === 'Buy' && rsi[i] !== null && rsi[i]! > 70) {
      signals[i] = 'Hold';
    } else if (signals[i] === 'Sell' && rsi[i] !== null && rsi[i]! < 30) {
      signals[i] = 'Hold';
    }
  }

  return ohlcData.map((d, i) => ({
    ...d,
    rsi: rsi[i],
    atr: atr[i],
    ama: ama[i],
    upper: upper[i],
    lower: lower[i],
    pivotHigh: pivotHigh[i],
    pivotLow: pivotLow[i],
    signal: signals[i],
    upos: upos[i],
    dnos: dnos[i],
  }));
}

/**
 * Get the latest signal from pivot data
 */
export function getLatestSignal(pivotData: PivotData[]): {
  signal: 'Buy' | 'Sell' | 'Hold';
  lastSignal: 'Buy' | 'Sell' | 'Hold';
  lastSignalTime: Date | null;
  lastSignalPrice: number | null;
} {
  if (pivotData.length === 0) {
    return {
      signal: 'Hold',
      lastSignal: 'Hold',
      lastSignalTime: null,
      lastSignalPrice: null,
    };
  }

  const sortedData = [...pivotData].sort(
    (a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime()
  );
  const currentSignal = sortedData[0].signal;

  const lastNonHold = sortedData.find((d) => d.signal !== 'Hold');

  return {
    signal: currentSignal,
    lastSignal: lastNonHold?.signal ?? 'Hold',
    lastSignalTime: lastNonHold?.datetime ?? null,
    lastSignalPrice: lastNonHold?.close ?? null,
  };
}
