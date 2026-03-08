import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { yoga } from './graphql';

const ALLOWED_ORIGINS = [
  'https://hujuzatk.com',
  'https://www.hujuzatk.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

const app = new Elysia()
  .use(cors({
    origin: (request: Request) => {
      const origin = request.headers.get('origin') || '';
      return !origin || ALLOWED_ORIGINS.includes(origin);
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    maxAge: 86400,
  }))
  .onError(({ code, error, set }) => {
    const timestamp = new Date().toISOString();
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return { error: 'Route not found', timestamp };
    }
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: 'Validation error', details: error.message, timestamp };
    }
    console.error(`[${timestamp}] Unhandled error (${code}):`, error);
    set.status = 500;
    return { error: 'Internal server error', timestamp };
  })
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .all('/graphql', async ({ request, set }) => {
    const response = await yoga.handle(request);
    set.status = response.status;
    response.headers.forEach((value, key) => set.headers[key] = value);
    return await response.text();
  })
  .listen(process.env.PORT ? Number(process.env.PORT) : 4000);

console.log(`Server running at http://localhost:${process.env.PORT || 4000}`);
