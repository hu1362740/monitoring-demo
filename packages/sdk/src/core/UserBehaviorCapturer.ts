import type { EventData, UserBehaviorData } from '../types';

export class UserBehaviorCapturer {
  private sendEvent: (event: EventData) => void;
  private eventListeners: Array<{
    target: EventTarget;
    type: string;
    handler: (event: Event) => void;
  }> = [];

  constructor(sendEvent: (event: EventData) => void) {
    this.sendEvent = sendEvent;
    this.setup();
  }

  private setup(): void {
    this.trackClicks();
    this.trackPageViews();
    this.trackFormSubmissions();
  }

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
    this.eventListeners.push({ target: document, type: 'click', handler });
  }

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

  private trackFormSubmissions(): void {
    const handler = (event: Event) => {
      const target = event.target as HTMLFormElement;
      const data: UserBehaviorData = {
        type: 'form_submit',
        action: 'form_submit',
        target: target.action || target.id || target.name || 'unknown',
        timestamp: Date.now()
      };
      this.sendEvent({
        type: 'user_behavior',
        timestamp: Date.now(),
        data
      });
    };

    document.addEventListener('submit', handler, true);
    this.eventListeners.push({ target: document, type: 'submit', handler });
  }

  private getTargetInfo(element: HTMLElement): string {
    const id = element.id ? `#${element.id}` : '';
    const className = element.className ? `.${element.className.split(' ').join('.')}` : '';
    const tagName = element.tagName.toLowerCase();
    
    return `${tagName}${id}${className}`;
  }

  destroy(): void {
    for (const listener of this.eventListeners) {
      listener.target.removeEventListener(listener.type, listener.handler);
    }
    this.eventListeners = [];
  }
}
