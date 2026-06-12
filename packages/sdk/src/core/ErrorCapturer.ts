import type { EventData } from '../types';

export class ErrorCapturer {
  private originalOnError: ((event: ErrorEvent) => void) | null = null;
  private originalOnUnhandledRejection: ((event: PromiseRejectionEvent) => void) | null = null;
  private sendEvent: (event: EventData) => void;

  constructor(sendEvent: (event: EventData) => void) {
    this.sendEvent = sendEvent;
    this.setup();
  }

  private setup(): void {
    this.originalOnError = window.onerror;
    this.originalOnUnhandledRejection = window.onunhandledrejection;

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

    window.onunhandledrejection = (event) => {
      const reason = event.reason as Error;
      this.captureError({
        type: reason?.name || 'PromiseRejection',
        message: reason?.message || String(event.reason),
        stack: reason?.stack,
        url: window.location.href,
        userAgent: navigator.userAgent
      });

      if (this.originalOnUnhandledRejection) {
        this.originalOnUnhandledRejection(event);
      }
    };
  }

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

  destroy(): void {
    window.onerror = this.originalOnError;
    window.onunhandledrejection = this.originalOnUnhandledRejection;
  }
}
