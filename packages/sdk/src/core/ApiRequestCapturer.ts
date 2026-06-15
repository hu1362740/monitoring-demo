/**
 * @description API 请求采集模块，负责拦截 Fetch 和 XHR 请求并记录请求数据
 */

import type { EventData, ApiRequestData } from '../types';

/**
 * @description API 请求采集器类，通过猴子补丁（Monkey Patch）拦截全局 fetch 和 XMLHttpRequest
 */
export class ApiRequestCapturer {
  /** 事件发送回调函数 */
  private sendEvent: (event: EventData) => void;
  /** 需要忽略的 URL 列表，支持模糊匹配 */
  private ignoreUrls: string[];
  /** 原始的 window.fetch 函数，用于恢复 */
  private originalFetch: typeof fetch;
  /** 原始的 XMLHttpRequest.prototype.open 函数，用于恢复 */
  private originalXHR: typeof XMLHttpRequest.prototype.open;

  /**
   * @description 创建 API 请求采集器实例并立即开始拦截
   * @param sendEvent - 事件发送回调函数
   * @param ignoreUrls - 需要忽略的 URL 列表
   */
  constructor(sendEvent: (event: EventData) => void, ignoreUrls: string[]) {
    this.sendEvent = sendEvent;
    this.ignoreUrls = ignoreUrls;
    // 保存原始函数引用，以便销毁时恢复
    this.originalFetch = window.fetch;
    this.originalXHR = XMLHttpRequest.prototype.open;
    this.setup();
  }

  /**
   * @description 设置请求拦截器
   */
  private setup(): void {
    this.interceptFetch();
    this.interceptXHR();
  }

  /**
   * @description 判断 URL 是否应该被忽略
   * @param url - 请求 URL
   * @returns 是否应该忽略
   */
  private shouldIgnoreUrl(url: string): boolean {
    // 使用模糊匹配检查 URL 是否在忽略列表中
    return this.ignoreUrls.some((pattern) => url.includes(pattern));
  }

  /**
   * @description 拦截全局 fetch 函数，记录请求数据
   */
  private interceptFetch(): void {
    const self = this;
    window.fetch = async function (input, init) {
      // 解析请求 URL 和方法
      const url = typeof input === 'string' ? input : input.url;
      const method = init?.method || 'GET';
      const startTime = Date.now();

      try {
        const response = await self.originalFetch(input, init);
        const duration = Date.now() - startTime;

        // 不在忽略列表中的请求才上报
        if (!self.shouldIgnoreUrl(url)) {
          self.sendRequestData({
            url,
            method,
            statusCode: response.status,
            duration,
            success: response.ok,
            timestamp: startTime
          });
        }

        return response;
      } catch (error) {
        const duration = Date.now() - startTime;

        // 请求失败时也记录数据
        if (!self.shouldIgnoreUrl(url)) {
          self.sendRequestData({
            url,
            method,
            statusCode: 0,
            duration,
            success: false,
            timestamp: startTime
          });
        }

        throw error;
      }
    };
  }

  /**
   * @description 拦截 XMLHttpRequest，记录请求数据
   */
  private interceptXHR(): void {
    const self = this;
    XMLHttpRequest.prototype.open = function (method, url) {
      const startTime = Date.now();
      // 保存原始的 onload 和 onerror 处理器
      const originalOnLoad = this.onload;
      const originalOnError = this.onerror;

      // 重写 onload 处理器
      this.onload = function () {
        const duration = Date.now() - startTime;

        // 不在忽略列表中的请求才上报
        if (!self.shouldIgnoreUrl(String(url))) {
          self.sendRequestData({
            url: String(url),
            method: String(method),
            statusCode: this.status,
            duration,
            // HTTP 状态码在 200-299 之间视为成功
            success: this.status >= 200 && this.status < 300,
            timestamp: startTime
          });
        }

        // 调用原始处理器
        if (originalOnLoad) {
          originalOnLoad.call(this);
        }
      };

      // 重写 onerror 处理器
      this.onerror = function () {
        const duration = Date.now() - startTime;

        if (!self.shouldIgnoreUrl(String(url))) {
          self.sendRequestData({
            url: String(url),
            method: String(method),
            statusCode: 0,
            duration,
            success: false,
            timestamp: startTime
          });
        }

        // 调用原始处理器
        if (originalOnError) {
          originalOnError.call(this);
        }
      };

      // 调用原始的 open 方法
      self.originalXHR.call(this, method, url);
    };
  }

  /**
   * @description 将 API 请求数据封装为事件并发送
   * @param data - API 请求数据
   */
  private sendRequestData(data: ApiRequestData): void {
    const event: EventData = {
      type: 'api_request',
      timestamp: data.timestamp,
      data
    };
    this.sendEvent(event);
  }

  /**
   * @description 销毁采集器，恢复原始的 fetch 和 XMLHttpRequest
   */
  destroy(): void {
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHR;
  }
}
