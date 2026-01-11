# Trading Pivot Points Analysis Platform

A professional, industry-grade trading analysis platform that fetches real-time stock data from Yahoo Finance, calculates pivot points using an advanced algorithm, and displays results in both tabular and visual formats with a clean, broker-like UI.

![Platform Screenshot](docs/screenshot.png)

## Features

- Real-time stock data from Yahoo Finance
- Advanced pivot point calculation with ATR, AMA, and RSI indicators
- Interactive candlestick charts with trendlines
- Buy/Sell/Hold signal generation
- Watchlist management
- Price alerts system
- Mobile-responsive dark theme UI
- Data export functionality

## Supported Instruments

- Stock indices (e.g., ^NSEI - Nifty 50)
- Individual stocks (e.g., AAPL, GOOGL)
- Cryptocurrencies (e.g., BTC-USD, ETH-USD)
- Forex pairs (e.g., EURUSD=X)

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Recharts for data visualization
- TanStack Query for data fetching

### Backend
- Express.js with TypeScript
- tRPC for type-safe APIs
- Yahoo Finance API integration
- Drizzle ORM (optional database)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd allSpot
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Start development server:
```bash
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Development Scripts

```bash
# Start development (frontend + backend)
npm run dev

# Start frontend only
npm run dev:client

# Start backend only
npm run dev:server

# Build for production
npm run build

# Start production server
npm start

# Type check
npm run typecheck

# Lint code
npm run lint
```

## Project Structure

```
allSpot/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and tRPC client
│   │   └── App.tsx         # Main application
│   └── index.html
├── server/                 # Express backend
│   ├── db/                 # Database schema
│   ├── services/           # Business logic
│   │   ├── pivotCalculator.ts  # Pivot point algorithm
│   │   └── yahooFinance.ts     # Yahoo Finance integration
│   ├── trpc/               # tRPC routers
│   └── index.ts            # Server entry point
├── shared/                 # Shared types
│   └── types.ts
├── api/                    # Vercel serverless functions
└── package.json
```

## Algorithm

The pivot point calculation algorithm includes:

1. **Adaptive Moving Average (AMA)**: Dynamic moving average that adapts to market volatility
2. **Relative Strength Index (RSI)**: 14-period momentum indicator
3. **Average True Range (ATR)**: Volatility measurement for slope calculation
4. **Pivot Points Detection**: Local high/low extrema over 14 periods
5. **Trendline Calculation**: Upper and lower bounds based on pivot points and ATR slope

### Signal Generation

- **Buy Signal**: Price breaks above the upper trendline bound
- **Sell Signal**: Price breaks below the lower trendline bound
- **RSI Filter**: Signals are converted to Hold when RSI > 70 (overbought) or RSI < 30 (oversold)

## Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

The project is configured for Vercel with serverless functions for the API.

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| DATABASE_URL | MySQL connection string | Optional |
| JWT_SECRET | Secret for JWT tokens | Optional |
| PORT | Server port (default: 3001) | No |

## API Endpoints

### Stock Data
- `GET /trpc/stock.getPivotAnalysis` - Get pivot analysis with indicators
- `GET /trpc/stock.getHistoricalData` - Get raw OHLC data
- `GET /trpc/stock.getStockInfo` - Get stock metadata
- `GET /trpc/stock.search` - Search for symbols

### Watchlist (Authenticated)
- `GET /trpc/watchlist.getAll` - Get user's watchlist
- `POST /trpc/watchlist.add` - Add ticker to watchlist
- `POST /trpc/watchlist.remove` - Remove ticker from watchlist

### Alerts (Authenticated)
- `GET /trpc/alerts.getActive` - Get active alerts
- `POST /trpc/alerts.create` - Create price alert
- `POST /trpc/alerts.dismiss` - Dismiss alert

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues and feature requests, please open a GitHub issue.
