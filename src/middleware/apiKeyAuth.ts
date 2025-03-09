// middleware/apiKeyAuth.ts
import { Request, Response, NextFunction } from 'express';

export const apiKeyAuth = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const apiKey = req.headers['api-key'];

  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  if (apiKey !== process.env.SHARED_API_KEY) {
    res.status(403).json({ error: 'Invalid API key' });
    return;
  }

  next();
};
