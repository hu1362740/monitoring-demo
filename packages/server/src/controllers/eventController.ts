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
 * @description 根据事件类型分发存储到对应的数据表
 * @param {EventData} event - 事件数据
 * @param {string} projectId - 项目 ID
 * @returns {Promise<void>}
 */
async function processEvent(event: EventData, projectId: string): Promise<void> {
  const timestamp = new Date(event.timestamp).toISOString().slice(0, 19).replace('T', ' ');
  
  // 统一写入 events 表（总表）
  await execute(
    'INSERT INTO events (type, project_id, timestamp, data) VALUES (?, ?, ?, ?)',
    [event.type, projectId, timestamp, JSON.stringify(event.data)]
  );

  // 根据事件类型分发到对应表
  switch (event.type) {
    case 'error':
      await handleErrorEvent(event, projectId, timestamp);
      break;
    case 'performance':
      await handlePerformanceEvent(event, projectId, timestamp);
      break;
    case 'api_request':
      await handleApiRequestEvent(event, projectId, timestamp);
      break;
    case 'click':
    case 'pageview':
    case 'form_submit':
      await handleUserBehaviorEvent(event, projectId, timestamp);
      break;
  }
}

/**
 * @description 处理错误事件，存储到 errors 表
 */
async function handleErrorEvent(event: EventData, projectId: string, timestamp: string): Promise<void> {
  const data = event.data as Record<string, unknown>;
  await execute(
    'INSERT INTO errors (project_id, error_type, message, stack, url, user_agent, timestamp, count, last_occurrence) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE count = count + 1, last_occurrence = ?, stack = IFNULL(?, stack), url = IFNULL(?, url), user_agent = IFNULL(?, user_agent)',
    [
      projectId,
      data.type || 'Error',
      data.message || '',
      data.stack || null,
      data.url || null,
      data.userAgent || null,
      timestamp,
      1,
      timestamp,
      // ON DUPLICATE KEY UPDATE 参数
      timestamp,
      data.stack || null,
      data.url || null,
      data.userAgent || null
    ]
  );
}

/**
 * @description 处理性能事件，存储到 performance_metrics 表
 */
async function handlePerformanceEvent(event: EventData, projectId: string, timestamp: string): Promise<void> {
  const data = event.data as Record<string, unknown>;
  await execute(
    'INSERT INTO performance_metrics (project_id, metric_type, value, timestamp, data) VALUES (?, ?, ?, ?, ?)',
    [
      projectId,
      data.metricType || 'unknown',
      typeof data.value === 'number' ? data.value : 0,
      timestamp,
      JSON.stringify(data)
    ]
  );
}

/**
 * @description 处理 API 请求事件，存储到 api_requests 表
 */
async function handleApiRequestEvent(event: EventData, projectId: string, timestamp: string): Promise<void> {
  const data = event.data as Record<string, unknown>;
  await execute(
    'INSERT INTO api_requests (project_id, url, method, status_code, duration, success, timestamp, data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      projectId,
      data.url || '',
      data.method || 'GET',
      typeof data.statusCode === 'number' ? data.statusCode : 0,
      typeof data.duration === 'number' ? data.duration : 0,
      data.success ? 1 : 0,
      timestamp,
      JSON.stringify(data)
    ]
  );
}

/**
 * @description 处理用户行为事件，存储到 events 表（已在主流程处理）
 */
async function handleUserBehaviorEvent(event: EventData, projectId: string, timestamp: string): Promise<void> {
  // 用户行为事件已在主流程写入 events 表
  // 这里可以添加额外的行为分析逻辑
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
    return processEvent(event, projectId);
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
  const { projectId, startDate, endDate, errorType, message } = req.query;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  const cacheKey = `errors:stats:${projectId}:${startDate}:${endDate}:${errorType || ''}:${message || ''}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    res.json(cached);
    return;
  }

  // 按错误类型分组，统计每种错误的出现次数和总发生次数，按次数降序排列
  let sql = `
    SELECT error_type, message, url, COUNT(*) as count, MAX(timestamp) as last_occurrence
    FROM errors
    WHERE project_id = ?
  `;
  const params: unknown[] = [projectId];

  if (startDate && endDate) {
    sql += ` AND timestamp >= ? AND timestamp <= ?`;
    // 结束日期需要包含当天，转换为当天的 23:59:59
    const endDateTime = `${endDate} 23:59:59`;
    params.push(`${startDate} 00:00:00`, endDateTime);
  }

  if (errorType) {
    sql += ` AND error_type = ?`;
    params.push(errorType);
  }

  if (message) {
    sql += ` AND message LIKE ?`;
    params.push(`%${message}%`);
  }

  sql += ` GROUP BY error_type, message, url ORDER BY count DESC LIMIT 100`;

  const stats = await query(sql, params);
  await setCache(cacheKey, stats, 300);

  res.json(stats);
}

/**
 * @description 获取API请求统计数据
 * @param {Request} req - Express 请求对象，query 中包含 projectId、startDate、endDate
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回统计数据
 */
export async function getApiRequestStats(req: Request, res: Response): Promise<void> {
  const { projectId, startDate, endDate } = req.query;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  let sql = `
    SELECT 
      COUNT(*) as total_count,
      AVG(duration) as avg_duration,
      SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as success_count
    FROM api_requests
    WHERE project_id = ?
  `;
  const params: unknown[] = [projectId];

  if (startDate && endDate) {
    sql += ` AND timestamp >= ? AND timestamp <= ?`;
    const endDateTime = `${endDate} 23:59:59`;
    params.push(`${startDate} 00:00:00`, endDateTime);
  }

  const stats = await query(sql, params);
  const result = stats[0] as { total_count: string; avg_duration: string; success_count: string };
  
  const totalCount = Number(result.total_count) || 0;
  
  res.json({
    totalCount,
    avgDuration: Math.round(Number(result.avg_duration) || 0),
    successRate: totalCount > 0 
      ? ((Number(result.success_count) / totalCount) * 100).toFixed(1) 
      : '0',
  });
}

/**
 * @description 获取指定项目的 API 请求列表（支持分页）
 * @param {Request} req - Express 请求对象，query 中包含 projectId、startDate、endDate、limit、offset
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回 API 请求列表及总数
 */
export async function getApiRequests(req: Request, res: Response): Promise<void> {
  const { projectId, startDate, endDate, limit = 10, offset = 0 } = req.query;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  let countSql = `SELECT COUNT(*) as total FROM api_requests WHERE project_id = ?`;
  const countParams: unknown[] = [projectId];
  
  if (startDate && endDate) {
    countSql += ` AND timestamp >= ? AND timestamp <= ?`;
    countParams.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
  }
  
  const countResult = await query(countSql, countParams);
  const total = Number((countResult[0] as { total: string }).total) || 0;

  let sql = `
    SELECT id, project_id, url, method, status_code, duration, success, timestamp, created_at
    FROM api_requests
    WHERE project_id = ?
  `;
  const params: unknown[] = [projectId];

  if (startDate && endDate) {
    sql += ` AND timestamp >= ? AND timestamp <= ?`;
    params.push(`${startDate} 00:00:00`, `${endDate} 23:59:59`);
  }

  sql += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit) || 10, Number(offset) || 0);

  const requests = await query(sql, params);
  res.json({ requests, total });
}
