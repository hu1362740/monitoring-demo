import { Request, Response } from 'express';
import { query, execute } from '../db/mysql';
import { getCache, setCache } from '../db/redis';

interface EventData {
  type: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export async function receiveEvents(req: Request, res: Response): Promise<void> {
  const { apiKey, events } = req.body;

  if (!apiKey || !events || !Array.isArray(events)) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const projects = await query('SELECT id FROM projects WHERE api_key = ?', [apiKey]);
  
  if (projects.length === 0) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  const projectId = (projects[0] as { id: string }).id;

  const promises = events.map((event: EventData) => {
    const timestamp = new Date(event.timestamp).toISOString().slice(0, 19).replace('T', ' ');
    return execute(
      'INSERT INTO events (type, project_id, timestamp, data) VALUES (?, ?, ?, ?)',
      [event.type, projectId, timestamp, JSON.stringify(event.data)]
    );
  });

  await Promise.all(promises);

  await setCache(`project:${projectId}:events:count`, Date.now(), 60);

  res.status(200).json({ received: events.length });
}

export async function getEvents(req: Request, res: Response): Promise<void> {
  const { projectId, type, limit = 100, offset = 0 } = req.query;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  const cacheKey = `events:${projectId}:${type}:${limit}:${offset}`;
  const cached = await getCache<{ events: unknown[]; total: number }>(cacheKey);

  if (cached) {
    res.json(cached);
    return;
  }

  let sql = 'SELECT * FROM events WHERE project_id = ?';
  const params: unknown[] = [projectId];

  if (type) {
    sql += ' AND type = ?';
    params.push(type);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

  const events = await query(sql, params);

  const countSql = 'SELECT COUNT(*) as total FROM events WHERE project_id = ?' + (type ? ' AND type = ?' : '');
  const countParams = type ? [projectId, type] : [projectId];
  const countResult = await query(countSql, countParams);
  const total = (countResult[0] as { total: number }).total;

  const result = { events, total };
  await setCache(cacheKey, result, 300);

  res.json(result);
}

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
