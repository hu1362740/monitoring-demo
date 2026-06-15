import { Router } from 'express';
import { login, register, getProfile } from '../controllers/authController';
import { authenticate } from '../middleware/auth';

/**
 * @description 认证相关路由，包含登录、注册和个人信息获取接口
 * - POST /login：用户登录，获取 JWT
 * - POST /register：用户注册
 * - GET /profile：获取当前用户信息（需认证）
 */
const router = Router();

router.post('/login', login);
router.post('/register', register);
// profile 接口需要 JWT 认证，authenticate 中间件会解析 token 并注入 req.user
router.get('/profile', authenticate, getProfile);

export default router;
