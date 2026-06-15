import { Router } from 'express';
import { createMetric, getMetrics, getPerformanceSummary } from '../controllers/performanceController';

/**
 * @description 性能指标相关路由，包含指标上报、查询和汇总统计接口
 * - POST /metrics：上报单条性能指标
 * - GET /metrics：查询性能指标列表
 * - GET /metrics/summary：获取性能指标汇总统计
 */
const router = Router();

router.post('/metrics', createMetric);
router.get('/metrics', getMetrics);
// summary 路由必须定义在 /metrics 之后，避免被 /metrics 路由提前匹配
router.get('/metrics/summary', getPerformanceSummary);

export default router;
