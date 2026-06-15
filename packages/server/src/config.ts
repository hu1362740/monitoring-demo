import dotenv from 'dotenv';

// 加载 .env 环境变量文件，使环境变量可通过 process.env 访问
dotenv.config();

/**
 * @description 应用全局配置对象，包含服务器端口、JWT 密钥、MySQL 和 Redis 连接信息
 */
export const config = {
  /** 服务端口号，默认 3000 */
  port: parseInt(process.env.PORT || '3000', 10),
  /** JWT 签名密钥 */
  jwtSecret: process.env.JWT_SECRET || 'monitoring-secret-key',
  /** JWT 令牌过期时间 */
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',

  /** MySQL 数据库连接配置 */
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: parseInt(process.env.MYSQL_PORT || '3306', 10),
    database: process.env.MYSQL_DATABASE || 'monitoring',
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || 'root'
  },

  /** Redis 缓存连接配置 */
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10)
  }
};
