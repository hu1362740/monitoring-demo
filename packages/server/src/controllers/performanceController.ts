import { Request, Response } from 'express';
import { query, execute } from '../db/mysql';
import { getCache, setCache } from '../db/redis';

export async function createMetric(req: Request, res: Response): Promise<void> {
  const { projectId, metricType, value, data } = req.body;

  if (!projectId || !metricType || value === undefined) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }

  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

  await execute(
    'INSERT INTO performance_metrics (project_id, metric_type, value, timestamp, data) VALUES (?, ?, ?, ?, ?)',
    [projectId, metricType, value, timestamp, data ? JSON.stringify(data) : null]
  );

  await setCache(`project:${projectId}:metrics:${metricType}`, Date.now(), 60);

  res.status(201).json({ success: true });
}

export async function getMetrics(req: Request, res: Response): Promise<void> {
  const { projectId, metricType, startDate, endDate } = req.query;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  const cacheKey = `metrics:${projectId}:${metricType}:${startDate}:${endDate}`;
  const cached = await getCache(cacheKey);

  if (cached) {
    res.json(cached);
    return;
  }

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

  sql += ' ORDER BY timestamp DESC';

  const metrics = await query(sql, params);
  await setCache(cacheKey, metrics, 300);

  res.json(metrics);
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
