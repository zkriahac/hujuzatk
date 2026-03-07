import type { VercelRequest, VercelResponse } from '@vercel/node';
import { yoga } from '../graphql';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return yoga.handleNodeRequestAndResponse(req, res);
}
