import { Request, Response } from 'express';
import { query, execute } from '../db/mysql';
import { AuthRequest } from '../middleware/auth';

function generateApiKey(): string {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16)
  ).join('');
}

function generateProjectId(): string {
  return `project-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export async function createProject(req: AuthRequest, res: Response): Promise<void> {
  const { name } = req.body;

  if (!name) {
    res.status(400).json({ error: 'Project name is required' });
    return;
  }

  const projectId = generateProjectId();
  const apiKey = generateApiKey();
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

  await execute(
    'INSERT INTO projects (id, name, api_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
    [projectId, name, apiKey, timestamp, timestamp]
  );

  res.status(201).json({
    id: projectId,
    name,
    apiKey,
    createdAt: timestamp
  });
}

export async function getProjects(req: AuthRequest, res: Response): Promise<void> {
  const projects = await query(
    'SELECT id, name, api_key, created_at, updated_at FROM projects ORDER BY created_at DESC',
    []
  );

  res.json({ projects });
}

export async function getProject(req: AuthRequest, res: Response): Promise<void> {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  const projects = await query(
    'SELECT id, name, api_key, created_at, updated_at FROM projects WHERE id = ?',
    [projectId]
  );

  if (projects.length === 0) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  res.json(projects[0]);
}

export async function updateProject(req: AuthRequest, res: Response): Promise<void> {
  const projectId = req.params.id;
  const { name } = req.body;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  const existingProjects = await query(
    'SELECT id FROM projects WHERE id = ?',
    [projectId]
  );

  if (existingProjects.length === 0) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  await execute(
    'UPDATE projects SET name = ?, updated_at = ? WHERE id = ?',
    [name, updatedAt, projectId]
  );

  res.json({
    id: projectId,
    name,
    updatedAt
  });
}

export async function deleteProject(req: AuthRequest, res: Response): Promise<void> {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  const existingProjects = await query(
    'SELECT id FROM projects WHERE id = ?',
    [projectId]
  );

  if (existingProjects.length === 0) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  await execute('DELETE FROM projects WHERE id = ?', [projectId]);

  res.json({ message: 'Project deleted successfully' });
}

export async function regenerateApiKey(req: AuthRequest, res: Response): Promise<void> {
  const projectId = req.params.id;

  if (!projectId) {
    res.status(400).json({ error: 'Project ID is required' });
    return;
  }

  const existingProjects = await query(
    'SELECT id FROM projects WHERE id = ?',
    [projectId]
  );

  if (existingProjects.length === 0) {
    res.status(404).json({ error: 'Project not found' });
    return;
  }

  const newApiKey = generateApiKey();
  const updatedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

  await execute(
    'UPDATE projects SET api_key = ?, updated_at = ? WHERE id = ?',
    [newApiKey, updatedAt, projectId]
  );

  res.json({ apiKey: newApiKey });
}