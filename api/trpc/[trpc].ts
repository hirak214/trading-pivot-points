import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/trpc/router';
import { createContext } from '../../server/trpc/context';

export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: async () => {
      const userId = req.headers.get('x-user-id');
      return {
        userId: userId ? parseInt(userId) : 1,
        req: req as any,
        res: null as any,
      };
    },
  });
}
