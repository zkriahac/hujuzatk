import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { RequestWithUser } from './middleware/auth';

interface ContextParams {
  req: RequestWithUser;
  res: any;
  prisma: PrismaClient;
}

export interface AppContext {
  prisma: PrismaClient;
  user?: {
    tenantId: string;
    email: string;
    iat: number;
    exp: number;
  };
  tenantId?: string;
  req: RequestWithUser;
  res: any;
}

export async function contextFromRequest({
  req,
  res,
  prisma,
}: ContextParams): Promise<AppContext> {
  // Extract tenant context from JWT or request
  let user = req.user;
  
  // If user not set by middleware, try to extract from Authorization header
  if (!user) {
    const authHeader = (req.headers?.authorization || req.headers?.Authorization) as string | undefined;
    const token = authHeader?.split(' ')[1]; // Bearer TOKEN
    
    if (token) {
      try {
        user = jwt.verify(token, process.env.JWT_SECRET!) as {
          tenantId: string;
          email: string;
          iat: number;
          exp: number;
        };
      } catch (error) {
        console.warn('JWT verification failed:', error);
        user = undefined;
      }
    }
  }
  
  const tenantId = user?.tenantId;

  return {
    prisma,
    user,
    tenantId,
    req,
    res,
  };
}

/**
 * Verify user is authenticated
 */
export function requireAuth(context: AppContext): AppContext {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  return context;
}

/**
 * Verify user belongs to requested tenant
 */
export function requireTenant(context: AppContext, tenantId: string): AppContext {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  if (context.user.tenantId !== tenantId) {
    throw new Error('Unauthorized: Tenant mismatch');
  }
  return context;
}

/**
 * Verify user is super admin
 */
export async function requireSuperAdmin(context: AppContext): Promise<AppContext> {
  if (!context.user) {
    throw new Error('Authentication required');
  }
  
  const tenant = await context.prisma.tenant.findUnique({
    where: { id: context.user.tenantId },
  });

  if (!tenant?.isAdmin) {
    throw new Error('Admin access required');
  }

  return context;
}
