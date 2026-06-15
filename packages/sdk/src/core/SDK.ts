/**
 * @description 监控 SDK 核心模块，负责初始化、配置管理和事件分发
 */

import type { SDKConfig, EventData } from '../types';
import { ErrorCapturer } from './ErrorCapturer';
import { PerformanceCapturer } from './PerformanceCapturer';
import { ApiRequestCapturer } from './ApiRequestCapturer';
import { UserBehaviorCapturer } from './UserBehaviorCapturer';
import { EventSender } from './EventSender';

/**
 * @description 监控 SDK 核心类，统一管理各类数据采集器
 * @example
 * ```ts
 * const sdk = new MonitoringSDK({
 *   apiKey: 'your-api-key',
 *   captureErrors: true,
 *   capturePerformance: true
 * });
 * ```
 */
export class MonitoringSDK {
  /** SDK 完整配置（已合并默认值） */
  private config: Required<SDKConfig>;
  /** 事件发送器，负责批量上报 */
  private eventSender: EventSender;
  /** 错误采集器（可选） */
  private errorCapturer?: ErrorCapturer;
  /** 性能采集器（可选） */
  private performanceCapturer?: PerformanceCapturer;
  /** API 请求采集器（可选） */
  private apiRequestCapturer?: ApiRequestCapturer;
  /** 用户行为采集器（可选） */
  private userBehaviorCapturer?: UserBehaviorCapturer;

  /**
   * @description 创建 SDK 实例，初始化配置并启动各类采集器
   * @param config - SDK 配置对象
   */
  constructor(config: SDKConfig) {
    // 合并用户配置与默认值，确保所有配置项都有值
    this.config = {
      apiKey: config.apiKey,
      endpoint: config.endpoint || 'https://api.monitoring.example.com/v1/events',
      enabled: config.enabled !== undefined ? config.enabled : true,
      debug: config.debug !== undefined ? config.debug : false,
      sampleRate: config.sampleRate !== undefined ? config.sampleRate : 1.0,
      batchSize: config.batchSize || 20,
      batchInterval: config.batchInterval || 5000,
      maxRetries: config.maxRetries || 3,
      captureErrors: config.captureErrors !== undefined ? config.captureErrors : true,
      capturePerformance: config.capturePerformance !== undefined ? config.capturePerformance : true,
      captureApiRequests: config.captureApiRequests !== undefined ? config.captureApiRequests : true,
      captureUserBehavior: config.captureUserBehavior !== undefined ? config.captureUserBehavior : false,
      ignoreUrls: config.ignoreUrls || [],
      beforeSend: config.beforeSend
    };

    // 初始化事件发送器
    this.eventSender = new EventSender(this.config);

    // 根据配置按需初始化各类采集器
    if (this.config.captureErrors) {
      this.errorCapturer = new ErrorCapturer(this.sendEvent.bind(this));
    }

    if (this.config.capturePerformance) {
      this.performanceCapturer = new PerformanceCapturer(this.sendEvent.bind(this));
    }

    if (this.config.captureApiRequests) {
      this.apiRequestCapturer = new ApiRequestCapturer(this.sendEvent.bind(this), this.config.ignoreUrls);
    }

    if (this.config.captureUserBehavior) {
      this.userBehaviorCapturer = new UserBehaviorCapturer(this.sendEvent.bind(this));
    }
  }

  /**
   * @description 根据采样率判断是否应该上报当前事件
   * @returns 是否应该上报
   */
  private shouldSample(): boolean {
    // 采样率为 1.0 时全量上报
    if (this.config.sampleRate >= 1.0) return true;
    // 生成随机数与采样率比较，实现概率采样
    return Math.random() < this.config.sampleRate;
  }

  /**
   * @description 发送事件到服务端，经过启用检查、采样过滤和 beforeSend 钩子处理
   * @param event - 待发送的事件数据
   */
  private sendEvent(event: EventData): void {
    // SDK 未启用时直接返回
    if (!this.config.enabled) return;
    // 采样未命中时丢弃事件
    if (!this.shouldSample()) return;

    // 执行 beforeSend 钩子，允许用户修改或拦截事件
    const processedEvent = this.config.beforeSend?.(event) || event;
    // beforeSend 返回 null 时表示取消发送
    if (!processedEvent) return;

    this.eventSender.send(processedEvent);
  }

  /**
   * @description 上报自定义事件
   * @param eventName - 事件名称
   * @param properties - 事件属性，可选
   * @example
   * ```ts
   * sdk.track('button_click', { buttonId: 'submit' });
   * ```
   */
  track(eventName: string, properties?: Record<string, unknown>): void {
    const event: EventData = {
      type: 'custom',
      timestamp: Date.now(),
      data: {
        eventName,
        properties
      }
    };
    this.sendEvent(event);
  }

  /**
   * @description 捕获并上报异常
   * @param error - Error 对象
   * @param context - 附加上下文信息，会合并到事件数据中
   * @example
   * ```ts
   * try {
   *   // 可能抛出异常的代码
   * } catch (e) {
   *   sdk.captureException(e, { page: 'home' });
   * }
   * ```
   */
  captureException(error: Error, context?: Record<string, unknown>): void {
    const event: EventData = {
      type: 'error',
      timestamp: Date.now(),
      data: {
        type: error.name,
        message: error.message,
        stack: error.stack,
        ...context
      }
    };
    this.sendEvent(event);
  }

  /**
   * @description 设置用户信息，会附加到所有后续上报的事件中
   * @param userInfo - 用户信息对象
   */
  setUser(userInfo: Record<string, unknown>): void {
    this.eventSender.setUser(userInfo);
  }

  /**
   * @description 清除已设置的用户信息
   */
  clearUser(): void {
    this.eventSender.clearUser();
  }

  /**
   * @description 销毁 SDK 实例，停止所有采集器并发送剩余事件
   */
  destroy(): void {
    this.errorCapturer?.destroy();
    this.performanceCapturer?.destroy();
    this.apiRequestCapturer?.destroy();
    this.userBehaviorCapturer?.destroy();
    this.eventSender.destroy();
  }

  /**
   * @description 立即发送队列中的所有事件
   * @returns Promise，在发送完成后 resolve
   */
  flush(): Promise<void> {
    return this.eventSender.flush();
  }
}

/** SDK 单例实例，用于全局访问 */
let instance: MonitoringSDK | null = null;

/**
 * @description 初始化 SDK 单例，重复调用会返回已存在的实例
 * @param config - SDK 配置对象
 * @returns SDK 实例
 * @throws 当配置缺少必填的 apiKey 时可能抛出异常
 * @example
 * ```ts
 * const sdk = init({ apiKey: 'your-api-key' });
 * ```
 */
export function init(config: SDKConfig): MonitoringSDK {
  // 单例模式：已初始化时直接返回现有实例
  if (instance) {
    if (config.debug) {
      console.warn('Monitoring SDK has already been initialized');
    }
    return instance;
  }
  instance = new MonitoringSDK(config);
  return instance;
}

/**
 * @description 获取 SDK 单例实例
 * @returns SDK 实例，未初始化时返回 null
 */
export function getInstance(): MonitoringSDK | null {
  return instance;
}
