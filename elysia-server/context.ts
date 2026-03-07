import jwt from 'jsonwebtoken';
import { prisma } from './prisma';

export interface Context {
  prisma: typeof prisma;
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

export const createContext = (req: any, res: any): Context => {
  let user: Context['user'];

  // Extract JWT from Authorization header (Web API Request uses .get())
  const authHeader = req?.headers?.get
    ? req.headers.get('authorization')
    : req?.headers?.authorization;
  const token = authHeader?.split(' ')[1];

  if (token) {
    try {
      user = jwt.verify(token, process.env.JWT_SECRET!) as Context['user'];
    } catch {
      user = undefined;
    }
  }

  return {
    prisma,
    user,
    tenantId: user?.tenantId,
    req,
    res,
  };
};
