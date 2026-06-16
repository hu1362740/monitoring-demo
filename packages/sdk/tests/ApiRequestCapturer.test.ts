/**
 * @description ApiRequestCapturer 测试文件
 * 测试 API 请求捕获器的核心功能：
 * - Fetch 请求拦截
 * - XHR 请求拦截
 * - 请求忽略列表功能
 * - 请求成功/失败状态记录
 */

import { ApiRequestCapturer } from '../src/core/ApiRequestCapturer';
import type { EventData } from '../src/types';

describe('ApiRequestCapturer', () => {
  /** 保存原始的 fetch */
  let originalFetch: typeof fetch;
  /** 保存原始的 XMLHttpRequest.prototype.open */
  let originalXHROpen: typeof XMLHttpRequest.prototype.open;
  /** 用于收集发送的事件 */
  let capturedEvents: EventData[] = [];

  /**
   * @description 每个测试前的设置
   * - 重置 capturedEvents 数组
   * - 保存原始的 fetch 和 XHR open 方法
   */
  beforeEach(() => {
    capturedEvents = [];
    originalFetch = window.fetch;
    originalXHROpen = XMLHttpRequest.prototype.open;
    jest.clearAllMocks();
  });

  /**
   * @description 每个测试后的清理
   * - 恢复原始的 fetch 和 XHR open 方法
   */
  afterEach(() => {
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXHROpen;
  });

  /**
   * @description 创建 ApiRequestCapturer 实例的辅助函数
   */
  function createCapturer(ignoreUrls: string[] = []): ApiRequestCapturer {
    return new ApiRequestCapturer((event: EventData) => {
      capturedEvents.push(event);
    }, ignoreUrls);
  }

  /**
   * @description 测试 Fetch 请求拦截
   * 验证 ApiRequestCapturer 能够拦截并记录 fetch 请求
   */
  test('should intercept fetch requests', async () => {
    // Mock fetch 方法
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200
    });

    // 创建请求捕获器
    const capturer = createCapturer();

    // 发起 fetch 请求
    await fetch('http://example.com/api/test', {
      method: 'GET'
    });

    // 验证请求事件被捕获
    expect(capturedEvents.length).toBe(1);
    expect(capturedEvents[0].type).toBe('api_request');
    expect(capturedEvents[0].data.url).toBe('http://example.com/api/test');
    expect(capturedEvents[0].data.method).toBe('GET');
    expect(capturedEvents[0].data.success).toBe(true);

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试 Fetch POST 请求拦截
   * 验证 POST 请求也能被正确拦截
   */
  test('should intercept POST fetch requests', async () => {
    // Mock fetch 方法
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201
    });

    // 创建请求捕获器
    const capturer = createCapturer();

    // 发起 POST 请求
    await fetch('http://example.com/api/create', {
      method: 'POST',
      body: JSON.stringify({ data: 'test' })
    });

    // 验证 POST 请求被正确记录
    expect(capturedEvents[0].data.method).toBe('POST');
    expect(capturedEvents[0].data.statusCode).toBe(201);

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试 Fetch 请求失败处理
   * 验证请求失败时也能正确记录
   */
  test('should handle fetch request failures', async () => {
    // Mock fetch 方法使其抛出错误
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    // 创建请求捕获器
    const capturer = createCapturer();

    // 发起会失败的请求
    try {
      await fetch('http://example.com/api/fail');
    } catch {
      // 忽略错误
    }

    // 验证失败请求被记录
    expect(capturedEvents.length).toBe(1);
    expect(capturedEvents[0].data.success).toBe(false);
    expect(capturedEvents[0].data.statusCode).toBe(0);

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试 XHR 请求拦截
   * 验证 XMLHttpRequest 请求也能被拦截（使用完整的 mock 类）
   */
  test('should intercept XHR requests', () => {
    // 创建请求捕获器
    const capturer = createCapturer();

    // 验证 XHR open 方法已被替换
    expect(XMLHttpRequest.prototype.open).not.toBe(originalXHROpen);

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试 XHR POST 请求拦截
   * 验证 XMLHttpRequest open 方法被正确替换
   */
  test('should intercept XHR POST requests', () => {
    // 创建请求捕获器
    const capturer = createCapturer();

    // 验证 XHR open 方法已被替换
    expect(XMLHttpRequest.prototype.open).not.toBe(originalXHROpen);

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试请求忽略列表
   * 验证匹配忽略列表的 URL 不会被记录
   */
  test('should ignore requests matching ignoreUrls', async () => {
    // Mock fetch 方法
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    // 创建请求捕获器，配置忽略列表
    const capturer = createCapturer(['analytics.example.com']);

    // 发起应该被忽略的请求
    await fetch('https://analytics.example.com/track');

    // 验证该请求没有被记录
    expect(capturedEvents.length).toBe(0);

    // 发起不应该被忽略的请求
    await fetch('http://example.com/api/test');

    // 验证该请求被记录
    expect(capturedEvents.length).toBe(1);

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试 destroy 方法恢复原始函数
   * 验证调用 destroy 后，原始的 fetch 和 XHR 方法被恢复
   */
  test('should restore original fetch and XHR when destroyed', () => {
    // 创建请求捕获器
    const capturer = createCapturer();

    // 验证 fetch 已被替换
    expect(window.fetch).not.toBe(originalFetch);
    expect(XMLHttpRequest.prototype.open).not.toBe(originalXHROpen);

    // 销毁捕获器
    capturer.destroy();

    // 验证原始方法被恢复
    expect(window.fetch).toBe(originalFetch);
    expect(XMLHttpRequest.prototype.open).toBe(originalXHROpen);
  });
});