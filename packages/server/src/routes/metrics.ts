import { Router } from 'express';
import { createMetric, getMetrics, getPerformanceSummary, getPerformanceTrend } from '../controllers/performanceController';

/**
 * @description 性能指标相关路由，包含指标上报、查询和汇总统计接口
 * - POST /metrics：上报单条性能指标
 * - GET /metrics：查询性能指标列表
 * - GET /metrics/summary：获取性能指标汇总统计
 * - GET /metrics/trend：获取性能指标时间趋势
 */
const router = Router();

router.post('/metrics', createMetric);
router.get('/metrics', getMetrics);
router.get('/metrics/summary', getPerformanceSummary);
router.get('/metrics/trend', getPerformanceTrend);

export default router;
