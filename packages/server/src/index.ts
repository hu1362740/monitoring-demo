import app from './app';
import { config } from './config';
import { connectRedis } from './db/redis';

async function startServer(): Promise<void> {
  try {
    await connectRedis();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
