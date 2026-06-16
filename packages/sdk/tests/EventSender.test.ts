import { EventSender } from '../src/core/EventSender';

describe('EventSender', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  test('should queue events', () => {
    const sender = new EventSender({
      apiKey: 'test',
      endpoint: 'http://test.com',
      enabled: true,
      debug: false,
      sampleRate: 1.0,
      batchSize: 20,
      batchInterval: 5000,
      maxRetries: 3,
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: false,
      ignoreUrls: [],
      beforeSend: (data) => data
    });

    const event = { type: 'test', timestamp: Date.now(), data: {} };
    sender.send(event);
    
    expect(fetch).not.toHaveBeenCalled();
  });

  test('should flush when batch size is reached', async () => {
    const sender = new EventSender({
      apiKey: 'test',
      endpoint: 'http://test.com',
      enabled: true,
      debug: false,
      sampleRate: 1.0,
      batchSize: 2,
      batchInterval: 5000,
      maxRetries: 3,
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: false,
      ignoreUrls: [],
      beforeSend: (data) => data
    });

    sender.send({ type: 'test1', timestamp: Date.now(), data: {} });
    sender.send({ type: 'test2', timestamp: Date.now(), data: {} });

    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(fetch).toHaveBeenCalled();
  });

  test('should set and clear user info', () => {
    const sender = new EventSender({
      apiKey: 'test',
      endpoint: 'http://test.com',
      enabled: true,
      debug: false,
      sampleRate: 1.0,
      batchSize: 20,
      batchInterval: 5000,
      maxRetries: 3,
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: false,
      ignoreUrls: [],
      beforeSend: (data) => data
    });

    sender.setUser({ id: '123' });
    sender.clearUser();
  });
});
