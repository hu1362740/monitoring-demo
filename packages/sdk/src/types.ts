export interface SDKConfig {
  apiKey: string;
  endpoint?: string;
  enabled?: boolean;
  debug?: boolean;
  sampleRate?: number;
  batchSize?: number;
  batchInterval?: number;
  maxRetries?: number;
  captureErrors?: boolean;
  capturePerformance?: boolean;
  captureApiRequests?: boolean;
  captureUserBehavior?: boolean;
  ignoreUrls?: string[];
  beforeSend?: (data: EventData) => EventData | null;
}

export interface EventData {
  type: string;
  projectId?: string;
  timestamp: number;
  data: Record<string, unknown>;
}

export interface PerformanceData {
  navigationStart: number;
  unloadEventStart: number;
  unloadEventEnd: number;
  redirectStart: number;
  redirectEnd: number;
  fetchStart: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  secureConnectionStart: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  domLoading: number;
  domInteractive: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  domComplete: number;
  loadEventStart: number;
  loadEventEnd: number;
  firstPaint?: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  timeToInteractive?: number;
}

export interface ErrorData {
  type: string;
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  url?: string;
  userAgent?: string;
}

export interface ApiRequestData {
  url: string;
  method: string;
  statusCode: number;
  duration: number;
  success: boolean;
  requestBody?: unknown;
  responseBody?: unknown;
  headers?: Record<string, string>;
  timestamp: number;
}

export interface UserBehaviorData {
  type: string;
  action: string;
  target?: string;
  value?: unknown;
  timestamp: number;
}

export interface TrackEventOptions {
  type: string;
  category?: string;
  label?: string;
  value?: number;
  properties?: Record<string, unknown>;
}
