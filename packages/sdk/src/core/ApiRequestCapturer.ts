import type { EventData, ApiRequestData } from '../types';

export class ApiRequestCapturer {
  private sendEvent: (event: EventData) => void;
  private ignoreUrls: string[];
  private originalFetch: typeof fetch;
  private originalXHR: typeof XMLHttpRequest.prototype.open;

  constructor(sendEvent: (event: EventData) => void, ignoreUrls: string[]) {
    this.sendEvent = sendEvent;
    this.ignoreUrls = ignoreUrls;
    this.originalFetch = window.fetch;
    this.originalXHR = XMLHttpRequest.prototype.open;
    this.setup();
  }

  private setup(): void {
    this.interceptFetch();
    this.interceptXHR();
  }

  private shouldIgnoreUrl(url: string): boolean {
    return this.ignoreUrls.some((pattern) => url.includes(pattern));
  }

  private interceptFetch(): void {
    const self = this;
    window.fetch = async function (input, init) {
      const url = typeof input === 'string' ? input : input.url;
      const method = init?.method || 'GET';
      const startTime = Date.now();

      try {
        const response = await self.originalFetch(input, init);
        const duration = Date.now() - startTime;

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

  private interceptXHR(): void {
    const self = this;
    XMLHttpRequest.prototype.open = function (method, url) {
      const startTime = Date.now();
      const originalOnLoad = this.onload;
      const originalOnError = this.onerror;

      this.onload = function () {
        const duration = Date.now() - startTime;

        if (!self.shouldIgnoreUrl(String(url))) {
          self.sendRequestData({
            url: String(url),
            method: String(method),
            statusCode: this.status,
            duration,
            success: this.status >= 200 && this.status < 300,
            timestamp: startTime
          });
        }

        if (originalOnLoad) {
          originalOnLoad.call(this);
        }
      };

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

        if (originalOnError) {
          originalOnError.call(this);
        }
      };

      self.originalXHR.call(this, method, url);
    };
  }

  private sendRequestData(data: ApiRequestData): void {
    const event: EventData = {
      type: 'api_request',
      timestamp: data.timestamp,
      data
    };
    this.sendEvent(event);
  }

  destroy(): void {
    window.fetch = this.originalFetch;
    XMLHttpRequest.prototype.open = this.originalXHR;
  }
}
