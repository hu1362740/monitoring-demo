import { Router } from 'express';
import { createMetric, getMetrics, getPerformanceSummary } from '../controllers/performanceController';

const router = Router();

router.post('/metrics', createMetric);
router.get('/metrics', getMetrics);
router.get('/metrics/summary', getPerformanceSummary);

export default router;
