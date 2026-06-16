/**
 * @description 事件发送模块，负责事件的批量缓存、重试上报和用户信息管理
 */

import type { SDKConfig, EventData } from '../types';

/**
 * @description 事件发送器类，实现事件的批量发送、重试机制和用户信息绑定
 */
export class EventSender {
  /** SDK 完整配置 */
  private config: Required<SDKConfig>;
  /** 待发送事件队列 */
  private queue: EventData[] = [];
  /** 批量发送定时器 */
  private timer: ReturnType<typeof setTimeout> | null = null;
  /** 当前用户信息，会附加到所有事件中 */
  private userInfo: Record<string, unknown> = {};
  /** 是否正在执行批量发送，防止并发 */
  private isFlushing = false;

  /**
   * @description 创建事件发送器实例
   * @param config - SDK 完整配置对象
   */
  constructor(config: Required<SDKConfig>) {
    this.config = config;
  }

  /**
   * @description 将事件加入发送队列，达到批量阈值时立即发送，否则启动定时器
   * @param event - 待发送的事件数据
   */
  send(event: EventData): void {
    // 将用户信息附加到事件数据中
    const eventWithUser = {
      ...event,
      data: {
        ...event.data,
        user: this.userInfo
      }
    };

    this.queue.push(eventWithUser);

    // 队列达到批量大小时立即触发发送
    if (this.queue.length >= this.config.batchSize) {
      this.flush();
    } else if (!this.timer) {
      // 否则启动定时器，在间隔时间后发送
      this.timer = setTimeout(() => {
        this.flush();
      }, this.config.batchInterval);
    }
  }

  /**
   * @description 立即发送队列中的所有事件
   * @returns Promise，在发送完成后 resolve
   */
  async flush(): Promise<void> {
    // 防止并发发送，队列为空时直接返回
    if (this.isFlushing || this.queue.length === 0) return;

    this.isFlushing = true;

    // 清除定时器
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // 取出当前队列并清空，避免发送过程中新事件干扰
    const eventsToSend = [...this.queue];
    this.queue = [];

    try {
      await this.sendBatch(eventsToSend);
    } catch (error) {
      if (this.config.debug) {
        console.error('Failed to send events:', error);
      }
      // 发送失败时将事件放回队列头部，等待下次重试
      this.queue = [...eventsToSend, ...this.queue];
    } finally {
      this.isFlushing = false;
    }
  }

  /**
   * @description 批量发送事件到服务端，支持指数退避重试
   * @param events - 待发送的事件数组
   * @returns Promise
   * @throws 当重试次数耗尽后仍失败时抛出错误
   */
  private async sendBatch(events: EventData[]): Promise<void> {
    const payload = {
      apiKey: this.config.apiKey,
      events
    };

    // 使用指数退避策略进行重试
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        const response = await window.fetch(this.config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(payload),
          // keepalive 允许页面卸载后继续发送请求
          keepalive: true
        });

        if (!response.ok) {
          throw new Error(`HTTP error ${response.status}`);
        }

        return;
      } catch (error) {
        // 最后一次重试失败时抛出错误
        if (attempt === this.config.maxRetries - 1) {
          throw error;
        }
        // 指数退避延迟：2^attempt * 1000ms
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }
  }

  /**
   * @description 延迟指定毫秒数
   * @param ms - 延迟毫秒数
   * @returns Promise，在延迟结束后 resolve
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * @description 设置用户信息，会附加到后续所有事件中
   * @param userInfo - 用户信息对象
   */
  setUser(userInfo: Record<string, unknown>): void {
    this.userInfo = userInfo;
  }

  /**
   * @description 清除用户信息
   */
  clearUser(): void {
    this.userInfo = {};
  }

  /**
   * @description 销毁发送器，清除定时器并发送剩余事件
   */
  destroy(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    // 异步发送剩余事件，不阻塞销毁流程
    void this.flush();
  }
}
