/**
 * @description SDK 相关的类型定义
 */

/**
 * @description SDK 配置接口
 */
export interface SDKConfig {
  /** API 密钥，用于身份验证 */
  apiKey: string;
  /** 上报接口地址，默认为 'https://api.monitoring.example.com/v1/events' */
  endpoint?: string;
  /** 是否启用 SDK，默认为 true */
  enabled?: boolean;
  /** 是否开启调试模式，默认为 false */
  debug?: boolean;
  /** 采样率（0-1），默认为 1.0（100%采样） */
  sampleRate?: number;
  /** 批量上报大小，默认为 20 条 */
  batchSize?: number;
  /** 批量上报间隔（毫秒），默认为 5000ms */
  batchInterval?: number;
  /** 最大重试次数，默认为 3 次 */
  maxRetries?: number;
  /** 是否捕获错误，默认为 true */
  captureErrors?: boolean;
  /** 是否捕获性能数据，默认为 true */
  capturePerformance?: boolean;
  /** 是否捕获 API 请求，默认为 true */
  captureApiRequests?: boolean;
  /** 是否捕获用户行为，默认为 false */
  captureUserBehavior?: boolean;
  /** 需要忽略的 URL 列表，支持模糊匹配 */
  ignoreUrls?: string[];
  /** 发送前的数据钩子，可修改或返回 null 阻止发送 */
  beforeSend?: (data: EventData) => EventData | null;
}

/**
 * @description 事件数据基础接口
 */
export interface EventData {
  /** 事件类型（如 'error', 'performance', 'api_request', 'user_behavior', 'custom'） */
  type: string;
  /** 项目 ID，可选 */
  projectId?: string;
  /** 事件时间戳（毫秒） */
  timestamp: number;
  /** 事件携带的具体数据 */
  data: Record<string, unknown>;
}

/**
 * @description 性能数据接口，包含页面加载各阶段的性能指标
 */
export interface PerformanceData {
  /** 导航开始时间 */
  navigationStart: number;
  /** 卸载事件开始时间 */
  unloadEventStart: number;
  /** 卸载事件结束时间 */
  unloadEventEnd: number;
  /** 重定向开始时间 */
  redirectStart: number;
  /** 重定向结束时间 */
  redirectEnd: number;
  /** 获取资源开始时间 */
  fetchStart: number;
  /** DNS 查询开始时间 */
  domainLookupStart: number;
  /** DNS 查询结束时间 */
  domainLookupEnd: number;
  /** TCP 连接开始时间 */
  connectStart: number;
  /** TCP 连接结束时间 */
  connectEnd: number;
  /** 安全连接开始时间 */
  secureConnectionStart: number;
  /** 请求开始时间 */
  requestStart: number;
  /** 响应开始时间 */
  responseStart: number;
  /** 响应结束时间 */
  responseEnd: number;
  /** DOM 开始加载时间 */
  domLoading: number;
  /** DOM 可交互时间 */
  domInteractive: number;
  /** DOMContentLoaded 事件开始时间 */
  domContentLoadedEventStart: number;
  /** DOMContentLoaded 事件结束时间 */
  domContentLoadedEventEnd: number;
  /** DOM 加载完成时间 */
  domComplete: number;
  /** load 事件开始时间 */
  loadEventStart: number;
  /** load 事件结束时间 */
  loadEventEnd: number;
  /** 首次绘制时间（可选） */
  firstPaint?: number;
  /** 首次内容绘制时间（可选） */
  firstContentfulPaint?: number;
  /** 最大内容绘制时间（可选） */
  largestContentfulPaint?: number;
  /** 可交互时间（可选） */
  timeToInteractive?: number;
}

/**
 * @description 错误数据接口
 */
export interface ErrorData {
  /** 错误类型（如 'Error', 'TypeError', 'PromiseRejection'） */
  type: string;
  /** 错误消息 */
  message: string;
  /** 错误堆栈信息（可选） */
  stack?: string;
  /** 发生错误的文件名（可选） */
  filename?: string;
  /** 发生错误的行号（可选） */
  lineno?: number;
  /** 发生错误的列号（可选） */
  colno?: number;
  /** 发生错误时的页面 URL（可选） */
  url?: string;
  /** 浏览器 UserAgent（可选） */
  userAgent?: string;
}

/**
 * @description API 请求数据接口
 */
export interface ApiRequestData {
  /** 请求 URL */
  url: string;
  /** 请求方法（GET, POST 等） */
  method: string;
  /** HTTP 状态码 */
  statusCode: number;
  /** 请求耗时（毫秒） */
  duration: number;
  /** 请求是否成功 */
  success: boolean;
  /** 请求体（可选） */
  requestBody?: unknown;
  /** 响应体（可选） */
  responseBody?: unknown;
  /** 请求头（可选） */
  headers?: Record<string, string>;
  /** 请求时间戳 */
  timestamp: number;
}

/**
 * @description 用户行为数据接口
 */
export interface UserBehaviorData {
  /** 行为类型（如 'click', 'page_view', 'form_submit'） */
  type: string;
  /** 具体动作 */
  action: string;
  /** 目标元素标识（可选） */
  target?: string;
  /** 行为相关的值（可选，如点击坐标） */
  value?: unknown;
  /** 行为发生的时间戳 */
  timestamp: number;
}

/**
 * @description 追踪事件的选项接口
 */
export interface TrackEventOptions {
  /** 事件类型 */
  type: string;
  /** 事件分类（可选） */
  category?: string;
  /** 事件标签（可选） */
  label?: string;
  /** 事件数值（可选） */
  value?: number;
  /** 事件属性（可选） */
  properties?: Record<string, unknown>;
}
