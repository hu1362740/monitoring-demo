import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query, execute } from '../db/mysql';

/**
 * @description 用户登录接口，验证邮箱和密码，成功后签发 JWT 令牌
 * @param {Request} req - Express 请求对象，body 中包含 email 和 password
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回 JWT token 和用户基本信息
 * @example
 * // POST /api/v1/auth/login
 * // Body: { "email": "user@example.com", "password": "123456" }
 */
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body;

  // 参数校验：邮箱和密码均为必填项
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  // 根据邮箱查询用户记录，包含密码哈希用于后续比对
  const users = await query('SELECT id, username, email, password_hash, role FROM users WHERE email = ?', [email]);

  if (users.length === 0) {
    // 用户不存在时返回 401，避免泄露"用户是否存在"的信息
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  const user = users[0] as { id: number; username: string; email: string; password_hash: string; role: string };
  // 使用 bcrypt 比对明文密码与存储的哈希值
  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    // 密码错误时同样返回 401，与用户不存在保持一致，防止枚举攻击
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  // 签发 JWT，payload 中仅包含 userId，避免敏感信息泄露
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

/**
 * @description 用户注册接口，创建新用户账户，默认角色为 viewer
 * @param {Request} req - Express 请求对象，body 中包含 username、email、password
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回新创建的用户信息
 * @example
 * // POST /api/v1/auth/register
 * // Body: { "username": "alice", "email": "alice@example.com", "password": "123456" }
 */
export async function register(req: Request, res: Response): Promise<void> {
  const { username, email, password } = req.body;

  // 参数校验：三个字段均为必填
  if (!username || !email || !password) {
    res.status(400).json({ error: 'Username, email, and password are required' });
    return;
  }

  // 检查邮箱或用户名是否已被占用，防止重复注册
  const existingUsers = await query('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);

  if (existingUsers.length > 0) {
    res.status(409).json({ error: 'User already exists' });
    return;
  }

  // 使用 bcrypt 对密码进行哈希，salt rounds 为 12 以平衡安全性与性能
  const passwordHash = await bcrypt.hash(password, 12);

  // 插入新用户，默认角色为 viewer（只读权限）
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

/**
 * @description 获取当前已认证用户的个人信息
 * @param {Request & { user?: { id: number; username: string; email: string; role: string } }} req - 包含 user 属性的请求对象（由 authenticate 中间件注入）
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回当前用户信息
 * @example
 * // GET /api/v1/auth/profile（需携带 JWT）
 */
export async function getProfile(req: Request & { user?: { id: number; username: string; email: string; role: string } }, res: Response): Promise<void> {
  if (!req.user) {
    // 未认证用户无法获取个人资料，正常情况不会进入此分支（authenticate 中间件已拦截）
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json(req.user);
}
