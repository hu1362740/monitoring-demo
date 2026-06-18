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

  // 查询所有性能指标
  const sql = `
    SELECT 
      DATE_FORMAT(timestamp, '%Y-%m-%d %H:00:00') as hour,
      metric_type,
      value,
      data
    FROM performance_metrics
    WHERE project_id = ?
      AND timestamp >= ?
      AND timestamp <= ?
    ORDER BY hour ASC
  `;

  const metrics = await query(sql, [projectId, `${startDate} 00:00:00`, `${endDate} 23:59:59`]) as Array<{ hour: string; metric_type: string; value: number; data: string }>;

  // 映射 metric_type 到标准名称
  const typeMap: Record<string, string> = {
    'first-contentful-paint': 'fcp',
    'first-paint': 'fp',
    'largest-contentful-paint': 'lcp',
    'time-to-interactive': 'tti',
    'cumulative-layout-shift': 'cls',
    'unknown': 'unknown',
  };

  // 按小时和指标类型分组
  const hourlyMap: Record<string, Record<string, { sum: number; count: number }>> = {};

  metrics.forEach((item: { hour: string; metric_type: string; value: number; data: string }) => {
    const standardType = typeMap[item.metric_type] || item.metric_type;
    
    // 优先从 data 字段获取实际值
    // item.value 是数据库的 DECIMAL 类型，需要转换为数字
    let actualValue = typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0;
    
    // data 可能已经是解析后的对象（mysql2 自动解析 JSON 字段）
    if (item.data) {
      let dataObj: any;
      if (typeof item.data === 'string') {
        try {
          dataObj = JSON.parse(item.data);
        } catch {
          dataObj = null;
        }
      } else {
        dataObj = item.data;
      }
      
      if (dataObj) {
        if (typeof dataObj.startTime === 'number' && dataObj.startTime > 0) {
          actualValue = dataObj.startTime;
        } else if (typeof dataObj.duration === 'number' && dataObj.duration > 0) {
          actualValue = dataObj.duration;
        } else if (typeof dataObj.timeToInteractive === 'number' && dataObj.timeToInteractive > 0) {
          actualValue = dataObj.timeToInteractive;
        } else if (typeof dataObj.value === 'number' && dataObj.value > 0) {
          // CLS 指标使用 value 字段
          actualValue = dataObj.value;
        }
        
        // 如果是 unknown 类型且包含 timeToInteractive，同时更新 tti 指标
        if (standardType === 'unknown' && typeof dataObj.timeToInteractive === 'number' && dataObj.timeToInteractive > 0) {
          if (!hourlyMap[item.hour]) {
            hourlyMap[item.hour] = {};
          }
          if (!hourlyMap[item.hour]['tti']) {
            hourlyMap[item.hour]['tti'] = { sum: 0, count: 0 };
          }
          hourlyMap[item.hour]['tti'].sum += dataObj.timeToInteractive;
          hourlyMap[item.hour]['tti'].count++;
        }
      }
    }

    if (!hourlyMap[item.hour]) {
      hourlyMap[item.hour] = {};
    }
    if (!hourlyMap[item.hour][standardType]) {
      hourlyMap[item.hour][standardType] = { sum: 0, count: 0 };
    }
    hourlyMap[item.hour][standardType].sum += actualValue;
    hourlyMap[item.hour][standardType].count++;
  });

  // 转换为数组格式
  const trend = Object.entries(hourlyMap).flatMap(([hour, typeMap]) => {
    return Object.entries(typeMap).map(([metric_type, stats]) => ({
      hour,
      metric_type,
      avg_value: stats.count > 0 ? stats.sum / stats.count : 0,
    }));
  });

  await setCache(cacheKey, trend, 300);

  res.json(trend);
}

/**
 * @description 获取性能指标汇总统计，按指标类型分组计算平均值、最小值、最大值和样本数
 * @param {Request} req - Express 请求对象，query 中包含 projectId、startDate、endDate
 * @param {Response} res - Express 响应对象
 * @returns {Promise<void>} 返回按指标类型分组的汇总统计数据
 * @example
 * // GET /api/v1/metrics/summary?projectId=1&startDate=2024-01-01&endDate=2024-01-31
 */
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

  // 查询所有性能指标
  const sql = `
    SELECT 
      metric_type,
      value,
      data
    FROM performance_metrics
    WHERE project_id = ?
      AND timestamp >= ?
      AND timestamp <= ?
  `;

  const metrics = await query(sql, [projectId, `${startDate} 00:00:00`, `${endDate} 23:59:59`]) as Array<{ metric_type: string; value: number; data: string }>;

  // 映射 metric_type 到标准名称
  const typeMap: Record<string, string> = {
    'first-contentful-paint': 'fcp',
    'first-paint': 'fp',
    'largest-contentful-paint': 'lcp',
    'time-to-interactive': 'tti',
    'cumulative-layout-shift': 'cls',
    'unknown': 'unknown',
  };

  // 按标准类型分组，计算平均值
  const summaryMap: Record<string, { sum: number; count: number }> = {};

  metrics.forEach((item: { metric_type: string; value: number; data: string }) => {
    const standardType = typeMap[item.metric_type] || item.metric_type;
    
    // 优先从 data 字段获取实际值（SDK 把值放在了 data.startTime 中）
    // item.value 是数据库的 DECIMAL 类型，需要转换为数字
    let actualValue = typeof item.value === 'number' ? item.value : parseFloat(String(item.value)) || 0;
    
    // data 可能已经是解析后的对象（mysql2 自动解析 JSON 字段）
    if (item.data) {
      let dataObj: any;
      if (typeof item.data === 'string') {
        try {
          dataObj = JSON.parse(item.data);
        } catch {
          dataObj = null;
        }
      } else {
        dataObj = item.data;
      }
      
      if (dataObj) {
        if (typeof dataObj.startTime === 'number' && dataObj.startTime > 0) {
          actualValue = dataObj.startTime;
        } else if (typeof dataObj.duration === 'number' && dataObj.duration > 0) {
          actualValue = dataObj.duration;
        } else if (typeof dataObj.timeToInteractive === 'number' && dataObj.timeToInteractive > 0) {
          actualValue = dataObj.timeToInteractive;
        } else if (typeof dataObj.value === 'number' && dataObj.value > 0) {
          // CLS 指标使用 value 字段
          actualValue = dataObj.value;
        }
        
        // 如果是 unknown 类型且包含 timeToInteractive，同时更新 tti 指标
        if (standardType === 'unknown' && typeof dataObj.timeToInteractive === 'number' && dataObj.timeToInteractive > 0) {
          if (!summaryMap['tti']) {
            summaryMap['tti'] = { sum: 0, count: 0 };
          }
          summaryMap['tti'].sum += dataObj.timeToInteractive;
          summaryMap['tti'].count++;
        }
      }
    }

    if (!summaryMap[standardType]) {
      summaryMap[standardType] = { sum: 0, count: 0 };
    }
    summaryMap[standardType].sum += actualValue;
    summaryMap[standardType].count++;
  });

  // 转换为数组格式
  const summary = Object.entries(summaryMap).map(([metric_type, stats]) => ({
    metric_type,
    avg_value: stats.count > 0 ? stats.sum / stats.count : 0,
    sample_count: stats.count,
  }));

  await setCache(cacheKey, summary, 300);

  res.json(summary);
}
