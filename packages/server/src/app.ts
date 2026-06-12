import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth';
import eventRoutes from './routes/events';
import metricRoutes from './routes/metrics';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', eventRoutes);
app.use('/api/v1', metricRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: Error, req: express.Request, res: express.Response) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
