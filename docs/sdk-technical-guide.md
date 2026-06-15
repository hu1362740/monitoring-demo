# SDK 详细技术文档

## 1. 源码解析与架构说明

本章节旨在帮助开发者快速熟悉 SDK 源码结构、核心功能及实现细节，为后续代码修改、功能扩展及版本升级提供技术指导。

### 1.1 源码目录结构

```
packages/sdk/
├── src/                          # 源代码主目录
│   ├── index.ts                  # 包入口文件，统一导出
│   ├── api.ts                    # 全局 API 函数（便捷调用）
│   ├── types.ts                  # TypeScript 类型定义
│   └── core/                     # 核心模块目录
│       ├── SDK.ts                # SDK 核心类，单例管理
│       ├── EventSender.ts        # 事件发送器（批量队列、重试）
│       ├── ErrorCapturer.ts      # 错误捕获器
│       ├── PerformanceCapturer.ts # 性能采集器
│       ├── ApiRequestCapturer.ts # API 请求拦截器
│       └── UserBehaviorCapturer.ts # 用户行为追踪器
├── tests/                        # 测试目录
│   ├── SDK.test.ts               # SDK 核心类单元测试
│   └── EventSender.test.ts       # 事件发送器单元测试
├── dist/                         # 构建产物目录（打包后生成）
│   ├── index.esm.js              # ES Module 格式
│   ├── index.cjs.js              # CommonJS 格式
│   ├── index.umd.js              # UMD 格式
│   ├── index.esm.min.js          # ES Module 压缩版
│   ├── index.cjs.min.js          # CommonJS 压缩版
│   └── index.umd.min.js          # UMD 压缩版
├── package.json                  # 包配置
├── tsconfig.json                 # TypeScript 配置
├── rollup.config.js              # Rollup 打包配置
└── jest.config.js                # Jest 测试配置
```

### 1.2 项目入口文件

#### 1.2.1 主入口文件：`src/index.ts`

```typescript
export { MonitoringSDK } from './core/SDK';
export type { SDKConfig, EventData, PerformanceData, ErrorData, ApiRequestData, UserBehaviorData } from './types';
export { captureException, capturePerformance, captureApiRequest, captureUserBehavior, trackEvent } from './api';
```

**作用说明：**
- 作为包的统一出口，所有对外暴露的类、类型、函数均从此文件导出
- 导出 `MonitoringSDK` 类供直接实例化使用
- 导出所有类型定义，方便第三方开发者进行类型检查
- 导出全局 API 函数，提供无需持有实例引用的便捷调用方式

#### 1.2.2 初始化流程解析

SDK 支持两种初始化方式：

**方式一：直接实例化**
```typescript
const sdk = new MonitoringSDK(config);
```

**方式二：单例模式初始化**
```typescript
const sdk = init(config);  // 首次调用创建实例
const same = init(config); // 再次调用返回同一实例
```

**初始化流程：**
1. 合并用户配置与默认值，生成完整配置对象
2. 创建 `EventSender` 实例，负责事件批量发送
3. 根据配置按需初始化各类采集器：
   - `captureErrors: true` → 初始化 `ErrorCapturer`
   - `capturePerformance: true` → 初始化 `PerformanceCapturer`
   - `captureApiRequests: true` → 初始化 `ApiRequestCapturer`
   - `captureUserBehavior: true` → 初始化 `UserBehaviorCapturer`
4. 各采集器在初始化时自动注册对应的事件监听

#### 1.2.3 核心类/函数的定义与导出方式

| 导出项 | 类型 | 来源文件 | 用途 |
|--------|------|----------|------|
| `MonitoringSDK` | Class | `core/SDK.ts` | SDK 核心类，支持直接实例化 |
| `init` | Function | `core/SDK.ts` | 单例初始化函数 |
| `getInstance` | Function | `core/SDK.ts` | 获取单例实例 |
| `captureException` | Function | `api.ts` | 全局异常捕获 |
| `capturePerformance` | Function | `api.ts` | 全局性能上报 |
| `captureApiRequest` | Function | `api.ts` | 全局 API 请求上报 |
| `captureUserBehavior` | Function | `api.ts` | 全局用户行为上报 |
| `trackEvent` | Function | `api.ts` | 全局自定义事件跟踪 |
| `SDKConfig` | Interface | `types.ts` | SDK 配置类型 |
| `EventData` | Interface | `types.ts` | 事件数据类型 |
| `PerformanceData` | Interface | `types.ts` | 性能数据类型 |
| `ErrorData` | Interface | `types.ts` | 错误数据类型 |
| `ApiRequestData` | Interface | `types.ts` | API 请求数据类型 |
| `UserBehaviorData` | Interface | `types.ts` | 用户行为数据类型 |

### 1.3 核心模块与功能详解

#### 1.3.1 模块划分依据及职责边界

SDK 采用**职责单一原则**进行模块划分，每个模块只负责一类数据的采集或处理：

| 模块 | 职责 | 边界 |
|------|------|------|
| `MonitoringSDK` | 配置管理、模块编排、对外 API | 不直接处理具体数据采集 |
| `EventSender` | 事件队列管理、批量发送、重试 | 不关心事件内容 |
| `ErrorCapturer` | JS 错误、Promise 异常捕获 | 只产出 error 类型事件 |
| `PerformanceCapturer` | 页面性能指标采集 | 只产出 performance 类型事件 |
| `ApiRequestCapturer` | XHR/Fetch 请求拦截 | 只产出 api_request 类型事件 |
| `UserBehaviorCapturer` | 用户交互行为追踪 | 只产出 user_behavior 类型事件 |

#### 1.3.2 各模块核心功能及实现逻辑

##### MonitoringSDK（`core/SDK.ts`）

**核心职责：** 作为 SDK 的入口类，负责：
- 接收并合并用户配置
- 初始化 EventSender 和各采集器
- 提供 `track`、`captureException`、`setUser` 等对外 API
- 实现采样率控制（`shouldSample`）
- 实现 `beforeSend` 钩子拦截

**关键实现逻辑：**
```typescript
// 采样率控制：概率采样，sampleRate=0.5 表示 50% 事件被上报
private shouldSample(): boolean {
  if (this.config.sampleRate >= 1.0) return true;
  return Math.random() < this.config.sampleRate;
}

// 事件发送流程：启用检查 → 采样过滤 → beforeSend 钩子 → 加入队列
private sendEvent(event: EventData): void {
  if (!this.config.enabled) return;
  if (!this.shouldSample()) return;
  const processedEvent = this.config.beforeSend?.(event) || event;
  if (!processedEvent) return;
  this.eventSender.send(processedEvent);
}
```

##### EventSender（`core/EventSender.ts`）

**核心职责：** 管理事件发送队列，实现批量上报和失败重试。

**关键实现逻辑：**
- **批量发送策略：** 队列长度达到 `batchSize` 时立即发送，或等待 `batchInterval` 毫秒后定时发送
- **指数退避重试：** 失败后等待 `2^attempt * 1000ms`（1s、2s、4s）再重试
- **防重入锁：** `isFlushing` 标志防止并发发送
- **失败回滚：** 发送失败时将事件重新放回队列头部

```typescript
// 批量发送触发条件
send(event: EventData): void {
  this.queue.push(eventWithUser);
  // 条件1：队列长度达到阈值，立即发送
  if (this.queue.length >= this.config.batchSize) {
    this.flush();
  // 条件2：启动定时器，等待间隔后发送
  } else if (!this.timer) {
    this.timer = setTimeout(() => this.flush(), this.config.batchInterval);
  }
}
```

##### ErrorCapturer（`core/ErrorCapturer.ts`）

**核心职责：** 自动捕获 JS 运行时错误和未处理的 Promise 异常。

**实现方式：**
- 通过覆盖 `window.onerror` 捕获同步错误和资源加载错误
- 通过覆盖 `window.onunhandledrejection` 捕获 Promise 异常
- 保存原始的 `onerror`/`onunhandledrejection` 处理器，在捕获后调用，避免破坏其他监听

##### PerformanceCapturer（`core/PerformanceCapturer.ts`）

**核心职责：** 采集页面加载性能指标和 Web Vitals。

**实现方式：**
- 监听 `load` 事件，读取 `performance.timing` 获取 Navigation Timing 数据
- 使用 `PerformanceObserver` 监听 `paint` 和 `largest-contentful-paint` 条目
- 计算关键性能指标：DNS 解析、TCP 连接、请求响应、DOM 解析等耗时

##### ApiRequestCapturer（`core/ApiRequestCapturer.ts`）

**核心职责：** 自动拦截 XMLHttpRequest 和 Fetch 请求，记录请求耗时和状态。

**实现方式：**
- **Fetch 拦截：** 通过 Monkey Patch 替换 `window.fetch`，在调用前后记录时间
- **XHR 拦截：** 替换 `XMLHttpRequest.prototype.open`，在 `onload`/`onerror` 中记录结果
- **URL 过滤：** 通过 `ignoreUrls` 配置忽略特定 URL（如 SDK 自身的上报请求）
- 保存原始方法引用，`destroy()` 时恢复

##### UserBehaviorCapturer（`core/UserBehaviorCapturer.ts`）

**核心职责：** 追踪用户交互行为（点击、页面浏览、表单提交）。

**实现方式：**
- 在 `document` 上监听 `click` 事件，记录点击目标元素信息和坐标
- 初始化时自动上报一次 `page_view` 事件
- 在 `document` 上监听 `submit` 事件（捕获阶段），记录表单提交
- 通过 `eventListeners` 数组记录所有监听器，`destroy()` 时统一移除

#### 1.3.3 模块间交互关系及数据流向

```
用户代码调用
    │
    ▼
┌──────────────────────────────────────────────────────────┐
│                    MonitoringSDK                          │
│  track() / captureException() / setUser() / flush()      │
├──────────────────────────────────────────────────────────┤
│  1. 检查 enabled 开关                                     │
│  2. 执行 shouldSample() 采样判断                           │
│  3. 执行 beforeSend() 钩子                                │
│  4. 将事件传递给 EventSender                               │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────┐
│                    EventSender                            │
│  send() → 加入队列 → 满足条件 → flush() → sendBatch()     │
│                                                           │
│  队列策略：batchSize 或 batchInterval 触发发送              │
│  重试策略：指数退避，最多 maxRetries 次                     │
│  失败处理：事件回退到队列，等待下次发送                      │
└──────────────────────┬───────────────────────────────────┘
                       │
                       ▼
              fetch(endpoint, payload)
              POST /api/v1/events/batch
```

**各采集器与 SDK 核心的交互：**
- 各采集器在构造时接收 `sendEvent` 回调函数（绑定到 SDK 实例）
- 采集到数据后，构造 `EventData` 对象，调用 `sendEvent` 回调
- `sendEvent` 经过 SDK 核心的采样和钩子处理后，传递给 `EventSender`

#### 1.3.4 关键算法或复杂逻辑的详细注释

##### 指数退避重试算法

```typescript
// 位于 EventSender.sendBatch()
for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
  try {
    const response = await fetch(this.config.endpoint, { ... });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    return; // 成功则直接返回
  } catch (error) {
    if (attempt === this.config.maxRetries - 1) throw error; // 最后一次重试仍失败，抛出异常
    // 指数退避：2^0*1000=1s, 2^1*1000=2s, 2^2*1000=4s
    await this.delay(Math.pow(2, attempt) * 1000);
  }
}
```

##### 概率采样算法

```typescript
// 位于 MonitoringSDK.shouldSample()
// sampleRate=1.0 时全量上报，sampleRate=0.5 时 50% 概率上报
private shouldSample(): boolean {
  if (this.config.sampleRate >= 1.0) return true;
  return Math.random() < this.config.sampleRate;
}
```

### 1.4 重要代码区域说明

#### 1.4.1 性能敏感区域

- **EventSender.send()：** 每次事件入队都会执行，应避免在此处做耗时操作
- **ApiRequestCapturer.interceptFetch()：** 拦截所有 Fetch 请求，拦截逻辑必须轻量，不能影响请求性能
- **UserBehaviorCapturer.trackClicks()：** 监听所有点击事件，需确保处理函数执行时间极短

#### 1.4.2 复杂业务逻辑实现

- **EventSender.flush()：** 包含防重入锁、定时器清理、队列快照、失败回滚等多步操作，需仔细理解执行顺序
- **ErrorCapturer.setup()：** 同时覆盖 `window.onerror` 和 `window.onunhandledrejection`，需保证原始处理器被正确调用

#### 1.4.3 外部依赖集成点

- **fetch API：** EventSender 使用 `fetch` 发送事件，ApiRequestCapturer 拦截 `window.fetch`
- **Performance API：** PerformanceCapturer 使用 `window.performance.timing` 和 `PerformanceObserver`
- **window 事件：** ErrorCapturer 覆盖 `window.onerror` 和 `window.onunhandledrejection`

#### 1.4.4 可扩展性设计关键点

- **采集器模块化：** 每个采集器独立实现，新增采集器只需实现 `sendEvent` 回调接口
- **beforeSend 钩子：** 允许用户在发送前修改或拦截事件，实现自定义过滤逻辑
- **配置驱动：** 所有功能开关通过配置控制，无需修改代码即可启用/禁用功能
- **多格式导出：** 支持 ES Module、CommonJS、UMD 三种格式，适配不同项目环境

---

## 2. 项目开发与运行指南

### 2.1 项目入口说明

#### 2.1.1 开发环境入口

- **源码入口：** `packages/sdk/src/index.ts`
- **开发方式：** 使用 `build:watch` 命令监听文件变化，自动重新编译
- **测试入口：** `packages/sdk/tests/` 目录下的测试文件

#### 2.1.2 生产环境构建输出

- **输出目录：** `packages/sdk/dist/`
- **输出文件：**
  - `index.esm.js` / `index.esm.min.js` — ES Module 格式，用于现代打包工具
  - `index.cjs.js` / `index.cjs.min.js` — CommonJS 格式，用于 Node.js 环境
  - `index.umd.js` / `index.umd.min.js` — UMD 格式，用于 `<script>` 标签引入
- **类型声明：** `index.d.ts`（由 TypeScript 编译器自动生成）

### 2.2 Package 运行命令详解

`packages/sdk/package.json` 中定义了以下命令：

| 命令 | 说明 | 使用场景 |
|------|------|----------|
| `npm run build` | 使用 Rollup 打包 SDK，生成所有格式的输出文件 | 发布前构建、本地验证产物 |
| `npm run build:watch` | 监听模式打包，文件变化时自动重新编译 | 开发阶段实时编译 |
| `npm test` | 运行 Jest 单元测试并生成覆盖率报告 | 开发后验证、CI 流水线 |
| `npm run lint` | 使用 ESLint 检查 `src/` 目录下的代码规范 | 提交前代码检查 |

### 2.3 命令使用方法

#### 2.3.1 构建命令

```bash
# 进入 SDK 目录
cd packages/sdk

# 安装依赖（首次或依赖变更后）
npm install

# 执行构建
npm run build

# 监听模式构建（开发时使用）
npm run build:watch
```

**构建产物验证：**
```bash
# 检查 dist 目录是否生成所有格式的文件
ls dist/
# 预期输出：
# index.esm.js  index.esm.js.map
# index.cjs.js  index.cjs.js.map
# index.umd.js  index.umd.js.map
# index.esm.min.js  index.esm.min.js.map
# index.cjs.min.js  index.cjs.min.js.map
# index.umd.min.js  index.umd.min.js.map
```

#### 2.3.2 测试命令

```bash
# 运行所有测试并生成覆盖率
npm test

# 覆盖率要求（jest.config.js 配置）：
# - 分支覆盖率 ≥ 80%
# - 函数覆盖率 ≥ 80%
# - 行覆盖率 ≥ 80%
# - 语句覆盖率 ≥ 80%
```

#### 2.3.3 代码检查命令

```bash
# 检查代码规范
npm run lint
```

---

## 3. SDK 打包与发布流程

### 3.1 本地代码编译与打包

#### 3.1.1 打包前准备工作

**环境要求：**
- Node.js >= 14.x
- npm >= 6.x 或 yarn >= 1.x

**依赖安装：**
```bash
# 在项目根目录安装所有依赖
npm install

# 或仅安装 SDK 包的依赖
cd packages/sdk
npm install
```

#### 3.1.2 打包配置说明

**Rollup 配置（`rollup.config.js`）：**

SDK 使用 Rollup 进行打包，配置了两个构建目标：

1. **未压缩版构建：**
   - 入口：`src/index.ts`
   - 输出：`dist/index.esm.js`、`dist/index.cjs.js`、`dist/index.umd.js`
   - 插件：`resolve`（模块解析）、`commonjs`（CommonJS 兼容）、`typescript`（TS 编译）
   - 生成 sourcemap

2. **压缩版构建：**
   - 入口：`src/index.ts`
   - 输出：`dist/index.esm.min.js`、`dist/index.cjs.min.js`、`dist/index.umd.min.js`
   - 额外插件：`terser`（代码压缩）
   - 压缩配置：移除 `console.log`、`console.debug` 调用
   - 生成 sourcemap

**TypeScript 配置（`tsconfig.json`）：**
- 目标：ES2020
- 模块：ESNext
- 严格模式：开启
- 生成声明文件：开启（`declaration: true`）
- 生成 sourcemap：开启

#### 3.1.3 执行打包命令

```bash
cd packages/sdk
npm run build
```

**打包流程：**
1. Rollup 读取 `rollup.config.js` 配置
2. 从 `src/index.ts` 开始解析依赖树
3. TypeScript 插件编译 `.ts` 文件为 `.js`
4. 按配置输出三种格式的文件
5. 第二遍构建加入 terser 压缩，输出压缩版文件

#### 3.1.4 打包产物验证

```bash
# 检查文件是否生成
ls dist/

# 验证 ES Module 格式（Node.js）
node -e "import('./dist/index.esm.js').then(m => console.log(Object.keys(m)))"

# 验证 CommonJS 格式（Node.js）
node -e "const m = require('./dist/index.cjs.js'); console.log(Object.keys(m))"

# 验证 UMD 格式（浏览器）
# 在 HTML 中引入 dist/index.umd.js，检查 window.MonitoringSDK 是否存在
```

### 3.2 发布到 npm 仓库

#### 3.2.1 npm 账号准备与登录

```bash
# 注册 npm 账号（如尚未注册）
npm adduser

# 或登录已有账号
npm login

# 验证登录状态
npm whoami
```

#### 3.2.2 版本号管理规范

遵循语义化版本（Semantic Versioning）`MAJOR.MINOR.PATCH`：

- **MAJOR（主版本）：** 不兼容的 API 变更，如修改配置项名称、移除功能
- **MINOR（次版本）：** 向下兼容的功能新增，如新增采集器、新增配置项
- **PATCH（补丁版本）：** 向下兼容的问题修复，如修复 bug、优化性能

```bash
# 更新补丁版本（1.0.0 → 1.0.1）
npm version patch

# 更新次版本（1.0.0 → 1.1.0）
npm version minor

# 更新主版本（1.0.0 → 2.0.0）
npm version major
```

#### 3.2.3 发布前检查项

- [ ] 所有测试通过：`npm test`
- [ ] 代码检查通过：`npm run lint`
- [ ] 构建成功：`npm run build`
- [ ] 版本号已更新：`npm version <type>`
- [ ] `package.json` 中 `files` 字段正确配置（仅包含 `dist/`）
- [ ] `README.md` 已更新（如有 API 变更）
- [ ] CHANGELOG 已更新（如有）

#### 3.2.4 执行发布命令

```bash
# 进入 SDK 目录
cd packages/sdk

# 确保构建产物是最新的
npm run build

# 发布到 npm（公开包）
npm publish --access public

# 如果是 scoped 包（@monitoring/sdk），需要指定 --access public
# 否则默认为 restricted（仅付费账号可用）
```

#### 3.2.5 发布后验证

```bash
# 等待几分钟后验证包是否可安装
npm view @monitoring/sdk

# 在新项目中测试安装
mkdir test-sdk && cd test-sdk
npm init -y
npm install @monitoring/sdk
```

### 3.3 发布到 GitHub Packages

#### 3.3.1 GitHub Packages 配置方法

在 `packages/sdk/package.json` 中添加发布配置：

```json
{
  "name": "@monitoring/sdk",
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  }
}
```

#### 3.3.2 认证方式

```bash
# 方式一：使用 .npmrc 文件（推荐）
# 在项目根目录创建 .npmrc
echo "//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN" > .npmrc

# 方式二：使用 npm login
npm login --registry=https://npm.pkg.github.com
```

#### 3.3.3 发布流程与注意事项

```bash
cd packages/sdk
npm run build
npm publish --registry=https://npm.pkg.github.com
```

**注意事项：**
- GitHub Packages 的包名必须与 GitHub 仓库名对应
- 需要具有 `write:packages` 权限的 GitHub Token
- 包的 scope（`@monitoring`）需要与 GitHub 用户名或组织名一致
- 消费端也需要配置 `.npmrc` 指向 GitHub Packages registry

---

## 4. SDK 代码质量与改进机制

### 4.1 当前代码质量现状

#### 4.1.1 测试覆盖

- **测试框架：** Jest + ts-jest
- **测试环境：** jsdom（模拟浏览器环境）
- **覆盖率要求：** 分支、函数、行、语句均 ≥ 80%
- **现有测试文件：**
  - `tests/SDK.test.ts`：SDK 核心类测试（初始化、单例、事件跟踪、异常捕获、用户信息）
  - `tests/EventSender.test.ts`：事件发送器测试（队列、批量发送、用户信息）

#### 4.1.2 代码规范

- **语言：** TypeScript 严格模式
- **类型安全：** 所有接口和类型定义完整
- **注释规范：** 符合项目 JSDoc 注释规范（中文注释）

### 4.2 已知改进建议

#### 4.2.1 测试覆盖不足

**问题：** 当前仅覆盖了 `SDK` 和 `EventSender` 两个模块，以下模块缺少单元测试：
- `ErrorCapturer`
- `PerformanceCapturer`
- `ApiRequestCapturer`
- `UserBehaviorCapturer`
- `api.ts` 中的全局函数

**建议：** 补充各采集器的单元测试，确保整体覆盖率 ≥ 80%。

#### 4.2.2 缺少集成测试

**问题：** 当前仅有单元测试，缺少端到端集成测试。

**建议：** 添加集成测试，验证 SDK 初始化 → 数据采集 → 事件发送的完整流程。

#### 4.2.3 ErrorCapturer 资源错误捕获不完整

**问题：** 当前 `ErrorCapturer` 仅覆盖了 `window.onerror` 和 `window.onunhandledrejection`，未通过 `addEventListener('error')` 捕获资源加载错误（img、script、link 等）。

**建议：** 添加 `window.addEventListener('error', handler, true)` 捕获资源加载错误，通过 `event.target` 判断是否为资源元素。

#### 4.2.4 PerformanceCapturer 缺少 FID/CLS 采集

**问题：** 当前性能采集器仅采集了 Navigation Timing 和 Paint Timing（FCP、LCP），缺少 FID（First Input Delay）和 CLS（Cumulative Layout Shift）的采集。

**建议：** 使用 `PerformanceObserver` 监听 `first-input` 和 `layout-shift` 条目。

#### 4.2.5 ApiRequestCapturer 缺少请求/响应体大小计算

**问题：** 文档中提到上报 `requestSize` 和 `responseSize`，但当前实现中未计算这两个字段。

**建议：** 在拦截器中计算请求体和响应体的大小（通过 `Content-Length` 头或实际数据长度）。

#### 4.2.6 单例模式未重置机制

**问题：** `init()` 函数创建的单例在 `destroy()` 后无法重新初始化，因为 `instance` 变量未被清空。

**建议：** 在 `destroy()` 方法中将 `instance` 置为 `null`，或提供 `reset()` 方法。

#### 4.2.7 缺少 ESLint 配置文件

**问题：** `package.json` 中定义了 `lint` 命令，但项目中未发现 `.eslintrc` 配置文件。

**建议：** 添加 `.eslintrc.js` 或 `.eslintrc.json` 配置文件，定义代码规范。

### 4.3 改进实施流程

1. **提出改进建议：** 在本文档中记录发现的问题和改进方案
2. **项目负责人审核：** 评估改进的必要性、影响范围和优先级
3. **审核通过后实施：** 修改代码、补充测试、更新文档
4. **验证改进效果：** 运行测试、检查覆盖率、验证功能正常
5. **更新文档：** 同步更新 SDK 使用文档和技术文档
