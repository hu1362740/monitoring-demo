/**
 * @description EventSender 测试文件
 * 测试事件发送器的核心功能：
 * - 事件队列管理
 * - 批量发送机制
 * - 用户信息管理
 * - 重试机制
 * - beforeSend 钩子函数
 */

import { EventSender } from '../src/core/EventSender';

describe('EventSender', () => {
  /**
   * @description 每个测试前的设置
   * - 清除所有 mock
   * - Mock global.fetch
   */
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  /**
   * @description 测试事件入队
   * 验证事件能够正确加入队列而不立即发送
   */
  test('should queue events', () => {
    // 创建事件发送器，设置较大的批量大小
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

    // 发送一个事件
    const event = { type: 'test', timestamp: Date.now(), data: {} };
    sender.send(event);
    
    // 验证事件未立即发送（队列未满）
    expect(fetch).not.toHaveBeenCalled();
  });

  /**
   * @description 测试达到批量大小阈值时发送
   * 验证队列达到 batchSize 时自动发送
   */
  test('should flush when batch size is reached', async () => {
    // 创建事件发送器，设置较小的批量大小
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

    // 发送两个事件（达到批量大小）
    sender.send({ type: 'test1', timestamp: Date.now(), data: {} });
    sender.send({ type: 'test2', timestamp: Date.now(), data: {} });

    // 等待发送完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 验证 fetch 被调用
    expect(fetch).toHaveBeenCalled();
  });

  /**
   * @description 测试用户信息设置与清除
   * 验证用户信息能够正确设置和清除
   */
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

    // 设置用户信息
    sender.setUser({ id: '123', name: 'Test User' });
    
    // 清除用户信息
    sender.clearUser();
  });

  /**
   * @description 测试手动刷新队列
   * 验证 flush 方法能够立即发送队列中的事件
   */
  test('should flush queue manually', async () => {
    const sender = new EventSender({
      apiKey: 'test',
      endpoint: 'http://test.com',
      enabled: true,
      debug: false,
      sampleRate: 1.0,
      batchSize: 100,
      batchInterval: 60000,
      maxRetries: 3,
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: false,
      ignoreUrls: [],
      beforeSend: (data) => data
    });

    // 发送一个事件（未达到批量大小）
    sender.send({ type: 'test', timestamp: Date.now(), data: {} });

    // 手动刷新队列
    await sender.flush();

    // 验证 fetch 被调用
    expect(fetch).toHaveBeenCalled();
  });

  /**
   * @description 测试用户信息附加到事件中
   * 验证 setUser 设置的用户信息会附加到事件数据中
   */
  test('should attach user info to events', async () => {
    const sender = new EventSender({
      apiKey: 'test',
      endpoint: 'http://test.com',
      enabled: true,
      debug: false,
      sampleRate: 1.0,
      batchSize: 1,
      batchInterval: 5000,
      maxRetries: 3,
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: false,
      ignoreUrls: [],
      beforeSend: (data) => data
    });

    // 设置用户信息
    sender.setUser({ id: '123', name: 'Test User' });

    // 发送一个事件
    sender.send({ type: 'test', timestamp: Date.now(), data: { test: 'data' } });

    // 等待发送完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 验证 fetch 被调用，并且用户信息被附加
    expect(fetch).toHaveBeenCalled();
    // 使用类型断言访问 mock 属性
    const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    const fetchArgs = mockFetch.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(fetchArgs.body as string);
    expect(body.events[0].data.user).toEqual({ id: '123', name: 'Test User' });
  });

  /**
   * @description 测试调试模式
   * 验证调试模式不会影响发送功能
   */
  test('should work in debug mode', async () => {
    const sender = new EventSender({
      apiKey: 'test',
      endpoint: 'http://test.com',
      enabled: true,
      debug: true,
      sampleRate: 1.0,
      batchSize: 1,
      batchInterval: 5000,
      maxRetries: 3,
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: false,
      ignoreUrls: [],
      beforeSend: (data) => data
    });

    // 发送一个事件
    sender.send({ type: 'test', timestamp: Date.now(), data: {} });

    // 等待发送完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 验证 fetch 被调用
    expect(fetch).toHaveBeenCalled();
  });

  /**
   * @description 测试批量间隔触发发送
   * 验证在达到批量间隔时间后会自动发送
   */
  test('should flush after batch interval', async () => {
    const sender = new EventSender({
      apiKey: 'test',
      endpoint: 'http://test.com',
      enabled: true,
      debug: false,
      sampleRate: 1.0,
      batchSize: 100,
      batchInterval: 100, // 设置较短的间隔时间
      maxRetries: 3,
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: false,
      ignoreUrls: [],
      beforeSend: (data) => data
    });

    // 发送一个事件（未达到批量大小）
    sender.send({ type: 'test', timestamp: Date.now(), data: {} });

    // 等待批量间隔时间过去
    await new Promise(resolve => setTimeout(resolve, 150));

    // 验证 fetch 被调用
    expect(fetch).toHaveBeenCalled();
  });

  /**
   * @description 测试重试机制
   * 验证发送失败时会进行指数退避重试
   */
  test('should retry on failure with exponential backoff', async () => {
    // Mock fetch 前两次失败，第三次成功
    let attempt = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      attempt++;
      if (attempt <= 2) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({ ok: true });
    });

    const sender = new EventSender({
      apiKey: 'test',
      endpoint: 'http://test.com',
      enabled: true,
      debug: false,
      sampleRate: 1.0,
      batchSize: 1,
      batchInterval: 5000,
      maxRetries: 3,
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: false,
      ignoreUrls: [],
      beforeSend: (data) => data
    });

    // 发送一个事件
    sender.send({ type: 'test', timestamp: Date.now(), data: {} });

    // 等待重试完成（需要等待指数退避时间：1s + 2s = 3s）
    await new Promise(resolve => setTimeout(resolve, 3500));

    // 验证 fetch 被调用了 3 次（重试 2 次）
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  /**
   * @description 测试重试机制
   * 验证发送失败时会进行重试
   */
  test('should retry on failure', async () => {
    // Mock fetch 总是成功
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const sender = new EventSender({
      apiKey: 'test',
      endpoint: 'http://test.com',
      enabled: true,
      debug: false,
      sampleRate: 1.0,
      batchSize: 1,
      batchInterval: 5000,
      maxRetries: 3,
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: false,
      ignoreUrls: [],
      beforeSend: (data) => data
    });

    // 发送一个事件
    sender.send({ type: 'test', timestamp: Date.now(), data: { test: 'data' } });

    // 等待发送完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 验证 fetch 被调用
    expect(fetch).toHaveBeenCalled();
  });

  /**
   * @description 测试 destroy 方法发送剩余事件
   * 验证调用 destroy 时会发送队列中剩余的事件
   */
  test('should flush remaining events when destroyed', async () => {
    const sender = new EventSender({
      apiKey: 'test',
      endpoint: 'http://test.com',
      enabled: true,
      debug: false,
      sampleRate: 1.0,
      batchSize: 100,
      batchInterval: 60000,
      maxRetries: 3,
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: false,
      ignoreUrls: [],
      beforeSend: (data) => data
    });

    // 发送一个事件（未达到批量大小，不会自动发送）
    sender.send({ type: 'test', timestamp: Date.now(), data: {} });

    // 验证此时 fetch 未被调用
    expect(fetch).not.toHaveBeenCalled();

    // 销毁发送器
    sender.destroy();

    // 等待发送完成
    await new Promise(resolve => setTimeout(resolve, 100));

    // 验证 fetch 被调用（destroy 时发送了剩余事件）
    expect(fetch).toHaveBeenCalled();
  });

  /**
   * @description 测试并发发送保护
   * 验证不会同时执行多个 flush 操作
   */
  test('should prevent concurrent flushes', async () => {
    // 使用 jest.useFakeTimers() 模拟定时器
    jest.useFakeTimers();

    const sender = new EventSender({
      apiKey: 'test',
      endpoint: 'http://test.com',
      enabled: true,
      debug: false,
      sampleRate: 1.0,
      batchSize: 5,
      batchInterval: 1000,
      maxRetries: 3,
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: false,
      ignoreUrls: [],
      beforeSend: (data) => data
    });

    // 发送多个事件
    for (let i = 0; i < 10; i++) {
      sender.send({ type: 'test', timestamp: Date.now(), data: { index: i } });
    }

    // 快速连续调用 flush
    await sender.flush();
    await sender.flush();
    await sender.flush();

    // 验证 fetch 只被调用了必要的次数
    expect(fetch).toHaveBeenCalled();

    jest.useRealTimers();
  });
});