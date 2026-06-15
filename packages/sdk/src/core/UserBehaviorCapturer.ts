/**
 * @description 用户行为采集模块，负责追踪用户点击、页面浏览和表单提交等行为
 */

import type { EventData, UserBehaviorData } from '../types';

/**
 * @description 用户行为采集器类，监听 DOM 事件以捕获用户交互行为
 */
export class UserBehaviorCapturer {
  /** 事件发送回调函数 */
  private sendEvent: (event: EventData) => void;
  /** 已注册的事件监听器列表，用于销毁时清理 */
  private eventListeners: Array<{
    target: EventTarget;
    type: string;
    handler: (event: Event) => void;
  }> = [];

  /**
   * @description 创建用户行为采集器实例并立即开始监听
   * @param sendEvent - 事件发送回调函数
   */
  constructor(sendEvent: (event: EventData) => void) {
    this.sendEvent = sendEvent;
    this.setup();
  }

  /**
   * @description 设置行为监听器
   */
  private setup(): void {
    this.trackClicks();
    this.trackPageViews();
    this.trackFormSubmissions();
  }

  /**
   * @description 追踪用户点击行为
   */
  private trackClicks(): void {
    const handler = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const data: UserBehaviorData = {
        type: 'click',
        action: 'click',
        target: this.getTargetInfo(target),
        value: {
          x: event.clientX,
          y: event.clientY
        },
        timestamp: Date.now()
      };
      this.sendEvent({
        type: 'user_behavior',
        timestamp: Date.now(),
        data
      });
    };

    document.addEventListener('click', handler);
    // 记录监听器以便销毁时移除
    this.eventListeners.push({ target: document, type: 'click', handler: handler as (event: Event) => void });
  }

  /**
   * @description 追踪页面浏览行为，在初始化时立即上报一次
   */
  private trackPageViews(): void {
    const data: UserBehaviorData = {
      type: 'page_view',
      action: 'page_view',
      target: window.location.pathname,
      value: {
        referrer: document.referrer,
        url: window.location.href,
        title: document.title
      },
      timestamp: Date.now()
    };
    this.sendEvent({
      type: 'user_behavior',
      timestamp: Date.now(),
      data
    });
  }

  /**
   * @description 追踪表单提交行为
   */
  private trackFormSubmissions(): void {
    const handler = (event: Event) => {
      const target = event.target as HTMLFormElement;
      const data: UserBehaviorData = {
        type: 'form_submit',
        action: 'form_submit',
        // 优先使用 action，其次 id，再次 name，最后 'unknown'
        target: target.action || target.id || target.name || 'unknown',
        timestamp: Date.now()
      };
      this.sendEvent({
        type: 'user_behavior',
        timestamp: Date.now(),
        data
      });
    };

    // 使用捕获阶段监听，确保能捕获到所有表单提交
    document.addEventListener('submit', handler, true);
    this.eventListeners.push({ target: document, type: 'submit', handler });
  }

  /**
   * @description 获取目标元素的标识信息，格式为 "tagName#id.class1.class2"
   * @param element - HTML 元素
   * @returns 元素标识字符串
   */
  private getTargetInfo(element: HTMLElement): string {
    const id = element.id ? `#${element.id}` : '';
    // 将 class 名用点号连接
    const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const tagName = element.tagName.toLowerCase();
    
    return `${tagName}${id}${className}`;
  }

  /**
   * @description 销毁采集器，移除所有事件监听器
   */
  destroy(): void {
    for (const listener of this.eventListeners) {
      listener.target.removeEventListener(listener.type, listener.handler);
    }
    this.eventListeners = [];
  }
}
