import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import metricRoutes from './routes/metrics';

const app = express();

// 启用跨域资源共享
app.use(cors());
// 限制请求体大小为 10MB，防止超大 payload 攻击
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 注册 API 路由，按功能模块划分
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', eventRoutes);
app.use('/api/v1', metricRoutes);

/**
 * @description 健康检查接口，用于负载均衡器或监控系统探测服务存活状态
 * @param {express.Request} req - Express 请求对象
 * @param {express.Response} res - Express 响应对象
 * @returns {void} 返回包含状态和时间戳的 JSON
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

/**
 * @description 404 兜底处理，匹配所有未被路由处理的请求
 * @param {express.Request} req - Express 请求对象
 * @param {express.Response} res - Express 响应对象
 * @returns {void} 返回 404 状态码和错误信息
 */
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

/**
 * @description 全局错误处理中间件，捕获未被处理的异常并返回 500 响应
 * @param {Error} err - 捕获到的错误对象
 * @param {express.Request} req - Express 请求对象
 * @param {express.Response} res - Express 响应对象
 * @returns {void} 返回 500 状态码和错误信息
 */
app.use((err: Error, req: express.Request, res: express.Response) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
