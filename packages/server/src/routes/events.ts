import { Router } from 'express';
import { receiveEvents, getEvents, getErrorStats } from '../controllers/eventController';

/**
 * @description 事件相关路由，包含事件上报、事件查询和错误统计接口
 * - POST /events：批量接收客户端上报的事件
 * - GET /events：分页查询事件列表
 * - GET /errors/stats：获取错误统计数据
 */
const router = Router();

router.post('/events', receiveEvents);
router.get('/events', getEvents);
router.get('/errors/stats', getErrorStats);

export default router;
