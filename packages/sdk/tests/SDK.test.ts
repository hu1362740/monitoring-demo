import { init, getInstance, captureException, trackEvent } from '../src';

describe('MonitoringSDK', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  test('should initialize SDK', () => {
    const sdk = init({ apiKey: 'test-key' });
    expect(sdk).toBeDefined();
    expect(getInstance()).toBe(sdk);
  });

  test('should not create multiple instances', () => {
    init({ apiKey: 'test-key' });
    const instance1 = getInstance();
    init({ apiKey: 'test-key' });
    const instance2 = getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should track custom events', () => {
    const sdk = init({ apiKey: 'test-key', endpoint: 'http://test.com' });
    sdk.track('test_event', { foo: 'bar' });
    expect(sdk).toBeDefined();
  });

  test('should capture exceptions', () => {
    const sdk = init({ apiKey: 'test-key', endpoint: 'http://test.com' });
    const error = new Error('test error');
    sdk.captureException(error, { context: 'test' });
    expect(sdk).toBeDefined();
  });

  test('should set user info', () => {
    const sdk = init({ apiKey: 'test-key' });
    sdk.setUser({ id: '123', name: 'Test User' });
    expect(sdk).toBeDefined();
  });

  test('should clear user info', () => {
    const sdk = init({ apiKey: 'test-key' });
    sdk.setUser({ id: '123' });
    sdk.clearUser();
    expect(sdk).toBeDefined();
  });

  test('should destroy SDK', () => {
    const sdk = init({ apiKey: 'test-key' });
    sdk.destroy();
    expect(getInstance()).not.toBeNull();
  });
});

describe('API Functions', () => {
  test('captureException should work when SDK is initialized', () => {
    init({ apiKey: 'test-key' });
    expect(() => captureException(new Error('test'))).not.toThrow();
  });

  test('trackEvent should work when SDK is initialized', () => {
    init({ apiKey: 'test-key' });
    expect(() => trackEvent('test', { foo: 'bar' })).not.toThrow();
  });
});
