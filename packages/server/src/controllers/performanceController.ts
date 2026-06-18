import { Request, Response } from 'express';
import { query, execute } from '../db/mysql';
import { getCache, setCache } from '../db/redis';

/**
 * @description 创建一条性能指标记录，用于接收客户端上报的性能数据
 * @param {Request} req - Express 请求对象，body 中包含 projectId、metricType、value、data
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回创建成功状态
 * @example
 * // POST /api/v1/metrics
 * // Body: { "projectId": "1", "metricType": "fcp", "value": 1200, "data": {} }
 */
export async function createMetric(req: Request, res: Response): Promise<void> {
  const { projectId, metricType, value, data } = req.body;

  // 参数校验：projectId、metricType、value 为必填项
  if (!projectId || !metricType || value === undefined) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  // 将当前时间转换为 MySQL DATETIME 格式（YYYY-MM-DD HH:mm:ss）
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

  await execute(
    'INSERT INTO performance_metrics (project_id, metric_type, value, timestamp, data) VALUES (?, ?, ?, ?, ?)',
    // data 字段为可选的附加信息，为空时存储 null
    [projectId, metricType, value, timestamp, data ? JSON.stringify(data) : null]
  );

  // 更新项目指标上报时间戳缓存，用于监控面板实时状态展示，60 秒过期
  await setCache(`project:${projectId}:metrics:${metricType}`, Date.now(), 60);

  res.status(201).json({ success: true });
}

/**
 * @description 查询性能指标列表，支持按指标类型和时间范围过滤，结果缓存 5 分钟
 * @param {Request} req - Express 请求对象，query 中包含 projectId、metricType、startDate、endDate
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回符合条件的指标数据列表
 * @example
 * // GET /api/v1/metrics?projectId=1&metricType=fcp&startDate=2024-01-01&endDate=2024-01-31
 */
export async function getMetrics(req: Request, res: Response): Promise<void> {
  const { projectId, metricType, startDate, endDate } = req.query;

  // projectId 为必填参数
  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  // 缓存键包含所有过滤维度，防止不同查询条件共享缓存
  const cacheKey = `metrics:${projectId}:${metricType}:${startDate}:${endDate}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    res.json(cached);
    return;
  }

  // 动态拼接 SQL，所有过滤条件均为可选
  let sql = 'SELECT * FROM performance_metrics WHERE project_id = ?';
  const params: unknown[] = [projectId];

  if (metricType) {
    sql += ' AND metric_type = ?';
    params.push(metricType);
  }

  if (startDate) {
    sql += ' AND timestamp >= ?';
    params.push(startDate);
  }

  if (endDate) {
    sql += ' AND timestamp <= ?';
    params.push(endDate);
  }

  // 按时间倒序排列，最新数据优先展示
  sql += ' ORDER BY timestamp DESC';

  const metrics = await query(sql, params);
  await setCache(cacheKey, metrics, 300);

  res.json(metrics);
}

/**
 * @description 获取性能指标汇总统计，按指标类型分组计算平均值、最小值、最大值和样本数
 * @param {Request} req - Express 请求对象，query 中包含 projectId、startDate、endDate
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回按指标类型分组的汇总统计数据
 * @example
 * // GET /api/v1/metrics/summary?projectId=1&startDate=2024-01-01&endDate=2024-01-31
 */
/**
 * @description 获取性能指标时间趋势数据，按小时分组统计
 * @param {Request} req - Express 请求对象，query 中包含 projectId、startDate、endDate
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回按小时分组的性能指标趋势数据
 * @example
 * // GET /api/v1/metrics/trend?projectId=1&startDate=2024-01-01&endDate=2024-01-31
 */
export async function getPerformanceTrend(req: Request, res: Response): Promise<void> {
  const { projectId, startDate, endDate } = req.query;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  const cacheKey = `metrics:trend:${projectId}:${startDate}:${endDate}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    res.json(cached);
    return;
  }

  // 按小时分组，统计各指标的平均值
  const sql = `
    SELECT 
      DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
      metric_type,
      AVG(value) as avg_value
    FROM performance_metrics
    WHERE project_id = ?
      AND timestamp >= ?
      AND timestamp <= ?
    GROUP BY hour, metric_type
    ORDER BY hour ASC
  `;

  const trend = await query(sql, [projectId, `${startDate} 00:00:00`, `${endDate} 23:59:59`]);
  await setCache(cacheKey, trend, 300);

  res.json(trend);
}

export async function getPerformanceSummary(req: Request, res: Response): Promise<void> {
  const { projectId, startDate, endDate } = req.query;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  const cacheKey = `metrics:summary:${projectId}:${startDate}:${endDate}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    res.json(cached);
    return;
  }

  // 按指标类型分组聚合，计算均值、极值和样本量，用于前端图表展示
  const sql = `
    SELECT 
      metric_type,
      AVG(value) as avg_value,
      MIN(value) as min_value,
      MAX(value) as max_value,
      COUNT(*) as sample_count
    FROM performance_metrics
    WHERE project_id = ?
      AND timestamp >= ?
      AND timestamp <= ?
    GROUP BY metric_type
  `;

  const summary = await query(sql, [projectId, startDate, endDate]);
  await setCache(cacheKey, summary, 300);

  res.json(summary);
}
