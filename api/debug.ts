import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const results: Record<string, unknown> = {
    nodeVersion: process.version,
    cwd: process.cwd(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL,
    },
  };

  // Test imports one by one
  try {
    const { appRouter } = await import('../../server/trpc/router');
    results.appRouterLoaded = true;
    results.appRouterProcedures = Object.keys(appRouter._def.procedures || {});
  } catch (error: unknown) {
    results.appRouterLoaded = false;
    results.appRouterError = error instanceof Error ? error.message : String(error);
    results.appRouterStack = error instanceof Error ? error.stack : undefined;
  }

  try {
    const { createVercelContext } = await import('../../server/trpc/context');
    results.contextLoaded = true;
    results.contextType = typeof createVercelContext;
  } catch (error: unknown) {
    results.contextLoaded = false;
    results.contextError = error instanceof Error ? error.message : String(error);
  }

  try {
    const { fetchRequestHandler } = await import('@trpc/server/adapters/fetch');
    results.trpcAdapterLoaded = true;
    results.fetchRequestHandlerType = typeof fetchRequestHandler;
  } catch (error: unknown) {
    results.trpcAdapterLoaded = false;
    results.trpcAdapterError = error instanceof Error ? error.message : String(error);
  }

  try {
    const superjson = await import('superjson');
    results.superjsonLoaded = true;
  } catch (error: unknown) {
    results.superjsonLoaded = false;
    results.superjsonError = error instanceof Error ? error.message : String(error);
  }

  return res.status(200).json(results);
}
