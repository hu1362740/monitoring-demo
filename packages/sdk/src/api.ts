/**
 * @description 对外暴露的便捷 API 方法，通过单例模式获取 SDK 实例并调用对应功能
 */

import { getInstance } from './core/SDK';
import type { ErrorData, PerformanceData, ApiRequestData, UserBehaviorData } from './types';

/**
 * @description 捕获并上报异常信息
 * @param error - 需要捕获的 Error 对象
 * @param context - 可选的附加上下文信息，会合并到事件数据中
 * @example
 * ```ts
 * try {
 *   // 可能抛出异常的代码
 * } catch (e) {
 *   captureException(e, { page: 'home', action: 'submit' });
 * }
 * ```
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  const instance = getInstance();
  if (instance) {
    instance.captureException(error, context);
  }
}

/**
 * @description 上报性能数据
 * @param data - 包含页面性能指标的数据对象
 * @example
 * ```ts
 * capturePerformance({
 *   navigationStart: 0,
 *   domContentLoadedEventEnd: 1500,
 *   loadEventEnd: 2000,
 *   // ...其他性能指标
 * });
 * ```
 */
export function capturePerformance(data: PerformanceData): void {
  const instance = getInstance();
  if (instance) {
    instance.track('performance', data);
  }
}

/**
 * @description 上报 API 请求数据
 * @param data - 包含 API 请求详情（URL、方法、状态码、耗时等）的数据对象
 * @example
 * ```ts
 * captureApiRequest({
 *   url: 'https://api.example.com/data',
 *   method: 'GET',
 *   statusCode: 200,
 *   duration: 350,
 *   success: true,
 *   timestamp: Date.now()
 * });
 * ```
 */
export function captureApiRequest(data: ApiRequestData): void {
  const instance = getInstance();
  if (instance) {
    instance.track('api_request', data);
  }
}

/**
 * @description 上报用户行为数据（点击、表单提交等）
 * @param data - 包含用户行为详情（类型、动作、目标元素等）的数据对象
 * @example
 * ```ts
 * captureUserBehavior({
 *   type: 'click',
 *   action: 'click',
 *   target: 'button#submit',
 *   timestamp: Date.now()
 * });
 * ```
 */
export function captureUserBehavior(data: UserBehaviorData): void {
  const instance = getInstance();
  if (instance) {
    instance.track('user_behavior', data);
  }
}

/**
 * @description 上报自定义事件
 * @param eventName - 自定义事件名称
 * @param properties - 可选的事件属性，用于携带额外的业务数据
 * @example
 * ```ts
 * trackEvent('purchase', { orderId: '123', amount: 99.9 });
 * ```
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  const instance = getInstance();
  if (instance) {
    instance.track(eventName, properties);
  }
}
