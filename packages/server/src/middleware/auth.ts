import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../db/mysql';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: number };
    const users = await query('SELECT id, username, email, role FROM users WHERE id = ?', [decoded.userId]);
    
    if (users.length === 0) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    req.user = users[0] as { id: number; username: string; email: string; role: string };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}
