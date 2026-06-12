import { Router } from 'express';
import { receiveEvents, getEvents, getErrorStats } from '../controllers/eventController';

const router = Router();

router.post('/events', receiveEvents);
router.get('/events', getEvents);
router.get('/errors/stats', getErrorStats);

export default router;
