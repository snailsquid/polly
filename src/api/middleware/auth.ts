import { Request, Response, NextFunction } from 'express';
import { env } from '../../env';

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    res.status(401).json({ error: 'Missing x-user-id header' });
    return;
  }

  if (!env.WHITELIST_USER_IDS.includes(userId)) {
    res.status(403).json({ error: 'User not whitelisted' });
    return;
  }

  next();
}

export function writeAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const userId = req.headers['x-user-id'] as string;

  if (!userId) {
    res.status(401).json({ error: 'Missing x-user-id header' });
    return;
  }

  if (!env.WHITELIST_USER_IDS.includes(userId)) {
    res.status(403).json({ error: 'User not whitelisted' });
    return;
  }

  next();
}