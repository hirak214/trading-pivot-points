import type { VercelRequest, VercelResponse } from '@vercel/node';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter, createContext } from '../lib/router';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Build the full URL from request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    const url = `${protocol}://${host}${req.url}`;

    // Convert headers to a format suitable for Request constructor
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => headers.append(key, v));
        } else {
          headers.set(key, value);
        }
      }
    }

    // Create a Web Request from Vercel Request
    const webRequest = new Request(url, {
      method: req.method || 'GET',
      headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' && req.body
        ? JSON.stringify(req.body)
        : undefined,
    });

    // Use tRPC's fetchRequestHandler with the self-contained appRouter
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: webRequest,
      router: appRouter,
      createContext: ({ req }) => createContext(req),
    });

    // Set response status
    res.status(response.status);

    // Copy headers from the tRPC response
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Send the response body
    const body = await response.text();
    return res.send(body);
  } catch (error: unknown) {
    console.error('tRPC handler error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json([
      {
        error: {
          message: errorMessage,
          code: 'INTERNAL_SERVER_ERROR',
        },
      },
    ]);
  }
}
