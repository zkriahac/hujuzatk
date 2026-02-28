import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface RequestWithUser extends Request {
  user?: {
    tenantId: string;
    email: string;
    iat: number;
    exp: number;
  };
}

export function authenticateToken(
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) {
  // Skip auth for introspection queries in dev
  if (process.env.NODE_ENV !== 'production') {
    const body = req.body as any;
    if (body?.operationName === 'IntrospectionQuery') {
      return next();
    }
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1]; // Bearer TOKEN

  // Allow unauthenticated queries for mutations like register/login
  if (!token) {
    req.user = undefined;
    return next();
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET!) as {
      tenantId: string;
      email: string;
      iat: number;
      exp: number;
    };
    req.user = verified;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    return res.status(403).json({ error: 'Token verification failed' });
  }
}

export function requireAuth(req: RequestWithUser): boolean {
  return !!req.user;
}

export function requireAdmin(tenantId: string, userTenantId: string): boolean {
  return tenantId === userTenantId;
}
