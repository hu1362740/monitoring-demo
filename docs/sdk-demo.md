我来查看 SDK 的核心代码结构，以便为您提供准确的使用指南。

toolName: view\_files

status: success

filePath: d:\mywork\AI\trae\monitoring-demo\packages\sdk\src\index.ts

toolName: view\_files

status: success

filePath: d:\mywork\AI\trae\monitoring-demo\packages\sdk\src\api.ts

toolName: view\_files

status: success

filePath: d:\mywork\AI\trae\monitoring-demo\packages\sdk\src\core\SDK.ts

# Monitoring SDK 使用指南

## 一、服务端渲染多页面应用（MPA）使用指南

### 1.1 适用场景

服务端渲染的多页面应用（如传统电商网站），每个页面是独立的 HTML 文件，通过服务端路由切换。例如：

- `首页` (`/`)
- `商品列表页` (`/products`)
- `商品详情页` (`/products/:id`)
- `个人中心页` (`/profile`)

### 1.2 标准配置方案

**最佳实践：在公共入口文件中初始化，各页面共享同一个实例**

由于 HTTP 是无状态的，每次页面刷新都会重新加载 JavaScript，因此需要在每个页面都引入 SDK 脚本，但 SDK 会自动保持会话一致性（通过 `setUser` 设置用户标识）。

#### 步骤 1：创建公共初始化脚本

在项目的公共 JS 文件中（如 `monitoring.js`）：

```javascript
// 公共初始化脚本 - 在所有页面加载
import { init, setUser } from '@monitoring/sdk';

// 初始化 SDK（单例模式，重复调用不会创建新实例）
const sdk = init({
  // 【必填】项目唯一标识，从监控平台获取
  apiKey: 'your-project-api-key',
  
  // 【推荐配置】开启所有监控功能
  captureErrors: true,           // 自动捕获 JavaScript 错误
  capturePerformance: true,      // 自动采集性能数据
  captureApiRequests: true,      // 自动拦截 API 请求
  captureUserBehavior: true,     // 自动追踪用户行为
  
  // 【可选配置】按需调整
  endpoint: 'https://your-monitor-server.com/v1/events', // 自定义上报地址
  debug: false,                  // 生产环境关闭调试
  sampleRate: 1.0,              // 采样率 100%（可根据流量调整）
  batchSize: 20,                // 批量上报阈值
  batchInterval: 5000,          // 批量上报间隔（毫秒）
  maxRetries: 3,                // 失败重试次数
  
  // 【重要】忽略不需要监控的请求（如埋点上报、静态资源）
  ignoreUrls: [
    'your-analytics.com',
    'static-cdn.com'
  ],
  
  // 【高级】发送前钩子，可修改或拦截事件
  beforeSend: (event) => {
    // 例如：添加自定义标签
    event.data.appVersion = '1.0.0';
    return event;
  }
});

// 如果用户已登录，设置用户标识（保持会话追踪）
const userId = localStorage.getItem('userId');
if (userId) {
  sdk.setUser({ id: userId });
}
```

#### 步骤 2：在 HTML 中引入

在每个页面的 `<head>` 中引入：

```html
<!-- 所有页面通用 -->
<script src="/path/to/monitoring.js"></script>
```

#### 步骤 3：页面级自定义埋点

在特定页面添加业务埋点：

```javascript
// 商品详情页 - product-detail.js
import { trackEvent } from '@monitoring/sdk';

// 页面加载时上报页面浏览
trackEvent('page_view', {
  pageName: 'product_detail',
  productId: '12345',
  category: '电子产品'
});

// 绑定按钮点击事件
document.getElementById('add-to-cart').addEventListener('click', () => {
  trackEvent('add_to_cart', {
    productId: '12345',
    price: 999.99,
    quantity: 1
  });
});
```

### 1.3 MPA 使用要点总结

| 要点        | 说明                                                       |
| :-------- | :------------------------------------------------------- |
| **初始化位置** | 公共 JS 文件，所有页面共享                                          |
| **初始化次数** | 每个页面加载都会执行，但 SDK 内部是单例模式，不会重复创建                          |
| **用户追踪**  | 使用 `setUser()` 设置用户 ID，配合 `localStorage` 保持会话            |
| **页面标识**  | 通过 `trackEvent('page_view', { pageName: 'xxx' })` 手动上报页面 |

***

## 二、便捷 API 的设计意图

### 2.1 为什么要导出便捷方法

查看 `src/api.ts` 和 `src/index.ts` 的设计：

```typescript
// src/api.ts - 便捷 API 封装
export function captureException(error: Error, context?: Record<string, unknown>): void {
  const instance = getInstance();
  if (instance) {
    instance.captureException(error, context);
  }
}
```

**核心设计思想：**

1. **解耦性**：调用方无需持有 SDK 实例引用
2. **容错性**：SDK 未初始化时不会报错（静默失败）
3. **便捷性**：一行代码即可调用，无需先获取实例
4. **跨模块共享**：在任意模块中直接调用，无需传递实例

### 2.2 `captureApiRequest` 与自动捕获的区别

| 对比维度      | `captureApiRequest()` 手动调用 | SDK 自动捕获 (`captureApiRequests: true`) |
| :-------- | :------------------------- | :------------------------------------ |
| **触发方式**  | 手动调用                       | 自动拦截 XHR/Fetch                        |
| **适用场景**  | 非标准请求、自定义上报                | 标准 HTTP 请求                            |
| **数据完整性** | 需手动传入所有字段                  | 自动收集 URL、方法、状态码、耗时                    |
| **代码侵入性** | 需要埋点                       | 零侵入                                   |

**何时使用手动上报？**

```javascript
import { captureApiRequest } from '@monitoring/sdk';

// 场景1：WebSocket 消息追踪
ws.onmessage = (event) => {
  captureApiRequest({
    url: 'wss://api.example.com/realtime',
    method: 'WEBSOCKET',
    statusCode: 101,
    duration: 50,
    success: true,
    timestamp: Date.now()
  });
};

// 场景2：SDK 无法自动拦截的请求
const result = await customRequestLibrary('/api/data');
captureApiRequest({
  url: '/api/data',
  method: 'GET',
  statusCode: result.status,
  duration: result.time,
  success: result.success
});
```

### 2.3 调用方式对比

```javascript
// 方式1：便捷 API（推荐）
import { captureException, trackEvent } from '@monitoring/sdk';

try {
  riskyOperation();
} catch (e) {
  captureException(e, { page: 'home' });
}
trackEvent('button_click', { id: 'submit' });

// 方式2：通过实例调用（需要持有引用）
import { init } from '@monitoring/sdk';

const sdk = init({ apiKey: 'xxx' });
sdk.captureException(error);
sdk.track('button_click', { id: 'submit' });
```

***

## 三、单页面应用（SPA）使用指南

### 3.1 Vue 应用集成

#### 步骤 1：安装依赖

```bash
npm install @monitoring/sdk
```

#### 步骤 2：创建插件文件 `src/plugins/monitoring.js`

```javascript
import { init, setUser, trackEvent } from '@monitoring/sdk';

export default {
  install(app) {
    // 初始化 SDK
    const sdk = init({
      apiKey: 'your-api-key',
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: true,
      debug: process.env.NODE_ENV !== 'production',
      beforeSend: (event) => {
        // 添加应用版本信息
        event.data.version = process.env.VUE_APP_VERSION;
        return event;
      }
    });

    // 注入全局方法
    app.config.globalProperties.$monitor = sdk;
    
    // 路由守卫 - 页面切换时上报
    app.mixin({
      beforeRouteEnter(to, from, next) {
        next(vm => {
          trackEvent('page_view', {
            pageName: to.name || to.path,
            from: from.name || from.path,
            timestamp: Date.now()
          });
        });
      }
    });
  }
};
```

#### 步骤 3：在 `main.js` 中使用

```javascript
import { createApp } from 'vue';
import App from './App.vue';
import monitoringPlugin from './plugins/monitoring';
import router from './router';

const app = createApp(App);
app.use(router);
app.use(monitoringPlugin); // 注册监控插件
app.mount('#app');
```

#### 步骤 4：组件中使用

```vue
<template>
  <button @click="handleAddToCart">加入购物车</button>
</template>

<script setup>
import { trackEvent, captureException } from '@monitoring/sdk';

const handleAddToCart = async () => {
  try {
    await addToCartApi(productId);
    // 上报成功事件
    trackEvent('add_to_cart', {
      productId: '123',
      price: 999.99
    });
  } catch (e) {
    // 上报异常
    captureException(e, { action: 'add_to_cart' });
  }
};
</script>
```

### 3.2 React 应用集成

#### 步骤 1：创建监控 Hook `src/hooks/useMonitor.js`

```javascript
import { init, setUser, trackEvent, captureException } from '@monitoring/sdk';
import { useEffect } from 'react';

// 初始化 SDK（确保只执行一次）
const sdk = init({
  apiKey: 'your-api-key',
  captureErrors: true,
  capturePerformance: true,
  captureApiRequests: true,
  captureUserBehavior: true
});

export function useMonitor() {
  return {
    trackEvent,
    captureException,
    setUser,
    sdk
  };
}

// 页面浏览追踪 Hook
export function usePageView(pageName) {
  useEffect(() => {
    trackEvent('page_view', {
      pageName,
      timestamp: Date.now()
    });
  }, [pageName]);
}
```

#### 步骤 2：在组件中使用

```jsx
import { useMonitor, usePageView } from '../hooks/useMonitor';

function ProductDetail({ productId }) {
  const { trackEvent, captureException } = useMonitor();
  usePageView('product_detail'); // 页面浏览自动上报

  const handleAddToCart = async () => {
    try {
      await addToCart(productId);
      trackEvent('add_to_cart', { productId });
    } catch (e) {
      captureException(e, { productId });
    }
  };

  return <button onClick={handleAddToCart}>加入购物车</button>;
}
```

#### 步骤 3：路由级别集成

```jsx
import { useEffect } from 'react';
import { trackEvent } from '@monitoring/sdk';

function App() {
  const location = useLocation();

  useEffect(() => {
    // 路由变化时上报页面浏览
    trackEvent('page_view', {
      pageName: location.pathname,
      timestamp: Date.now()
    });
  }, [location.pathname]);

  return <Outlet />;
}
```

***

## 四、完整配置示例

### 4.1 生产环境推荐配置

```javascript
import { init } from '@monitoring/sdk';

const sdk = init({
  // 基础配置
  apiKey: 'prod-api-key-xxxx',
  endpoint: 'https://monitor.your-company.com/v1/events',
  
  // 功能开关
  captureErrors: true,
  capturePerformance: true,
  captureApiRequests: true,
  captureUserBehavior: true,
  
  // 性能优化
  sampleRate: 0.8,           // 80% 采样（高流量场景）
  batchSize: 50,             // 增大批量阈值
  batchInterval: 10000,      // 延长上报间隔
  
  // 安全与过滤
  ignoreUrls: [
    /^https?:\/\/analytics\./,
    /^https?:\/\/cdn\./
  ],
  
  // 数据增强
  beforeSend: (event) => {
    // 添加环境信息
    event.data.env = 'production';
    event.data.appVersion = '2.1.0';
    
    // 过滤敏感数据（重要！）
    if (event.data.url?.includes('/api/user/profile')) {
      return null; // 不上报包含用户隐私的请求
    }
    
    return event;
  }
});
```

### 4.2 用户追踪示例

```javascript
// 用户登录后设置标识
sdk.setUser({
  id: 'user-12345',
  name: '张三',
  role: 'vip',
  createdAt: '2024-01-01'
});

// 用户登出时清除
sdk.clearUser();
```

***

## 五、核心概念总结

| 概念             | 说明                                           |
| :------------- | :------------------------------------------- |
| **单例模式**       | SDK 全局唯一实例，通过 `init()` 创建，`getInstance()` 获取 |
| **自动捕获**       | 错误、性能、API 请求、用户行为可自动采集，零侵入                   |
| **便捷 API**     | `captureException`、`trackEvent` 等，无需持有实例     |
| **批量上报**       | 事件先入队列，达到阈值或超时后批量发送                          |
| **重试机制**       | 上报失败自动重试，采用指数退避策略                            |
| **beforeSend** | 发送前钩子，可修改或拦截事件                               |
| **采样率**        | 控制上报比例，降低服务器压力                               |

***

## 六、最佳实践建议

1. **初始化时机**：SPA 在应用启动时初始化一次；MPA 在公共脚本中初始化
2. **用户标识**：登录后立即调用 `setUser()`，确保用户行为可追踪
3. **敏感数据过滤**：使用 `beforeSend` 钩子过滤用户隐私信息
4. **采样率调整**：根据业务流量调整 `sampleRate`，避免数据爆炸
5. **错误边界**：在关键业务流程中使用 `captureException` 手动捕获
6. **版本标识**：通过 `beforeSend` 添加应用版本，便于问题定位

通过以上方式，您可以在任何类型的 Web 应用中实现全面的监控覆盖，包括错误追踪、性能分析、用户行为分析和业务埋点。
