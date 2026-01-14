import { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export interface Context {
  userId?: number;
  req?: CreateExpressContextOptions['req'];
  res?: CreateExpressContextOptions['res'];
}

export async function createContext({ req, res }: CreateExpressContextOptions): Promise<Context> {
  // For now, we'll use a simple user ID from header or default to 1
  // In production, this would be handled by proper authentication
  const userId = req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'] as string) : 1;

  return {
    userId,
    req,
    res,
  };
}

// Context creation for Vercel serverless (no Express req/res)
export function createVercelContext(req: Request): Context {
  const userIdHeader = req.headers.get('x-user-id');
  const userId = userIdHeader ? parseInt(userIdHeader) : 1;

  return {
    userId: isNaN(userId) ? 1 : userId,
  };
}
