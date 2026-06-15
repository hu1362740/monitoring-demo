import app from './app';
import { config } from './config';
import { connectRedis } from './db/redis';

/**
 * @description 启动服务器，先连接 Redis 缓存，再启动 Express HTTP 服务
 * @returns {Promise<void>} 无返回值
 * @throws {Error} 当服务器启动过程中发生致命错误时，进程将退出
 * @example
 * // 通常在应用入口直接调用
 * startServer();
 */
async function startServer(): Promise<void> {
  try {
    // Redis 连接失败不应阻止服务启动，仅记录错误日志
    await connectRedis();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }

  // 启动 HTTP 服务并监听配置端口
  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

// 捕获启动过程中的未处理异常，确保进程以非零状态码退出
startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
