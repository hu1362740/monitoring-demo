/**
 * @description SDK 入口文件，统一导出所有公开的类型和 API
 */

/** 监控 SDK 核心类 */
export { MonitoringSDK, init, getInstance } from './core/SDK';

/** SDK 相关的类型定义 */
export type { SDKConfig, EventData, PerformanceData, ErrorData, ApiRequestData, UserBehaviorData } from './types';

/** 对外暴露的便捷 API 方法 */
export { captureException, capturePerformance, captureApiRequest, captureUserBehavior, trackEvent } from './api';
