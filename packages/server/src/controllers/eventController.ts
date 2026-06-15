import { Request, Response } from 'express';
import { query, execute } from '../db/mysql';
import { getCache, setCache } from '../db/redis';

/**
 * @description 事件数据结构定义，用于接收客户端上报的事件数据
 */
interface EventData {
  /** 事件类型，如 'error'、'click'、'pageview' 等 */
  type: string;
  /** 事件发生的时间戳（毫秒或 ISO 字符串） */
  timestamp: number;
  /** 事件附带的自定义数据 */
  data: Record<string, unknown>;
}

/**
 * @description 接收并批量存储客户端上报的事件数据，通过 API Key 验证项目身份
 * @param {Request} req - Express 请求对象，body 中包含 apiKey 和 events 数组
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回接收到的事件数量
 * @example
 * // POST /api/v1/events
 * // Body: { "apiKey": "xxx", "events": [{ "type": "error", "timestamp": 1700000000000, "data": {} }] }
 */
export async function receiveEvents(req: Request, res: Response): Promise<void> {
  const { apiKey, events } = req.body;

  // 参数校验：apiKey 必须存在，events 必须为非空数组
  if (!apiKey || !events || !Array.isArray(events)) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  // 通过 API Key 查找对应项目，验证上报权限
  const projects = await query('SELECT id FROM projects WHERE api_key = ?', [apiKey]);

  if (projects.length === 0) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  const projectId = (projects[0] as { id: string }).id;

  // 并发写入所有事件，提升批量上报的吞吐性能
  const promises = events.map((event: EventData) => {
    // 将时间戳转换为 MySQL DATETIME 格式（YYYY-MM-DD HH:mm:ss）
    const timestamp = new Date(event.timestamp).toISOString().slice(0, 19).replace('T', ' ');
    return execute(
      'INSERT INTO events (type, project_id, timestamp, data) VALUES (?, ?, ?, ?)',
      [event.type, projectId, timestamp, JSON.stringify(event.data)]
    );
  });

  // 等待所有写入操作完成，任一失败将抛出异常
  await Promise.all(promises);

  // 更新项目事件计数缓存，用于前端实时展示上报状态，60 秒过期
  await setCache(`project:${projectId}:events:count`, Date.now(), 60);

  res.status(200).json({ received: events.length });
}

/**
 * @description 分页查询项目事件列表，支持按事件类型过滤，结果会缓存 5 分钟
 * @param {Request} req - Express 请求对象，query 中包含 projectId、type、limit、offset
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回事件列表和总数
 * @example
 * // GET /api/v1/events?projectId=1&type=error&limit=20&offset=0
 */
export async function getEvents(req: Request, res: Response): Promise<void> {
  const { projectId, type, limit = 100, offset = 0 } = req.query;

  // projectId 为必填参数
  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  // 构建缓存键，包含所有查询维度，确保不同查询条件不会命中同一缓存
  const cacheKey = `events:${projectId}:${type}:${limit}:${offset}`;
  const cached = await getCache<{ events: unknown[]; total: number }>(cacheKey);

  // 缓存命中时直接返回，减少数据库压力
  if (cached) {
    res.json(cached);
    return;
  }

  // 动态拼接 SQL，type 为可选过滤条件
  let sql = 'SELECT * FROM events WHERE project_id = ?';
  const params: unknown[] = [projectId];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  // 按时间倒序排列，最新的排在前面，并应用分页参数
  sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

  const events = await query(sql, params);

  // 单独查询总数，用于前端分页组件展示总页数
  const countSql = 'SELECT COUNT(*) as total FROM events WHERE project_id = ?' + (type ? ' AND type = ?' : '');
  const countParams = type ? [projectId, type] : [projectId];
  const countResult = await query(countSql, countParams);
  const total = (countResult[0] as { total: number }).total;

  const result = { events, total };
  // 缓存查询结果 300 秒（5 分钟），平衡数据新鲜度与性能
  await setCache(cacheKey, result, 300);

  res.json(result);
}

/**
 * @description 获取指定项目在时间范围内的错误统计信息，按错误类型分组聚合
 * @param {Request} req - Express 请求对象，query 中包含 projectId、startDate、endDate
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回按错误类型分组的统计数据
 * @example
 * // GET /api/v1/errors/stats?projectId=1&startDate=2024-01-01&endDate=2024-01-31
 */
export async function getErrorStats(req: Request, res: Response): Promise<void> {
  const { projectId, startDate, endDate } = req.query;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  const cacheKey = `errors:stats:${projectId}:${startDate}:${endDate}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    res.json(cached);
    return;
  }

  // 按错误类型分组，统计每种错误的出现次数和总发生次数，按次数降序排列
  const sql = `
    SELECT error_type, COUNT(*) as count, SUM(count) as total_occurrences
    FROM errors
    WHERE project_id = ?
      AND timestamp >= ?
      AND timestamp <= ?
    GROUP BY error_type
    ORDER BY count DESC
  `;

  const stats = await query(sql, [projectId, startDate, endDate]);
  await setCache(cacheKey, stats, 300);

  res.json(stats);
}
