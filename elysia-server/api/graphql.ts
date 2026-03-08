import type { IncomingMessage, ServerResponse } from 'http';
import { yoga } from '../graphql';

export const config = {
  api: { bodyParser: false },
};

const ALLOWED_ORIGINS = [
  'https://hujuzatk.com',
  'https://www.hujuzatk.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const origin = req.headers['origin'] as string | undefined;

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGINS.includes(origin!) ? origin! : ALLOWED_ORIGINS[0]);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
    res.statusCode = 204;
    res.end();
    return;
  }

  // Collect body manually
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = Buffer.concat(chunks);

  // Build a Web Request for yoga.fetch
  const host = req.headers['host'] || 'localhost';
  const url = `https://${host}${req.url || '/graphql'}`;
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) {
    if (v) headers.set(k, Array.isArray(v) ? v[0] : v);
  }

  const webReq = new Request(url, {
    method: req.method!,
    headers,
    body: req.method !== 'GET' && req.method !== 'HEAD' ? body : undefined,
  });

  const webRes = await yoga.fetch(webReq);

  // Write response
  res.statusCode = webRes.status;
  webRes.headers.forEach((value: string, key: string) => res.setHeader(key, value));
  // Set CORS on actual response too
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  const responseBody = await webRes.text();
  res.end(responseBody);
}
