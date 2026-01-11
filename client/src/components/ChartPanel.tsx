import { useMemo, useCallback, useState, useRef, useEffect } from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  Line,
  ReferenceLine,
  ReferenceArea,
  Cell,
  Legend,
  Scatter,
} from 'recharts';
import { ZoomIn, ZoomOut, RotateCcw, Download, AlertCircle, Loader2 } from 'lucide-react';
import { formatPrice, formatTime, cn, getSignalColor } from '../lib/utils';
import type { PivotData, StockInfo } from '../../../shared/types';
import type { ChartSettings } from '../hooks/useLocalStorage';

interface ChartPanelProps {
  data: PivotData[];
  stockInfo: StockInfo | null;
  isLoading: boolean;
  error?: string;
  settings: ChartSettings;
}

// Custom candlestick bar shape
const CandlestickBar = (props: any) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;

  const { open, close, high, low } = payload;
  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#ef4444';

  const barWidth = Math.max(width * 0.8, 2);
  const barX = x + (width - barWidth) / 2;

  // Calculate body position
  const bodyTop = Math.min(open, close);
  const bodyBottom = Math.max(open, close);
  const bodyHeight = Math.abs(close - open);

  // Scale factor (we need to calculate this based on chart dimensions)
  const scale = height / (high - low) || 1;

  return (
    <g>
      {/* Wick (high to low line) */}
      <line
        x1={x + width / 2}
        x2={x + width / 2}
        y1={y}
        y2={y + height}
        stroke={color}
        strokeWidth={1}
      />
      {/* Body */}
      <rect
        x={barX}
        y={y + (high - Math.max(open, close)) * scale}
        width={barWidth}
        height={Math.max(bodyHeight * scale, 1)}
        fill={isUp ? color : color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

export function ChartPanel({ data, stockInfo, isLoading, error, settings }: ChartPanelProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [zoomDomain, setZoomDomain] = useState<{ start: number; end: number } | null>(null);

  // Process data for chart
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];

    const sortedData = [...data].sort(
      (a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );

    return sortedData.map((d, index) => ({
      ...d,
      index,
      time: formatTime(d.datetime),
      fullTime: new Date(d.datetime).toLocaleString(),
      candleColor: d.close >= d.open ? '#10b981' : '#ef4444',
      // For candlestick visualization
      ohlc: [d.low, d.open, d.close, d.high],
      body: [Math.min(d.open, d.close), Math.max(d.open, d.close)],
      wick: [d.low, d.high],
    }));
  }, [data]);

  // Calculate Y axis domain
  const yDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 100];

    const visibleData = zoomDomain
      ? chartData.slice(zoomDomain.start, zoomDomain.end + 1)
      : chartData;

    let min = Math.min(...visibleData.map((d) => d.low));
    let max = Math.max(...visibleData.map((d) => d.high));

    // Include bounds if shown
    if (settings.showBounds) {
      const lowers = visibleData.map((d) => d.lower).filter((v): v is number => v !== null);
      const uppers = visibleData.map((d) => d.upper).filter((v): v is number => v !== null);
      if (lowers.length > 0) min = Math.min(min, ...lowers);
      if (uppers.length > 0) max = Math.max(max, ...uppers);
    }

    const padding = (max - min) * 0.05;
    return [min - padding, max + padding];
  }, [chartData, zoomDomain, settings.showBounds]);

  // Volume domain
  const volumeDomain = useMemo(() => {
    if (chartData.length === 0) return [0, 1];
    const maxVolume = Math.max(...chartData.map((d) => d.volume));
    return [0, maxVolume * 1.1];
  }, [chartData]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    if (!zoomDomain) {
      const dataLength = chartData.length;
      const visibleCount = Math.max(30, Math.floor(dataLength * 0.5));
      setZoomDomain({
        start: dataLength - visibleCount,
        end: dataLength - 1,
      });
    } else {
      const currentRange = zoomDomain.end - zoomDomain.start;
      const newRange = Math.max(10, Math.floor(currentRange * 0.7));
      const center = Math.floor((zoomDomain.start + zoomDomain.end) / 2);
      setZoomDomain({
        start: Math.max(0, center - Math.floor(newRange / 2)),
        end: Math.min(chartData.length - 1, center + Math.ceil(newRange / 2)),
      });
    }
  }, [zoomDomain, chartData.length]);

  const handleZoomOut = useCallback(() => {
    if (!zoomDomain) return;

    const currentRange = zoomDomain.end - zoomDomain.start;
    const newRange = Math.min(chartData.length, Math.floor(currentRange * 1.5));
    const center = Math.floor((zoomDomain.start + zoomDomain.end) / 2);
    const newStart = Math.max(0, center - Math.floor(newRange / 2));
    const newEnd = Math.min(chartData.length - 1, center + Math.ceil(newRange / 2));

    if (newStart === 0 && newEnd === chartData.length - 1) {
      setZoomDomain(null);
    } else {
      setZoomDomain({ start: newStart, end: newEnd });
    }
  }, [zoomDomain, chartData.length]);

  const handleReset = useCallback(() => {
    setZoomDomain(null);
  }, []);

  // Download chart as PNG
  const handleDownload = useCallback(() => {
    if (!chartRef.current) return;

    const svg = chartRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx!.scale(2, 2);
      ctx!.fillStyle = '#0f172a';
      ctx!.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.drawImage(img, 0, 0);

      const a = document.createElement('a');
      a.download = `${stockInfo?.symbol || 'chart'}_${new Date().toISOString().split('T')[0]}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [stockInfo?.symbol]);

  // Get visible data based on zoom
  const visibleData = useMemo(() => {
    if (!zoomDomain) return chartData;
    return chartData.slice(zoomDomain.start, zoomDomain.end + 1);
  }, [chartData, zoomDomain]);

  // Find buy/sell signals for markers
  const signalMarkers = useMemo(() => {
    return visibleData
      .filter((d) => d.signal === 'Buy' || d.signal === 'Sell')
      .map((d) => ({
        ...d,
        markerY: d.signal === 'Buy' ? d.low * 0.998 : d.high * 1.002,
      }));
  }, [visibleData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload[0]) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 shadow-xl">
        <div className="text-xs text-slate-400 mb-2">{data.fullTime}</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <span className="text-slate-400">Open:</span>
          <span className="text-slate-100 font-mono">{formatPrice(data.open, stockInfo?.currency)}</span>
          <span className="text-slate-400">High:</span>
          <span className="text-emerald-400 font-mono">{formatPrice(data.high, stockInfo?.currency)}</span>
          <span className="text-slate-400">Low:</span>
          <span className="text-red-400 font-mono">{formatPrice(data.low, stockInfo?.currency)}</span>
          <span className="text-slate-400">Close:</span>
          <span className="text-slate-100 font-mono">{formatPrice(data.close, stockInfo?.currency)}</span>
          {data.rsi !== null && (
            <>
              <span className="text-slate-400">RSI:</span>
              <span className="text-blue-400 font-mono">{data.rsi.toFixed(2)}</span>
            </>
          )}
          {data.signal !== 'Hold' && (
            <>
              <span className="text-slate-400">Signal:</span>
              <span
                className="font-semibold"
                style={{ color: getSignalColor(data.signal) }}
              >
                {data.signal}
              </span>
            </>
          )}
        </div>
      </div>
    );
  };

  if (isLoading && data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <span className="text-slate-400">Loading chart data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/50 rounded-xl border border-slate-800">
        <div className="flex flex-col items-center gap-3 text-red-400">
          <AlertCircle className="w-8 h-8" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden">
      {/* Chart Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="font-semibold text-lg text-slate-100">
              {stockInfo?.shortName || stockInfo?.symbol || 'Chart'}
            </h3>
            {stockInfo && (
              <span className="text-xs text-slate-400">
                {stockInfo.exchange} · {stockInfo.currency}
              </span>
            )}
          </div>
          {visibleData.length > 0 && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-2xl font-bold',
                  visibleData[visibleData.length - 1].close >= visibleData[visibleData.length - 1].open
                    ? 'text-emerald-400'
                    : 'text-red-400'
                )}
              >
                {formatPrice(visibleData[visibleData.length - 1].close, stockInfo?.currency)}
              </span>
            </div>
          )}
        </div>

        {/* Chart Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            disabled={!zoomDomain}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            title="Download Chart"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="flex-1 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={visibleData}
            margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="price"
              domain={yDomain}
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              tickLine={{ stroke: '#475569' }}
              axisLine={{ stroke: '#475569' }}
              tickFormatter={(value) => formatPrice(value, stockInfo?.currency).replace(/[^\d.,]/g, '')}
              width={70}
            />
            {settings.showVolume && (
              <YAxis
                yAxisId="volume"
                orientation="right"
                domain={volumeDomain}
                stroke="#64748b"
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickLine={{ stroke: '#475569' }}
                axisLine={{ stroke: '#475569' }}
                tickFormatter={(value) =>
                  value >= 1000000 ? `${(value / 1000000).toFixed(1)}M` : `${(value / 1000).toFixed(0)}K`
                }
                width={50}
              />
            )}
            <Tooltip content={<CustomTooltip />} />

            {/* Volume Bars */}
            {settings.showVolume && (
              <Bar yAxisId="volume" dataKey="volume" opacity={0.3}>
                {visibleData.map((entry, index) => (
                  <Cell
                    key={`volume-${index}`}
                    fill={entry.close >= entry.open ? '#10b981' : '#ef4444'}
                  />
                ))}
              </Bar>
            )}

            {/* Candlestick representation using Lines */}
            {/* High-Low wicks */}
            {visibleData.map((entry, index) => (
              <ReferenceLine
                key={`wick-${index}`}
                yAxisId="price"
                segment={[
                  { x: entry.time, y: entry.low },
                  { x: entry.time, y: entry.high },
                ]}
                stroke={entry.close >= entry.open ? '#10b981' : '#ef4444'}
                strokeWidth={1}
              />
            ))}

            {/* Candlestick bodies as bars */}
            <Bar yAxisId="price" dataKey="close" barSize={8}>
              {visibleData.map((entry, index) => (
                <Cell
                  key={`body-${index}`}
                  fill={entry.close >= entry.open ? '#10b981' : '#ef4444'}
                />
              ))}
            </Bar>

            {/* Upper Bound (Trendline) */}
            {settings.showBounds && (
              <Line
                yAxisId="price"
                type="stepAfter"
                dataKey="upper"
                stroke="#f97316"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                name="Upper Bound"
              />
            )}

            {/* Lower Bound (Trendline) */}
            {settings.showBounds && (
              <Line
                yAxisId="price"
                type="stepAfter"
                dataKey="lower"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                connectNulls
                name="Lower Bound"
              />
            )}

            {/* Buy/Sell Signal Markers */}
            {settings.showPivotPoints &&
              signalMarkers.map((marker, index) => (
                <ReferenceLine
                  key={`signal-${index}`}
                  yAxisId="price"
                  x={marker.time}
                  stroke={getSignalColor(marker.signal)}
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  label={{
                    value: marker.signal,
                    position: marker.signal === 'Buy' ? 'bottom' : 'top',
                    fill: getSignalColor(marker.signal),
                    fontSize: 10,
                    fontWeight: 'bold',
                  }}
                />
              ))}

            {/* Pivot High markers */}
            {settings.showPivotPoints && (
              <Scatter
                yAxisId="price"
                data={visibleData.filter((d) => d.pivotHigh)}
                fill="#ef4444"
                shape="triangle"
                legendType="none"
              />
            )}

            {/* Pivot Low markers */}
            {settings.showPivotPoints && (
              <Scatter
                yAxisId="price"
                data={visibleData.filter((d) => d.pivotLow)}
                fill="#10b981"
                shape="triangle"
                legendType="none"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 p-2 border-t border-slate-800 text-xs text-slate-400">
        {settings.showBounds && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-orange-500 rounded" style={{ borderTop: '2px dashed #f97316' }} />
              <span>Upper Bound</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-blue-500 rounded" style={{ borderTop: '2px dashed #3b82f6' }} />
              <span>Lower Bound</span>
            </div>
          </>
        )}
        {settings.showPivotPoints && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span>Buy Signal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span>Sell Signal</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
