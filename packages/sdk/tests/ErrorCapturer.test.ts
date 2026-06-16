/**
 * @description ErrorCapturer 测试文件
 * 测试错误捕获器的核心功能：
 * - 同步 JavaScript 错误捕获
 * - Promise 未处理拒绝捕获
 * - 资源加载错误捕获
 */

import { ErrorCapturer } from '../src/core/ErrorCapturer';
import type { EventData } from '../src/types';

describe('ErrorCapturer', () => {
  /** 保存原始的 window.onerror */
  let originalOnError: typeof window.onerror;
  /** 保存原始的 window.onunhandledrejection */
  let originalOnUnhandledRejection: typeof window.onunhandledrejection;
  /** 用于收集发送的事件 */
  let capturedEvents: EventData[] = [];

  /**
   * @description 每个测试前的设置
   * - 重置 capturedEvents 数组
   * - 保存原始的 window 错误处理器
   * - 创建 ErrorCapturer 实例
   */
  beforeEach(() => {
    capturedEvents = [];
    originalOnError = window.onerror;
    originalOnUnhandledRejection = window.onunhandledrejection;
  });

  /**
   * @description 每个测试后的清理
   * - 恢复原始的 window 错误处理器
   */
  afterEach(() => {
    window.onerror = originalOnError;
    window.onunhandledrejection = originalOnUnhandledRejection;
  });

  /**
   * @description 创建 ErrorCapturer 实例的辅助函数
   */
  function createCapturer(): ErrorCapturer {
    return new ErrorCapturer((event: EventData) => {
      capturedEvents.push(event);
    });
  }

  /**
   * @description 测试同步 JavaScript 错误捕获
   * 验证 ErrorCapturer 能够捕获 window.onerror 触发的错误
   */
  test('should capture synchronous JavaScript errors', () => {
    // 创建错误捕获器
    const capturer = createCapturer();

    // 模拟一个同步错误
    const testError = new Error('Test synchronous error');
    window.onerror?.(
      testError.message,
      'test.js',
      10,
      20,
      testError
    );

    // 验证错误事件被捕获
    expect(capturedEvents.length).toBe(1);
    expect(capturedEvents[0].type).toBe('error');
    expect(capturedEvents[0].data.type).toBe('Error');
    expect(capturedEvents[0].data.message).toBe('Test synchronous error');

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试 Promise 未处理拒绝捕获
   * 验证 ErrorCapturer 能够捕获未处理的 Promise rejection
   */
  test('should capture unhandled promise rejections', () => {
    // 创建错误捕获器
    const capturer = createCapturer();

    // 模拟一个未处理的 Promise rejection（使用空对象避免未捕获的 rejection）
    // 使用字符串作为 reason，验证字符串类型的 rejection 也能被捕获
    window.onunhandledrejection?.({
      reason: 'Test promise rejection',
      promise: {} as Promise<unknown>
    } as unknown as PromiseRejectionEvent);

    // 验证 rejection 事件被捕获
    expect(capturedEvents.length).toBe(1);
    expect(capturedEvents[0].type).toBe('error');
    expect(capturedEvents[0].data.type).toBe('PromiseRejection');
    expect(capturedEvents[0].data.message).toBe('Test promise rejection');

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试资源加载错误捕获
   * 验证 ErrorCapturer 能够捕获资源加载失败事件
   */
  test('should capture resource loading errors', () => {
    // 创建错误捕获器
    const capturer = createCapturer();

    // 模拟资源加载错误（最后一个参数使用 undefined 而非 null）
    window.onerror?.('Failed to load resource', 'http://example.com/missing.png', 0, 0, undefined);

    // 验证资源错误事件被捕获
    expect(capturedEvents.length).toBe(1);
    expect(capturedEvents[0].type).toBe('error');
    expect(capturedEvents[0].data.message).toBe('Failed to load resource');
    expect(capturedEvents[0].data.filename).toBe('http://example.com/missing.png');

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试错误数据包含 URL 和 UserAgent
   * 验证捕获的错误数据包含当前页面 URL 和浏览器信息
   */
  test('should include url and userAgent in error data', () => {
    // 创建错误捕获器
    const capturer = createCapturer();

    // 触发错误
    window.onerror?.('Test error', 'test.js', 1, 1, new Error('Test'));

    // 验证错误数据包含必要信息
    expect(capturedEvents[0].data.url).toBe(window.location.href);
    expect(capturedEvents[0].data.userAgent).toBe(navigator.userAgent);

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试 destroy 方法恢复原始处理器
   * 验证调用 destroy 后，原始的 onerror 处理器被恢复
   */
  test('should restore original handlers when destroyed', () => {
    // 记录原始处理器
    const mockHandler = jest.fn();
    window.onerror = mockHandler;

    // 创建并销毁错误捕获器
    const capturer = createCapturer();
    capturer.destroy();

    // 验证原始处理器被恢复
    expect(window.onerror).toBe(mockHandler);
  });
});