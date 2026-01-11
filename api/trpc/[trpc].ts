import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from '../../server/trpc/router';

const handler = createExpressMiddleware({
  router: appRouter,
  createContext: ({ req }) => ({
    userId: req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : 1,
    req,
    res: null as any,
  }),
});

export default function (req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return handler(req as any, res as any);
}
