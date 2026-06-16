import { Router } from 'express';
import { 
  createProject, 
  getProjects, 
  getProject, 
  updateProject, 
  deleteProject,
  regenerateApiKey 
} from '../controllers/projectController';
import { authenticate } from '../middleware/auth';

/**
 * @description 项目管理相关路由，包含项目的 CRUD 操作
 * - POST /projects：创建新项目（需认证）
 * - GET /projects：获取当前用户的项目列表（需认证）
 * - GET /projects/:id：获取指定项目详情（需认证）
 * - PUT /projects/:id：更新项目信息（需认证）
 * - DELETE /projects/:id：删除项目（需认证）
 * - POST /projects/:id/regenerate-api-key：重新生成 API Key（需认证）
 */
const router = Router();

// 创建项目
router.post('/projects', authenticate, createProject);

// 获取项目列表
router.get('/projects', authenticate, getProjects);

// 获取单个项目详情
router.get('/projects/:id', authenticate, getProject);

// 更新项目
router.put('/projects/:id', authenticate, updateProject);

// 删除项目
router.delete('/projects/:id', authenticate, deleteProject);

// 重新生成 API Key
router.post('/projects/:id/regenerate-api-key', authenticate, regenerateApiKey);

export default router;