import { mysqlTable, varchar, int, decimal, datetime, boolean, text, timestamp, primaryKey } from 'drizzle-orm/mysql-core';

// Users table
export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  name: varchar('name', { length: 255 }),
  passwordHash: varchar('password_hash', { length: 255 }),
  oauthProvider: varchar('oauth_provider', { length: 50 }),
  oauthId: varchar('oauth_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
});

// Stock data table - for caching historical data
export const stockData = mysqlTable('stock_data', {
  id: int('id').primaryKey().autoincrement(),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  datetime: datetime('datetime').notNull(),
  open: decimal('open', { precision: 20, scale: 6 }).notNull(),
  high: decimal('high', { precision: 20, scale: 6 }).notNull(),
  low: decimal('low', { precision: 20, scale: 6 }).notNull(),
  close: decimal('close', { precision: 20, scale: 6 }).notNull(),
  volume: decimal('volume', { precision: 20, scale: 0 }).notNull(),
  rsi: decimal('rsi', { precision: 10, scale: 4 }),
  atr: decimal('atr', { precision: 20, scale: 6 }),
  ama: decimal('ama', { precision: 20, scale: 6 }),
  upper: decimal('upper', { precision: 20, scale: 6 }),
  lower: decimal('lower', { precision: 20, scale: 6 }),
  pivotHigh: boolean('pivot_high').default(false),
  pivotLow: boolean('pivot_low').default(false),
  signal: varchar('signal', { length: 10 }),
  currency: varchar('currency', { length: 10 }),
});

// Watchlist table
export const watchlist = mysqlTable('watchlist', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
});

// Alerts table
export const alerts = mysqlTable('alerts', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  priceLevel: decimal('price_level', { precision: 20, scale: 6 }).notNull(),
  direction: varchar('direction', { length: 10 }).notNull(), // 'above' or 'below'
  triggered: boolean('triggered').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  triggeredAt: datetime('triggered_at'),
});

// Search history table
export const searchHistory = mysqlTable('search_history', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  searchedAt: timestamp('searched_at').defaultNow().notNull(),
});

// Favorites table
export const favorites = mysqlTable('favorites', {
  id: int('id').primaryKey().autoincrement(),
  userId: int('user_id').notNull().references(() => users.id),
  ticker: varchar('ticker', { length: 20 }).notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
});

// Types for Drizzle
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type StockDataRow = typeof stockData.$inferSelect;
export type NewStockDataRow = typeof stockData.$inferInsert;
export type WatchlistItem = typeof watchlist.$inferSelect;
export type NewWatchlistItem = typeof watchlist.$inferInsert;
export type AlertItem = typeof alerts.$inferSelect;
export type NewAlertItem = typeof alerts.$inferInsert;
