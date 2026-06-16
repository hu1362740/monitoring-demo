/**
 * @description 性能采集模块，负责捕获页面加载性能指标（Navigation Timing、Paint Timing、LCP）
 */

import type { EventData, PerformanceData } from '../types';

/** LCP 性能条目类型定义 */
interface LCPPerformanceEntry extends PerformanceEntry {
  /** 最大内容绘制元素 */
  element?: Element;
  /** 元素大小 */
  size: number;
}

/**
 * @description 性能采集器类，通过 Performance API 和 PerformanceObserver 采集性能数据
 */
export class PerformanceCapturer {
  /** 事件发送回调函数 */
  private sendEvent: (event: EventData) => void;
  /** PerformanceObserver 实例，用于监听 paint 和 LCP 事件 */
  private observer?: PerformanceObserver;

  /**
   * @description 创建性能采集器实例并立即开始监听
   * @param sendEvent - 事件发送回调函数
   */
  constructor(sendEvent: (event: EventData) => void) {
    this.sendEvent = sendEvent;
    this.setup();
  }

  /**
   * @description 设置性能监听器，包括 Navigation Timing 和 PerformanceObserver
   */
  private setup(): void {
    if (window.performance) {
      // 页面加载完成后采集 Navigation Timing 数据
      window.addEventListener('load', () => {
        this.captureNavigationTiming();
      });

      // 使用 PerformanceObserver 监听 paint 和 LCP 事件
      if ('PerformanceObserver' in window) {
        this.observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            // 根据条目类型分发到不同的处理方法
            if (entry.entryType === 'paint') {
              this.capturePaintTiming(entry as PerformancePaintTiming);
            } else if (entry.entryType === 'largest-contentful-paint') {
              this.captureLCP(entry as LCPPerformanceEntry);
            }
          }
        });

        // 监听首次绘制和首次内容绘制
        this.observer.observe({
          type: 'paint',
          buffered: true
        });

        // 监听最大内容绘制
        this.observer.observe({
          type: 'largest-contentful-paint',
          buffered: true
        });
      }
    }
  }

  /**
   * @description 采集 Navigation Timing 数据，包含页面加载各阶段耗时
   */
  private captureNavigationTiming(): void {
    const timing = window.performance.timing;
    // 检查 timing 是否存在
    if (!timing) {
      return;
    }
    const performanceData: PerformanceData = {
      navigationStart: timing.navigationStart,
      unloadEventStart: timing.unloadEventStart,
      unloadEventEnd: timing.unloadEventEnd,
      redirectStart: timing.redirectStart,
      redirectEnd: timing.redirectEnd,
      fetchStart: timing.fetchStart,
      domainLookupStart: timing.domainLookupStart,
      domainLookupEnd: timing.domainLookupEnd,
      connectStart: timing.connectStart,
      connectEnd: timing.connectEnd,
      secureConnectionStart: timing.secureConnectionStart,
      requestStart: timing.requestStart,
      responseStart: timing.responseStart,
      responseEnd: timing.responseEnd,
      domLoading: timing.domLoading,
      domInteractive: timing.domInteractive,
      domContentLoadedEventStart: timing.domContentLoadedEventStart,
      domContentLoadedEventEnd: timing.domContentLoadedEventEnd,
      domComplete: timing.domComplete,
      loadEventStart: timing.loadEventStart,
      loadEventEnd: timing.loadEventEnd,
      // 计算可交互时间（TTI）
      timeToInteractive: timing.domInteractive - timing.navigationStart,
      firstPaint: undefined,
      firstContentfulPaint: undefined,
      largestContentfulPaint: undefined
    };

    const event: EventData = {
      type: 'performance',
      timestamp: Date.now(),
      data: {
        ...performanceData,
        // 计算关键性能指标
        metrics: {
          dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
          tcpConnection: timing.connectEnd - timing.connectStart,
          request: timing.responseEnd - timing.requestStart,
          response: timing.responseEnd - timing.responseStart,
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          pageLoad: timing.loadEventEnd - timing.navigationStart
        }
      }
    };
    this.sendEvent(event);
  }

  /**
   * @description 采集 Paint Timing 数据（FP、FCP）
   * @param entry - PerformancePaintTiming 条目
   */
  private capturePaintTiming(entry: PerformancePaintTiming): void {
    const event: EventData = {
      type: 'performance',
      timestamp: Date.now(),
      data: {
        metricType: entry.name,
        startTime: entry.startTime,
        duration: entry.duration
      }
    };
    this.sendEvent(event);
  }

  /**
   * @description 采集最大内容绘制（LCP）数据
   * @param entry - LCP 性能条目
   */
  private captureLCP(entry: LCPPerformanceEntry): void {
    const event: EventData = {
      type: 'performance',
      timestamp: Date.now(),
      data: {
        metricType: 'largest-contentful-paint',
        startTime: entry.startTime,
        duration: entry.duration,
        size: entry.size,
        // 记录触发 LCP 的元素标签名
        element: entry.element?.tagName || 'unknown'
      }
    };
    this.sendEvent(event);
  }

  /**
   * @description 销毁采集器，断开 PerformanceObserver 连接
   */
  destroy(): void {
    this.observer?.disconnect();
  }
}
