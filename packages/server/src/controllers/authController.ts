import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query, execute } from '../db/mysql';

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const users = await query('SELECT id, username, email, password_hash, role FROM users WHERE email = ?', [email]);
  
  if (users.length === 0) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const user = users[0] as { id: number; username: string; email: string; password_hash: string; role: string };
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn as any });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email, and password are required' });
    return;
  }

  const existingUsers = await query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
  
  if (existingUsers.length > 0) {
    res.status(409).json({ error: 'User already exists' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  
  const result = await execute(
    'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
    [username, email, passwordHash, 'viewer']
  );

  res.status(201).json({
    id: result.insertId,
    username,
    email,
    role: 'viewer'
  });
}

export async function getProfile(req: Request & { user?: { id: number; username: string; email: string; role: string } }, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json(req.user);
}
