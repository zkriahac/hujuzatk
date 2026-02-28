import express, { Express } from 'express';
import { ApolloServer } from 'apollo-server-express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import typeDefs from './schema/typeDefs';
import resolvers from './resolvers';
import { authenticateToken, RequestWithUser } from './middleware/auth';
import { contextFromRequest } from './context';

dotenv.config();

const prisma = new PrismaClient();

interface ApolloContext {
  prisma: PrismaClient;
  user?: {
    tenantId: string;
    email: string;
    iat: number;
    exp: number;
  };
  tenantId?: string;
  req?: any;
  res?: any;
}

// Initialize Express app
const app: Express = express();

// Middleware
const corsOrigin = process.env.NODE_ENV === 'development' 
  ? /^http:\/\/localhost:\d{4,5}$/ // Allow any localhost port in development
  : (process.env.FRONTEND_URL || 'http://localhost:5174');

app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// JWT Authentication middleware
app.use('/graphql', authenticateToken);

// Initialize Apollo Server
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req, res }: any): Promise<ApolloContext> => {
    return contextFromRequest({ req, res, prisma });
  },
  introspection: process.env.NODE_ENV !== 'production',
  formatError: (formattedError) => {
    console.error('GraphQL Error:', formattedError);
    return {
      message: formattedError.message,
      code: (formattedError.extensions?.code) || 'INTERNAL_SERVER_ERROR',
      path: formattedError.path,
    };
  },
});

// Start server
async function startServer() {
  try {
    await server.start();
    
    server.applyMiddleware({
      app: app as any,
      path: process.env.GRAPHQL_PATH || '/graphql',
      cors: false, // Already handled above
    });

    const PORT = parseInt(process.env.PORT || '4000', 10);
    await new Promise<void>((resolve) => {
      app.listen(PORT, () => {
        console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
        console.log(`📡 Environment: ${process.env.NODE_ENV}`);
        console.log(`🔐 JWT Expiry: ${process.env.JWT_EXPIRE}`);
        resolve();
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\\n🛑 Shutting down on SIGTERM...');
  await prisma.$disconnect();
  await server.stop();
  process.exit(0);
});

startServer();

export { app, prisma, server };
