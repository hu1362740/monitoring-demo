/**
 * @description 错误采集模块，负责捕获全局 JavaScript 错误和未处理的 Promise 拒绝
 */

import type { EventData } from '../types';

/**
 * @description 错误采集器类，通过监听 window.onerror 和 window.onunhandledrejection 捕获异常
 */
export class ErrorCapturer {
  /** 原始的 window.onerror 处理器，用于销毁时恢复 */
  private originalOnError: ((event: ErrorEvent) => void) | null = null;
  /** 原始的 window.onunhandledrejection 处理器，用于销毁时恢复 */
  private originalOnUnhandledRejection: ((event: PromiseRejectionEvent) => void) | null = null;
  /** 事件发送回调函数 */
  private sendEvent: (event: EventData) => void;

  /**
   * @description 创建错误采集器实例并立即开始监听
   * @param sendEvent - 事件发送回调函数
   */
  constructor(sendEvent: (event: EventData) => void) {
    this.sendEvent = sendEvent;
    this.setup();
  }

  /**
   * @description 设置全局错误监听器，保存原始处理器以便销毁时恢复
   */
  private setup(): void {
    // 保存原始处理器，以便在销毁时恢复
    this.originalOnError = window.onerror;
    this.originalOnUnhandledRejection = window.onunhandledrejection;

    // 监听同步错误和未捕获的异常
    window.onerror = (message, filename, lineno, colno, error) => {
      this.captureError({
        type: error?.name || 'Error',
        message: String(message),
        stack: error?.stack,
        filename,
        lineno,
        colno,
        url: window.location.href,
        userAgent: navigator.userAgent
      });

      // 调用原始处理器，保持原有行为
      if (this.originalOnError) {
        return this.originalOnError({
          message,
          filename,
          lineno,
          colno,
          error
        } as unknown as ErrorEvent);
      }
      return false;
    };

    // 监听未处理的 Promise 拒绝
    window.onunhandledrejection = (event) => {
      const reason = event.reason as Error;
      this.captureError({
        type: reason?.name || 'PromiseRejection',
        message: reason?.message || String(event.reason),
        stack: reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent
      });

      // 调用原始处理器，保持原有行为
      if (this.originalOnUnhandledRejection) {
        this.originalOnUnhandledRejection(event);
      }
    };
  }

  /**
   * @description 将错误数据封装为事件并发送
   * @param errorData - 错误详情数据
   */
  private captureError(errorData: {
    type: string;
    message: string;
    stack?: string;
    filename?: string;
    lineno?: number;
    colno?: number;
    url?: string;
    userAgent?: string;
  }): void {
    const event: EventData = {
      type: 'error',
      timestamp: Date.now(),
      data: errorData
    };
    this.sendEvent(event);
  }

  /**
   * @description 销毁采集器，恢复原始的 window 错误处理器
   */
  destroy(): void {
    window.onerror = this.originalOnError as OnErrorEventHandler;
    window.onunhandledrejection = this.originalOnUnhandledRejection;
  }
}
