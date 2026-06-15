import mysql from 'mysql2/promise';
import { config } from '../config';

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

export async function query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(sql, params as mysql.ExecuteValues[]);
    return rows as T[];
  } finally {
    connection.release();
  }
}

export async function execute(sql: string, params?: unknown[]): Promise<mysql.ResultSetHeader> {
  const connection = await pool.getConnection();
  try {
    const [result] = await connection.execute(sql, params as mysql.ExecuteValues[]);
    return result as mysql.ResultSetHeader;
  } finally {
    connection.release();
  }
}
