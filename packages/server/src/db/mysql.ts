import mysql from 'mysql2/promise';
import { config } from '../config';

/**
 * @description MySQL 连接池实例，使用 mysql2/promise 创建，支持异步操作
 * - waitForConnections: 连接耗尽时排队等待而非立即报错
 * - connectionLimit: 最大连接数为 10
 * - queueLimit: 等待队列无限制（0 表示不限制）
 */
export const pool = mysql.createPool({
  host: config.mysql.host,
  port: config.mysql.port,
  database: config.mysql.database,
  user: config.mysql.user,
  password: config.mysql.password,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * @description 执行 SELECT 等查询语句，返回结果行数组
 * @param {string} sql - SQL 查询语句，支持 ? 占位符
 * @param {unknown[]} [params] - 查询参数数组，按顺序替换 SQL 中的占位符
 * @returns {Promise<T[]>} 查询结果行数组，泛型 T 为行数据类型
 * @throws {Error} 当 SQL 执行失败时抛出数据库错误
 * @example
 * const users = await query<{ id: number; name: string }>('SELECT * FROM users WHERE id = ?', [1]);
 */
export async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(sql, params as mysql.ExecuteValues[]);
    return rows as T[];
  } finally {
    // 无论查询成功或失败，都必须释放连接回连接池，避免连接泄漏
    connection.release();
  }
}

/**
 * @description 执行 INSERT / UPDATE / DELETE 等写操作语句，返回结果集头信息
 * @param {string} sql - SQL 写操作语句，支持 ? 占位符
 * @param {unknown[]} [params] - 参数数组，按顺序替换 SQL 中的占位符
 * @returns {Promise<mysql.ResultSetHeader>} 包含 insertId、affectedRows 等信息的结果头
 * @throws {Error} 当 SQL 执行失败时抛出数据库错误
 * @example
 * const result = await execute('INSERT INTO users (name) VALUES (?)', ['Alice']);
 * console.log(result.insertId);
 */
export async function execute(sql: string, params?: unknown[]): Promise<mysql.ResultSetHeader> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(sql, params as mysql.ExecuteValues[]);
    return result as mysql.ResultSetHeader;
  } finally {
    // 确保连接释放，防止连接池耗尽
    connection.release();
  }
}
