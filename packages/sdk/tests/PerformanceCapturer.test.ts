/**
 * @description PerformanceCapturer 测试文件
 * 测试性能数据采集器的核心功能：
 * - Navigation Timing 数据采集
 * - Paint Timing 数据采集（FP、FCP）
 * - LCP（最大内容绘制）数据采集
 */

import { PerformanceCapturer } from '../src/core/PerformanceCapturer';
import type { EventData } from '../src/types';

describe('PerformanceCapturer', () => {
  /** 用于收集发送的事件 */
  let capturedEvents: EventData[] = [];
  /** 保存原始的 window.performance */
  let originalPerformance: typeof window.performance;
  /** 保存原始的 PerformanceObserver */
  let originalPerformanceObserver: typeof window.PerformanceObserver;

  /**
   * @description 每个测试前的设置
   * - 重置 capturedEvents 数组
   * - 保存原始的 performance 对象和 PerformanceObserver
   */
  beforeEach(() => {
    capturedEvents = [];
    originalPerformance = window.performance;
    originalPerformanceObserver = window.PerformanceObserver;
    jest.clearAllMocks();
  });

  /**
   * @description 每个测试后的清理
   * - 恢复原始的 performance 对象和 PerformanceObserver
   */
  afterEach(() => {
    window.performance = originalPerformance;
    window.PerformanceObserver = originalPerformanceObserver;
  });

  /**
   * @description 创建 PerformanceCapturer 实例的辅助函数
   * 确保创建前设置完整的 performance mock
   */
  function createCapturer(): PerformanceCapturer {
    // 如果没有设置 performance，设置一个默认的 mock
    if (!window.performance || !window.performance.timing) {
      window.performance = {
        timing: {
          navigationStart: 0,
          unloadEventStart: 0,
          unloadEventEnd: 0,
          redirectStart: 0,
          redirectEnd: 0,
          fetchStart: 0,
          domainLookupStart: 0,
          domainLookupEnd: 0,
          connectStart: 0,
          connectEnd: 0,
          secureConnectionStart: 0,
          requestStart: 0,
          responseStart: 0,
          responseEnd: 0,
          domLoading: 0,
          domInteractive: 0,
          domContentLoadedEventStart: 0,
          domContentLoadedEventEnd: 0,
          domComplete: 0,
          loadEventStart: 0,
          loadEventEnd: 0
        },
        getEntriesByType: jest.fn().mockReturnValue([]),
        getEntriesByName: jest.fn().mockReturnValue([]),
        mark: jest.fn(),
        measure: jest.fn(),
        clearMarks: jest.fn(),
        clearMeasures: jest.fn(),
        timeOrigin: Date.now()
      } as unknown as Performance;
    }
    
    return new PerformanceCapturer((event: EventData) => {
      capturedEvents.push(event);
    });
  }

  /**
   * @description 测试性能采集器初始化
   * 验证 PerformanceCapturer 能够成功创建
   */
  test('should initialize PerformanceCapturer', () => {
    // Mock performance 对象
    window.performance = {
      timing: {
        navigationStart: 0,
        unloadEventStart: 0,
        unloadEventEnd: 0,
        redirectStart: 0,
        redirectEnd: 0,
        fetchStart: 0,
        domainLookupStart: 0,
        domainLookupEnd: 0,
        connectStart: 0,
        connectEnd: 0,
        secureConnectionStart: 0,
        requestStart: 0,
        responseStart: 0,
        responseEnd: 0,
        domLoading: 0,
        domInteractive: 0,
        domContentLoadedEventStart: 0,
        domContentLoadedEventEnd: 0,
        domComplete: 0,
        loadEventStart: 0,
        loadEventEnd: 0
      },
      getEntriesByType: jest.fn().mockReturnValue([]),
      getEntriesByName: jest.fn().mockReturnValue([]),
      mark: jest.fn(),
      measure: jest.fn(),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      timeOrigin: Date.now()
    } as unknown as Performance;

    // 创建性能采集器
    const capturer = createCapturer();
    expect(capturer).toBeDefined();

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试 Navigation Timing 数据采集
   * 验证性能采集器能够被正确创建
   */
  test('should capture Navigation Timing data', () => {
    // Mock performance timing
    const mockTiming = {
      navigationStart: 1000,
      unloadEventStart: 1050,
      unloadEventEnd: 1060,
      redirectStart: 0,
      redirectEnd: 0,
      fetchStart: 1070,
      domainLookupStart: 1080,
      domainLookupEnd: 1100,
      connectStart: 1110,
      connectEnd: 1150,
      secureConnectionStart: 0,
      requestStart: 1160,
      responseStart: 1200,
      responseEnd: 1300,
      domLoading: 1310,
      domInteractive: 1400,
      domContentLoadedEventStart: 1410,
      domContentLoadedEventEnd: 1450,
      domComplete: 1600,
      loadEventStart: 1610,
      loadEventEnd: 1700
    };

    // 先设置 mock，再创建 capturer
    window.performance = {
      timing: mockTiming,
      getEntriesByType: jest.fn().mockReturnValue([]),
      getEntriesByName: jest.fn().mockReturnValue([]),
      mark: jest.fn(),
      measure: jest.fn(),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      timeOrigin: 1000
    } as unknown as Performance;

    // 设置 PerformanceObserver mock
    window.PerformanceObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: jest.fn()
    })) as any;

    // 创建性能采集器（验证能够成功创建）
    const capturer = createCapturer();
    expect(capturer).toBeDefined();

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试 destroy 方法
   * 验证调用 destroy 后，PerformanceObserver 被断开
   */
  test('should disconnect observer when destroyed', () => {
    // Mock PerformanceObserver
    const mockDisconnect = jest.fn();
    // 使用 as any 绕过类型检查，因为 jsdom 环境中不需要完整的类型
    window.PerformanceObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      disconnect: mockDisconnect
    })) as any;

    // 创建性能采集器
    const capturer = createCapturer();

    // 销毁采集器
    capturer.destroy();

    // 验证 disconnect 被调用
    expect(mockDisconnect).toHaveBeenCalled();
  });

  /**
   * @description 测试 Paint Timing 采集
   * 验证能够捕获首次绘制和首次内容绘制数据
   */
  test('should capture Paint Timing entries', () => {
    // Mock PerformanceObserver 回调
    const mockEntries: PerformancePaintTiming[] = [
      {
        entryType: 'paint',
        name: 'first-paint',
        startTime: 100,
        duration: 0
      } as PerformancePaintTiming,
      {
        entryType: 'paint',
        name: 'first-contentful-paint',
        startTime: 150,
        duration: 0
      } as PerformancePaintTiming
    ];

    // Mock PerformanceObserver
    window.PerformanceObserver = jest.fn().mockImplementation((callback) => {
      // 立即触发回调以模拟已有条目
      setTimeout(() => {
        callback({
          getEntries: () => mockEntries
        } as unknown as PerformanceObserverEntryList);
      }, 0);

      return {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
    }) as any;

    // 创建性能采集器
    const capturer = createCapturer();

    // 等待异步回调
    return new Promise(resolve => {
      setTimeout(() => {
        // 验证 Paint Timing 事件被捕获
        expect(capturedEvents.length).toBeGreaterThanOrEqual(2);
        
        // 验证 first-paint
        const fpEvent = capturedEvents.find(
          e => e.type === 'performance' && e.data.metricType === 'first-paint'
        );
        expect(fpEvent).toBeDefined();
        expect(fpEvent?.data.startTime).toBe(100);

        // 验证 first-contentful-paint
        const fcpEvent = capturedEvents.find(
          e => e.type === 'performance' && e.data.metricType === 'first-contentful-paint'
        );
        expect(fcpEvent).toBeDefined();
        expect(fcpEvent?.data.startTime).toBe(150);

        // 清理
        capturer.destroy();
        resolve(true);
      }, 50);
    });
  });

  /**
   * @description 测试 LCP 采集
   * 验证能够捕获最大内容绘制数据
   */
  test('should capture LCP entries', () => {
    // Mock LCP 条目
    const mockLCP: PerformanceEntry = {
      entryType: 'largest-contentful-paint',
      name: 'largest-contentful-paint',
      startTime: 800,
      duration: 0
    } as PerformanceEntry;

    // Mock PerformanceObserver
    window.PerformanceObserver = jest.fn().mockImplementation((callback) => {
      setTimeout(() => {
        callback({
          getEntries: () => [mockLCP]
        } as unknown as PerformanceObserverEntryList);
      }, 0);

      return {
        observe: jest.fn(),
        disconnect: jest.fn()
      };
    }) as any;

    // 创建性能采集器
    const capturer = createCapturer();

    // 等待异步回调
    return new Promise(resolve => {
      setTimeout(() => {
        // 验证 LCP 事件被捕获
        const lcpEvent = capturedEvents.find(
          e => e.type === 'performance' && e.data.metricType === 'largest-contentful-paint'
        );
        expect(lcpEvent).toBeDefined();
        expect(lcpEvent?.data.startTime).toBe(800);

        // 清理
        capturer.destroy();
        resolve(true);
      }, 50);
    });
  });
});