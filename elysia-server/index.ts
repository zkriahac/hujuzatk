import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { yoga } from './graphql';

const app = new Elysia()
  .use(cors({ origin: true }))
  .get('/health', () => ({ status: 'ok', timestamp: new Date().toISOString() }))
  .all('/graphql', async ({ request, set }) => {
    const response = await yoga.handle(request);
    set.status = response.status;
    response.headers.forEach((value, key) => set.headers[key] = value);
    // Always return a string (JSON) for Elysia
    return await response.text();
  })
  .listen(process.env.PORT ? Number(process.env.PORT) : 4000);

console.log(`🚀 Elysia server running at http://localhost:${process.env.PORT || 4000}`);
