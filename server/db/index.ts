import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import 'dotenv/config';

// Create connection pool
const poolConnection = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Create drizzle instance
export const db = drizzle(poolConnection, { schema, mode: 'default' });

// Export schema for use in queries
export * from './schema';
