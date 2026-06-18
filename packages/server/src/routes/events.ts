import { Router } from 'express';
import { receiveEvents, getEvents, getErrorStats, getApiRequests, getApiRequestStats } from '../controllers/eventController';

/**
 * @description 事件相关路由，包含事件上报、事件查询和错误统计接口
 * - POST /events：批量接收客户端上报的事件
 * - GET /events：分页查询事件列表
 * - GET /errors/stats：获取错误统计数据
 * - GET /api-requests：获取API请求列表
 * - GET /api-requests/stats：获取API请求统计数据
 */
const router = Router();

router.post('/events', receiveEvents);
router.get('/events', getEvents);
router.get('/errors/stats', getErrorStats);
router.get('/api-requests', getApiRequests);
router.get('/api-requests/stats', getApiRequestStats);

export default router;
