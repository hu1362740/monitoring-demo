import type { SDKConfig, EventData } from '../types';
import { ErrorCapturer } from './ErrorCapturer';
import { PerformanceCapturer } from './PerformanceCapturer';
import { ApiRequestCapturer } from './ApiRequestCapturer';
import { UserBehaviorCapturer } from './UserBehaviorCapturer';
import { EventSender } from './EventSender';

export class MonitoringSDK {
  private config: Required<SDKConfig>;
  private eventSender: EventSender;
  private errorCapturer?: ErrorCapturer;
  private performanceCapturer?: PerformanceCapturer;
  private apiRequestCapturer?: ApiRequestCapturer;
  private userBehaviorCapturer?: UserBehaviorCapturer;

  constructor(config: SDKConfig) {
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

    this.eventSender = new EventSender(this.config);

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

  private shouldSample(): boolean {
    if (this.config.sampleRate >= 1.0) return true;
    return Math.random() < this.config.sampleRate;
  }

  private sendEvent(event: EventData): void {
    if (!this.config.enabled) return;
    if (!this.shouldSample()) return;

    const processedEvent = this.config.beforeSend?.(event) || event;
    if (!processedEvent) return;

    this.eventSender.send(processedEvent);
  }

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

  setUser(userInfo: Record<string, unknown>): void {
    this.eventSender.setUser(userInfo);
  }

  clearUser(): void {
    this.eventSender.clearUser();
  }

  destroy(): void {
    this.errorCapturer?.destroy();
    this.performanceCapturer?.destroy();
    this.apiRequestCapturer?.destroy();
    this.userBehaviorCapturer?.destroy();
    this.eventSender.destroy();
  }

  flush(): Promise<void> {
    return this.eventSender.flush();
  }
}

let instance: MonitoringSDK | null = null;

export function init(config: SDKConfig): MonitoringSDK {
  if (instance) {
    if (config.debug) {
      console.warn('Monitoring SDK has already been initialized');
    }
    return instance;
  }
  instance = new MonitoringSDK(config);
  return instance;
}

export function getInstance(): MonitoringSDK | null {
  return instance;
}
