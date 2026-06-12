import { getInstance } from './core/SDK';
import type { ErrorData, PerformanceData, ApiRequestData, UserBehaviorData } from './types';

export function captureException(error: Error, context?: Record<string, unknown>): void {
  const instance = getInstance();
  if (instance) {
    instance.captureException(error, context);
  }
}

export function capturePerformance(data: PerformanceData): void {
  const instance = getInstance();
  if (instance) {
    instance.track('performance', data);
  }
}

export function captureApiRequest(data: ApiRequestData): void {
  const instance = getInstance();
  if (instance) {
    instance.track('api_request', data);
  }
}

export function captureUserBehavior(data: UserBehaviorData): void {
  const instance = getInstance();
  if (instance) {
    instance.track('user_behavior', data);
  }
}

export function trackEvent(eventName: string, properties?: Record<string, unknown>): void {
  const instance = getInstance();
  if (instance) {
    instance.track(eventName, properties);
  }
}
