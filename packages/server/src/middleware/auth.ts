import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { query } from '../db/mysql';

/**
 * @description 扩展 Express Request 类型，附加经过身份验证后的用户信息
 */
export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

/**
 * @description JWT 身份认证中间件，从 Authorization 头提取并验证 Bearer Token，
 *              验证通过后将用户信息挂载到 req.user 上
 * @param {AuthRequest} req - 扩展后的 Express 请求对象
 * @param {Response} res - Express 响应对象
 * @param {NextFunction} next - Express 下一个中间件函数
 * @returns {Promise<void>} 认证通过后调用 next() 继续处理
 * @example
 * // 在需要认证的路由中使用
 * router.get('/profile', authenticate, getProfile);
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  // 检查 Authorization 头是否存在且以 "Bearer " 开头
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // 截取 "Bearer " 之后的 token 部分（跳过前 7 个字符）
  const token = authHeader.substring(7);

  try {
    // 验证 JWT 签名并解码出 userId
    const decoded = jwt.verify(token, config.jwtSecret) as { userId: number };
    // 根据 userId 从数据库查询用户最新信息，确保用户仍然有效
    const users = await query('SELECT id, username, email, role FROM users WHERE id = ?', [decoded.userId]);

    if (users.length === 0) {
      // 用户不存在（可能已被删除），拒绝访问
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // 将用户信息挂载到请求对象，供后续中间件和控制器使用
    req.user = users[0] as { id: number; username: string; email: string; role: string };
    next();
  } catch (error) {
    // Token 过期、签名无效或格式错误等情况
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * @description 角色权限校验中间件工厂函数，生成一个检查用户角色的中间件。
 *              admin 角色拥有所有权限，无需额外匹配。
 * @param {string} role - 要求的目标角色名称
 * @returns {(req: AuthRequest, res: Response, next: NextFunction) => void} 角色校验中间件
 * @example
 * // 仅允许 admin 角色访问
 * router.delete('/users/:id', authenticate, requireRole('admin'), deleteUser);
 */
export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      // 未通过身份认证（authenticate 中间件未执行或失败）
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // admin 角色拥有最高权限，可以访问任何角色专属接口
    if (req.user.role !== role && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}
