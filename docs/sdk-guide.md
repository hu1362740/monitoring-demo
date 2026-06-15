# Frontend Monitor SDK 使用与技术文档

## 1. SDK 概述

Frontend Monitor SDK 是一款轻量级、可配置化的前端监控SDK，支持错误捕获、性能监控、API请求监控和用户行为追踪等核心功能。SDK采用模块化设计，支持按需加载与Tree-shaking优化，对业务页面性能影响最小化。

**核心特性：**
- 自动捕获 JS 错误、资源加载错误、Promise 未处理异常
- 页面性能指标采集（FCP、LCP、FID、CLS 等 Web Vitals）
- XMLHttpRequest / Fetch API 请求监控
- 用户行为追踪（点击、输入、滚动、页面跳转）
- 批量上报与自动重试机制
- 支持多种引入方式（ES Module、CommonJS、UMD、Script 标签）

---

## 2. SDK 使用文档

### 2.1 环境准备

- **支持的开发环境：** 现代浏览器（Chrome 60+、Firefox 55+、Safari 12+、Edge 79+）
- **系统要求：** Node.js 14+（构建时）
- **运行时依赖：** 无外部运行时依赖，SDK 为零依赖设计

### 2.2 安装方法

**npm 安装：**
```bash
npm install @monitoring/sdk
```

**yarn 安装：**
```bash
yarn add @monitoring/sdk
```

**Script 标签引入：**
```html
<!-- 压缩版 -->
<script src="dist/index.min.js"></script>
<!-- 未压缩版 -->
<script src="dist/index.js"></script>
```

### 2.3 快速开始

**ES Module 方式：**
```typescript
import { MonitoringSDK } from '@monitoring/sdk';

const sdk = new MonitoringSDK({
  apiKey: 'your-api-key',
  endpoint: 'http://localhost:3001/api/v1/events',
  debug: true,
  captureErrors: true,
  capturePerformance: true,
  captureApiRequests: true,
  captureUserBehavior: true,
});

// 跟踪自定义事件
sdk.track('page_view', { page: '/home' });

// 手动捕获异常
try {
  throw new Error('test error');
} catch (e) {
  sdk.captureException(e as Error, { component: 'HomePage' });
}
```

**Script 标签方式：**
```html
<script src="dist/index.min.js"></script>
<script>
  var sdk = new MonitoringSDK({
    apiKey: 'your-api-key',
    endpoint: 'http://localhost:3001/api/v1/events',
  });
  sdk.track('button_click', { buttonId: 'submit' });
</script>
```

### 2.4 核心功能说明

#### 2.4.1 错误捕获（ErrorCapturer）

自动捕获以下类型的错误：
- `window.onerror`：JS 运行时错误
- `window.addEventListener('unhandledrejection')`：未处理的 Promise 异常
- `window.addEventListener('error')`：资源加载错误（img、script、link 等）

```typescript
const sdk = new MonitoringSDK({
  apiKey: 'your-api-key',
  captureErrors: true, // 开启错误捕获（默认开启）
});
```

上报数据格式：
```typescript
{
  type: 'error',
  message: string;      // 错误信息
  stack: string;        // 堆栈信息
  filename: string;     // 出错文件
  lineno: number;       // 行号
  colno: number;        // 列号
  errorType: string;    // 错误类型：'js_error' | 'resource_error' | 'promise_error'
  url: string;          // 当前页面URL
  userAgent: string;    // 浏览器UA
}
```

#### 2.4.2 性能监控（PerformanceCapturer）

在页面加载完成后自动采集性能数据：
- Navigation Timing（DNS、TCP、TTFB、DOMContentLoaded 等）
- Web Vitals（FCP、LCP、FID、CLS）

```typescript
const sdk = new MonitoringSDK({
  apiKey: 'your-api-key',
  capturePerformance: true, // 开启性能监控（默认开启）
});
```

上报数据格式：
```typescript
{
  type: 'performance',
  dns: number;        // DNS解析耗时
  tcp: number;        // TCP连接耗时
  ssl: number;        // SSL握手耗时
  ttfb: number;       // 首字节时间
  transfer: number;   // 内容传输耗时
  dom: number;        // DOM解析耗时
  domReady: number;   // DOM Ready时间
  load: number;       // 页面完全加载时间
  fcp: number;        // First Contentful Paint
  lcp: number;        // Largest Contentful Paint
  fid: number;        // First Input Delay
  cls: number;        // Cumulative Layout Shift
}
```

#### 2.4.3 API 请求监控（ApiRequestCapturer）

自动拦截 XMLHttpRequest 和 Fetch 请求，记录请求耗时和状态：

```typescript
const sdk = new MonitoringSDK({
  apiKey: 'your-api-key',
  captureApiRequests: true, // 开启API监控（默认开启）
  ignoreUrls: ['https://analytics.example.com'], // 忽略指定URL
});
```

上报数据格式：
```typescript
{
  type: 'api_request',
  method: string;     // 请求方法
  url: string;        // 请求URL
  status: number;     // HTTP状态码
  duration: number;   // 请求耗时(ms)
  success: boolean;   // 是否成功
  requestSize: number;  // 请求体大小
  responseSize: number; // 响应体大小
}
```

#### 2.4.4 用户行为追踪（UserBehaviorCapturer）

自动追踪用户交互行为：
- 点击事件（click）
- 输入事件（input）
- 滚动事件（scroll，节流采集）
- 页面跳转（popstate/hashchange）

```typescript
const sdk = new MonitoringSDK({
  apiKey: 'your-api-key',
  captureUserBehavior: true, // 开启用户行为追踪（默认开启）
});
```

上报数据格式：
```typescript
{
  type: 'user_behavior',
  action: string;   // 行为类型：'click' | 'input' | 'scroll' | 'navigation'
  target: string;   // 目标元素描述（tagName、id、className等）
  value?: string;   // 输入值（仅input事件）
  url: string;      // 当前页面URL
}
```

#### 2.4.5 自定义事件跟踪

```typescript
// 基础用法
sdk.track('button_click', { buttonId: 'submit', page: 'checkout' });

// 设置用户信息（会附加到所有后续事件）
sdk.setUser({ userId: '12345', name: 'John', email: 'john@example.com' });

// 手动刷新发送队列（如页面卸载前）
window.addEventListener('beforeunload', () => {
  sdk.flush();
});
```

#### 2.4.6 数据发送前拦截

```typescript
const sdk = new MonitoringSDK({
  apiKey: 'your-api-key',
  beforeSend: (data) => {
    // 过滤敏感数据
    if (data.type === 'api_request' && data.data.url?.includes('/auth')) {
      return null; // 返回null取消发送
    }
    // 修改数据
    data.data.customField = 'value';
    return data;
  },
});
```

### 2.5 错误处理

SDK 内部所有操作均使用 try-catch 保护，不会因 SDK 异常影响业务代码。

**上报失败重试机制：**
- 默认最多重试 3 次（`maxRetries` 配置）
- 重试间隔：指数退避（1s、2s、4s）
- 重试失败后静默丢弃，不抛出异常

**调试模式：**
```typescript
const sdk = new MonitoringSDK({
  apiKey: 'your-api-key',
  debug: true, // 开启调试日志，在控制台输出所有操作
});
```

---

## 3. 第三方业务集成指南

### 3.1 集成前准备

1. **注册应用：** 在监控系统管理后台创建项目，获取 `apiKey`
2. **确认上报地址：** 获取事件上报接口地址（`endpoint`）
3. **权限确认：** 确保上报地址的网络可达性

### 3.2 集成步骤

**步骤一：安装SDK**
```bash
npm install @monitoring/sdk
```

**步骤二：初始化SDK**
```typescript
// src/monitoring.ts
import { MonitoringSDK } from '@monitoring/sdk';

const sdk = new MonitoringSDK({
  apiKey: process.env.MONITOR_API_KEY || 'your-api-key',
  endpoint: process.env.MONITOR_ENDPOINT || 'https://monitor.example.com/api/v1/events',
  sampleRate: 0.8,          // 80%采样率
  batchSize: 15,            // 每15条批量上报
  batchInterval: 10000,     // 10秒间隔
  captureErrors: true,
  capturePerformance: true,
  captureApiRequests: true,
  captureUserBehavior: true,
  ignoreUrls: [
    'https://analytics.google.com',
    'https://www.googletagmanager.com',
  ],
  beforeSend: (data) => {
    // 生产环境关闭调试
    if (process.env.NODE_ENV === 'production') {
      delete data.data.stack;
    }
    return data;
  },
});

export default sdk;
```

**步骤三：在应用入口引入**
```typescript
// src/main.ts 或 src/index.ts
import './monitoring'; // 确保在其他代码之前加载
```

**步骤四：验证数据上报**
- 打开浏览器开发者工具 Network 面板
- 搜索 `events/batch` 请求
- 确认请求状态为 200，payload 中包含预期的事件数据

**步骤五：部署上线**
- 确保生产环境的 `apiKey` 和 `endpoint` 配置正确
- 建议通过环境变量注入配置

### 3.3 集成示例

**React 项目集成：**
```typescript
// src/monitoring.ts
import { MonitoringSDK } from '@monitoring/sdk';

const sdk = new MonitoringSDK({
  apiKey: 'your-api-key',
  endpoint: '/api/v1/events',
  debug: process.env.NODE_ENV === 'development',
  sampleRate: process.env.NODE_ENV === 'production' ? 0.5 : 1.0,
  beforeSend: (data) => {
    // 过滤本地开发环境
    if (window.location.hostname === 'localhost') {
      return null;
    }
    return data;
  },
});

export default sdk;
```

```typescript
// src/App.tsx
import { useEffect } from 'react';
import sdk from './monitoring';

function App() {
  useEffect(() => {
    sdk.track('app_init', { version: '1.0.0' });

    const handleUnload = () => sdk.flush();
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return <YourApp />;
}
```

**Vue 项目集成：**
```javascript
// src/main.js
import { createApp } from 'vue';
import { MonitoringSDK } from '@monitoring/sdk';
import App from './App.vue';

const sdk = new MonitoringSDK({
  apiKey: 'your-api-key',
  endpoint: '/api/v1/events',
});

// 挂载到全局
app.config.globalProperties.$monitor = sdk;
app.mount('#app');
```

### 3.4 集成注意事项

- **性能优化：** 生产环境建议设置 `sampleRate` 为 0.5~0.8，降低数据量
- **安全实践：** 不要在 `beforeSend` 回调中泄露敏感信息（token、密码等）
- **版本兼容：** SDK 支持所有现代浏览器，IE 需要自行引入 Promise polyfill
- **包体积：** SDK gzip 后约 5KB，对页面加载影响极小

---

## 4. 配置说明文档

### 4.1 配置方式

SDK 通过构造函数传入配置对象，配置为 TypeScript 对象格式。

### 4.2 配置项详解

| 配置项名称 | 数据类型 | 默认值 | 必选/可选 | 描述 |
|------------|----------|--------|-----------|------|
| `apiKey` | `string` | - | **必选** | 项目唯一标识，用于认证和区分不同项目的数据。在管理后台创建项目后获取。 |
| `endpoint` | `string` | `'/api/v1/events'` | 可选 | 事件上报接口地址。支持相对路径和绝对路径。 |
| `enabled` | `boolean` | `true` | 可选 | SDK 总开关，设为 `false` 时所有数据采集和上报均停止。 |
| `debug` | `boolean` | `false` | 可选 | 调试模式，开启后在浏览器控制台输出所有操作的详细日志。 |
| `sampleRate` | `number` | `1.0` | 可选 | 采样率，取值范围 0~1。设为 0.5 表示 50% 的事件会被上报。适用于高流量场景降低数据量。 |
| `batchSize` | `number` | `10` | 可选 | 批量上报阈值，队列中事件数达到此值时立即发送。 |
| `batchInterval` | `number` | `5000` | 可选 | 批量上报时间间隔（毫秒），即使未达到 `batchSize`，也会在此时间后发送。 |
| `maxRetries` | `number` | `3` | 可选 | 上报失败最大重试次数。采用指数退避策略。 |
| `captureErrors` | `boolean` | `true` | 可选 | 是否开启错误自动捕获。 |
| `capturePerformance` | `boolean` | `true` | 可选 | 是否开启性能数据自动采集。 |
| `captureApiRequests` | `boolean` | `true` | 可选 | 是否开启 API 请求自动监控。 |
| `captureUserBehavior` | `boolean` | `true` | 可选 | 是否开启用户行为自动追踪。 |
| `ignoreUrls` | `string[]` | `[]` | 可选 | 需要忽略的URL列表，匹配这些URL的API请求不会被上报。支持部分匹配。 |
| `beforeSend` | `(data: EventData) => EventData \| null` | `undefined` | 可选 | 数据发送前的钩子函数。可修改事件数据或返回 `null` 取消发送。 |

### 4.3 配置加载优先级

SDK 配置仅通过构造函数传入，无环境变量或配置文件加载机制。建议在应用中使用环境变量管理配置：

```typescript
const sdk = new MonitoringSDK({
  apiKey: import.meta.env.VITE_MONITOR_API_KEY,
  endpoint: import.meta.env.VITE_MONITOR_ENDPOINT,
  sampleRate: Number(import.meta.env.VITE_MONITOR_SAMPLE_RATE) || 1.0,
});
```

### 4.4 配置示例

**开发环境：**
```typescript
{
  apiKey: 'dev-api-key',
  endpoint: 'http://localhost:3001/api/v1/events',
  debug: true,
  sampleRate: 1.0,
  batchSize: 5,
  batchInterval: 2000,
}
```

**生产环境：**
```typescript
{
  apiKey: 'prod-api-key',
  endpoint: 'https://monitor.example.com/api/v1/events',
  debug: false,
  sampleRate: 0.5,
  batchSize: 20,
  batchInterval: 10000,
  beforeSend: (data) => {
    // 移除敏感字段
    if (data.data.stack) delete data.data.stack;
    return data;
  },
}
```

---

## 5. SDK 技术文档

### 5.1 架构设计

```
┌─────────────────────────────────────────────┐
│                 MonitoringSDK                │
│            (packages/sdk/src/core/SDK.ts)    │
├──────────┬──────────┬──────────┬────────────┤
│ Error    │Performance│ ApiReq  │  UserBehav │
│ Capturer │Capturer  │ Capturer│  Capturer  │
├──────────┴──────────┴──────────┴────────────┤
│              EventSender                     │
│    (批量队列 + 定时发送 + 重试机制)            │
├─────────────────────────────────────────────┤
│           fetch(endpoint)                    │
│        POST /api/v1/events/batch             │
└─────────────────────────────────────────────┘
```

**核心模块：**
- **MonitoringSDK**：入口类，负责配置管理、模块初始化和对外API暴露
- **EventSender**：事件发送器，实现批量队列、定时发送、指数退避重试
- **ErrorCapturer**：错误捕获器，监听 window 错误事件
- **PerformanceCapturer**：性能采集器，读取 Performance API 和 Web Vitals
- **ApiRequestCapturer**：API监控器，通过 Monkey Patch 拦截 XHR/Fetch
- **UserBehaviorCapturer**：行为追踪器，监听 DOM 事件

### 5.2 API 参考

#### `constructor(config: SDKConfig)`
创建 SDK 实例并初始化所有启用的捕获器。

#### `track(eventName: string, properties?: Record<string, unknown>): void`
发送自定义事件。
- `eventName`：事件名称
- `properties`：自定义属性

#### `captureException(error: Error, context?: Record<string, unknown>): void`
手动捕获异常。
- `error`：Error 对象
- `context`：附加上下文信息

#### `setUser(userInfo: Record<string, unknown>): void`
设置用户信息，会附加到后续所有事件。
- `userInfo`：用户信息对象（如 userId、name、email 等）

#### `flush(): void`
立即发送队列中所有待发送事件，适用于页面卸载前确保数据上报。

#### `destroy(): void`
销毁 SDK 实例，移除所有事件监听器，停止定时器和重试机制。

### 5.3 数据结构

```typescript
// SDK 配置
interface SDKConfig {
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

// 事件数据
interface EventData {
  type: string;           // 事件类型
  projectId?: string;     // 项目ID（即apiKey）
  timestamp: number;      // 时间戳
  data: Record<string, unknown>; // 事件数据
}

// 性能数据
interface PerformanceData {
  dns: number;
  tcp: number;
  ssl: number;
  ttfb: number;
  transfer: number;
  dom: number;
  domReady: number;
  load: number;
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
}

// 错误数据
interface ErrorData {
  message: string;
  stack: string;
  filename: string;
  lineno: number;
  colno: number;
  errorType: 'js_error' | 'resource_error' | 'promise_error';
  url: string;
  userAgent: string;
}

// API 请求数据
interface ApiRequestData {
  method: string;
  url: string;
  status: number;
  duration: number;
  success: boolean;
  requestSize: number;
  responseSize: number;
}

// 用户行为数据
interface UserBehaviorData {
  action: 'click' | 'input' | 'scroll' | 'navigation';
  target: string;
  value?: string;
  url: string;
}
```

### 5.4 版本控制

- **版本号规则：** 遵循语义化版本（Semantic Versioning）`MAJOR.MINOR.PATCH`
  - MAJOR：不兼容的 API 变更
  - MINOR：向下兼容的功能新增
  - PATCH：向下兼容的问题修复

### 5.5 性能指标

| 指标 | 数值 |
|------|------|
| SDK 体积（gzip） | ~5KB |
| 初始化耗时 | < 1ms |
| 单条事件处理耗时 | < 0.1ms |
| 批量上报延迟 | ≤ batchInterval（默认5s） |
| 内存占用 | < 1MB（1000条事件队列） |

### 5.6 安全说明

- **数据传输：** 建议生产环境使用 HTTPS 协议上报数据
- **认证机制：** 通过 `apiKey` 进行项目身份认证
- **数据过滤：** 通过 `beforeSend` 钩子可在发送前移除敏感信息
- **XSS 防护：** SDK 不直接操作 DOM innerHTML，不存在 XSS 注入风险
- **CSP 兼容：** SDK 不使用 eval、new Function 等动态代码执行方式

---

## 6. 附录

### 常见问题解答

**Q: SDK 会影响页面性能吗？**
A: SDK 初始化耗时 < 1ms，所有数据采集均为异步操作，批量上报不阻塞主线程。生产环境建议设置 `sampleRate` 降低数据量。

**Q: 如何验证数据是否正常上报？**
A: 开启 `debug: true`，在浏览器控制台查看所有操作日志；或在 Network 面板搜索 `events/batch` 请求。

**Q: 支持 IE 浏览器吗？**
A: SDK 使用了 Promise 等 ES6+ 特性，IE 需要自行引入 polyfill。推荐使用 Chrome、Firefox、Edge 等现代浏览器。

**Q: 如何停止某个功能的采集？**
A: 在初始化时将对应的配置项设为 `false`，如 `captureErrors: false`。也可以调用 `sdk.destroy()` 停止所有采集。

**Q: 批量上报失败了怎么办？**
A: SDK 内置指数退避重试机制，默认最多重试 3 次。重试失败后静默丢弃，不会影响业务代码。

### 术语表

| 术语 | 说明 |
|------|------|
| FCP | First Contentful Paint，首次内容绘制 |
| LCP | Largest Contentful Paint，最大内容绘制 |
| FID | First Input Delay，首次输入延迟 |
| CLS | Cumulative Layout Shift，累积布局偏移 |
| TTFB | Time to First Byte，首字节时间 |
| Tree-shaking | 移除未引用代码的优化技术 |
| Sample Rate | 采样率，控制数据上报比例 |

### 联系方式与支持渠道

- 技术支持邮箱：support@example.com
- 项目仓库：https://github.com/example/monitoring-demo
- 问题反馈：请在项目仓库中提交 Issue
