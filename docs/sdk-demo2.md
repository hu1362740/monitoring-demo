# Monitoring SDK 技术集成指南

***

## 一、服务端渲染多页面应用（MPA）集成指南

### 1.1 适用场景分析

服务端渲染的电商网站，每个页面是独立的 HTML 文件：

- 首页 (`/`)
- 商品列表页 (`/products`)
- 商品详情页 (`/products/:id`)
- 个人中心页 (`/profile`)

**核心特点**：每次页面跳转都会重新加载 JS，HTTP 无状态。

### 1.2 完整集成流程

#### 步骤 1：安装 SDK

```bash
npm install @monitoring/sdk --save
```

#### 步骤 2：创建公共初始化脚本

**文件位置**：`public/js/monitoring.js`

```javascript
import { init, setUser, trackEvent } from '@monitoring/sdk';

/**
 * 全局唯一的 SDK 实例初始化
 * 单例模式确保不会重复创建实例
 */
const sdk = init({
  // ========== 必填配置 ==========
  apiKey: 'your-project-api-key',  // 项目标识，从监控平台获取
  
  // ========== 功能开关 ==========
  captureErrors: true,             // 自动捕获 JS 错误
  capturePerformance: true,        // 自动采集性能指标
  captureApiRequests: true,        // 自动拦截 API 请求
  captureUserBehavior: true,       // 自动追踪用户行为
  
  // ========== 上报配置 ==========
  endpoint: 'https://monitor.your-domain.com/v1/events',  // 自定义上报地址
  batchSize: 20,                   // 批量上报阈值
  batchInterval: 5000,             // 批量上报间隔(ms)
  maxRetries: 3,                   // 失败重试次数
  sampleRate: 1.0,                 // 采样率(0~1)
  
  // ========== 过滤配置 ==========
  ignoreUrls: [
    'analytics.example.com',        // 忽略埋点上报请求
    'cdn.static.com'               // 忽略静态资源请求
  ],
  
  // ========== 高级配置 ==========
  debug: false,                    // 生产环境关闭调试
  beforeSend: (event) => {
    // 发送前钩子：可修改或拦截事件
    event.data.appVersion = '1.0.0';
    event.data.platform = 'web';
    return event;
  }
});

/**
 * 用户标识设置（保持会话一致性）
 * 用户登录后通过 localStorage 持久化
 */
const userId = localStorage.getItem('currentUserId');
const userInfo = localStorage.getItem('userInfo');
if (userId) {
  sdk.setUser({
    id: userId,
    ...(userInfo ? JSON.parse(userInfo) : {})
  });
}

// 暴露全局变量供页面使用
window.MonitoringSDK = sdk;
window.trackEvent = trackEvent;
```

#### 步骤 3：在 HTML 模板中引入

**所有页面共用同一模板**：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>电商网站</title>
  <!-- 公共监控脚本 - 所有页面都引入 -->
  <script src="/js/monitoring.js"></script>
</head>
<body>
  <!-- 页面内容 -->
</body>
</html>
```

### 1.3 页面级监控实现

#### 首页 (`index.html`)

```javascript
// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', () => {
  // 手动上报页面浏览事件
  trackEvent('page_view', {
    pageName: '首页',
    pagePath: '/',
    timestamp: Date.now()
  });
  
  // 首页特定埋点
  const banner = document.querySelector('.banner');
  banner.addEventListener('click', () => {
    trackEvent('banner_click', {
      bannerId: 'home_banner_001',
      position: 'top'
    });
  });
});
```

#### 商品详情页 (`product-detail.html`)

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // 获取 URL 参数
  const productId = new URLSearchParams(window.location.search).get('id');
  
  // 上报页面浏览
  trackEvent('page_view', {
    pageName: '商品详情页',
    pagePath: '/product/detail',
    productId: productId
  });
  
  // 加入购物车按钮
  document.getElementById('add-cart').addEventListener('click', () => {
    trackEvent('add_to_cart', {
      productId: productId,
      price: 299.99,
      quantity: 1
    });
  });
  
  // 立即购买按钮
  document.getElementById('buy-now').addEventListener('click', () => {
    trackEvent('buy_now', {
      productId: productId,
      price: 299.99
    });
  });
});
```

### 1.4 页面引入策略分析

| 方案           | 说明                     | 推荐度   |
| :----------- | :--------------------- | :---- |
| **公共入口引入**   | 在公共 JS 文件中初始化一次，所有页面共享 | ⭐⭐⭐⭐⭐ |
| **每个页面单独引入** | 重复初始化，浪费资源             | ⭐⭐    |
| **动态加载**     | 按需加载，复杂度高              | ⭐⭐⭐   |

**标准做法**：使用公共入口引入方案，SDK 内部单例模式确保不会重复创建。

***

## 二、便捷 API 设计深度解析

### 2.1 导出方法设计理念

查看 `src/index.ts` 和 `src/api.ts` 的设计：

```typescript
// src/index.ts
export { captureException, capturePerformance, captureApiRequest, captureUserBehavior, trackEvent } from './api';
```

**设计理念：**

```typescript
// src/api.ts - 便捷 API 封装模式
export function captureException(error: Error, context?: Record<string, unknown>): void {
  const instance = getInstance();
  if (instance) {
    instance.captureException(error, context);
  }
}
```

| 设计要点     | 说明                     |
| :------- | :--------------------- |
| **单例解耦** | 调用方无需持有实例引用            |
| **容错设计** | SDK 未初始化时静默失败，不影响业务    |
| **全局可达** | 任意模块可直接调用，无需传递实例       |
| **统一入口** | 所有功能通过统一 API 暴露，降低学习成本 |

### 2.2 初始化机制与自动调用说明

**为何某些功能不会自动调用？**

| 功能类型       | 自动调用 | 手动调用 | 原因                    |
| :--------- | :--- | :--- | :-------------------- |
| 错误捕获       | ✅    | -    | 自动监听 `window.onerror` |
| 性能采集       | ✅    | -    | 自动监听 `load` 事件        |
| API 请求拦截   | ✅    | -    | 自动重写 `fetch`/`XHR`    |
| 用户行为追踪     | ✅    | -    | 自动监听 DOM 事件           |
| **自定义埋点**  | ❌    | ✅    | 需要业务上下文               |
| **手动异常上报** | ❌    | ✅    | 需要精确控制                |

**手动调用的必要性**：

```javascript
// 场景1：业务异常捕获
try {
  await submitOrder();
} catch (e) {
  // 需要附加业务上下文
  captureException(e, { 
    orderId: 'ORD001', 
    action: 'submit_order' 
  });
}

// 场景2：业务指标追踪
trackEvent('order_complete', {
  orderId: 'ORD001',
  amount: 299.99,
  paymentMethod: 'wechat'
});
```

### 2.3 类方法调用 vs API 调用对比

```javascript
// 方式1：便捷 API（推荐用于业务代码）
import { captureException, trackEvent } from '@monitoring/sdk';

function handleSubmit() {
  try {
    // 业务逻辑
  } catch (e) {
    captureException(e, { action: 'submit' });
  }
}

// 方式2：类方法调用（推荐用于 SDK 内部或需要细粒度控制）
import { init } from '@monitoring/sdk';

const sdk = init({ apiKey: 'xxx' });
sdk.captureException(error);
sdk.track('event_name', { data: 'xxx' });
```

| 对比维度  | 便捷 API    | 类方法调用       |
| :---- | :-------- | :---------- |
| 代码侵入性 | 低         | 高           |
| 上下文依赖 | 无         | 需要持有实例      |
| 适用场景  | 业务埋点、异常捕获 | SDK 配置、高级操作 |
| 容错能力  | 未初始化时静默失败 | 需要手动判断      |

### 2.4 `captureException` 与自动错误捕获的异同

| 对比维度      | `captureException()` | 自动捕获 (`captureErrors: true`) |
| :-------- | :------------------- | :--------------------------- |
| **触发方式**  | 手动调用                 | 自动监听                         |
| **捕获范围**  | 特定代码块                | 全局错误                         |
| **上下文信息** | 可自定义                 | 自动收集                         |
| **适用场景**  | 业务异常、预期错误            | 未捕获异常、运行时错误                  |

**功能边界示例**：

```javascript
// 自动捕获：无法预期的错误
window.onerror = (message, filename, line) => {
  // SDK 自动捕获并上报
};

// 手动捕获：预期内的业务异常
try {
  const result = await fetchUserInfo(userId);
  if (!result) {
    // 手动上报，附加业务上下文
    captureException(new Error('User not found'), { userId });
  }
} catch (e) {
  // 手动上报网络异常
  captureException(e, { userId, action: 'fetch_user' });
}
```

***

## 三、单页面应用（SPA）集成指南

### 3.1 Vue 应用完整集成

#### 步骤 1：创建插件

**文件**：`src/plugins/monitoring.ts`

```typescript
import { init, setUser, trackEvent } from '@monitoring/sdk';
import type { App } from 'vue';

export default {
  install(app: App) {
    // 初始化 SDK
    const sdk = init({
      apiKey: 'your-api-key',
      captureErrors: true,
      capturePerformance: true,
      captureApiRequests: true,
      captureUserBehavior: true,
      debug: import.meta.env.DEV,
      beforeSend: (event) => {
        event.data.env = import.meta.env.MODE;
        return event;
      }
    });

    // 注入全局属性
    app.config.globalProperties.$monitor = sdk;
    
    // 路由守卫 - 页面切换追踪
    const router = app.config.globalProperties.$router;
    if (router) {
      router.beforeEach((to, from) => {
        trackEvent('page_view', {
          pageName: to.name || to.path,
          from: from.name || from.path,
          timestamp: Date.now()
        });
      });
    }
  }
};
```

#### 步骤 2：在 `main.ts` 中注册

```typescript
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import monitoringPlugin from './plugins/monitoring';

const app = createApp(App);
app.use(router);
app.use(monitoringPlugin);
app.mount('#app');
```

#### 步骤 3：组件中使用

```vue
<script setup lang="ts">
import { trackEvent, captureException } from '@monitoring/sdk';
import { onMounted, onUnmounted } from 'vue';

const props = defineProps<{ productId: string }>();

onMounted(() => {
  // 组件挂载时上报
  trackEvent('component_mount', {
    component: 'ProductCard',
    productId: props.productId
  });
});

onUnmounted(() => {
  // 组件卸载时上报
  trackEvent('component_unmount', {
    component: 'ProductCard'
  });
});

const handleClick = async () => {
  try {
    await addToCart(props.productId);
    trackEvent('add_to_cart', { productId: props.productId });
  } catch (e) {
    captureException(e as Error, { productId: props.productId });
  }
};
</script>
```

### 3.2 React 应用完整集成

#### 步骤 1：创建 Hook

**文件**：`src/hooks/useMonitor.ts`

```typescript
import { init, setUser, trackEvent, captureException } from '@monitoring/sdk';
import { useEffect, useCallback } from 'react';

// 全局单例初始化
const sdk = init({
  apiKey: 'your-api-key',
  captureErrors: true,
  capturePerformance: true,
  captureApiRequests: true,
  captureUserBehavior: true
});

export function useMonitor() {
  const track = useCallback((eventName: string, properties?: Record<string, unknown>) => {
    trackEvent(eventName, properties);
  }, []);

  const capture = useCallback((error: Error, context?: Record<string, unknown>) => {
    captureException(error, context);
  }, []);

  return { track, capture, setUser, sdk };
}

// 页面浏览追踪 Hook
export function usePageView(pageName: string) {
  const { track } = useMonitor();
  
  useEffect(() => {
    track('page_view', { pageName, timestamp: Date.now() });
  }, [pageName, track]);
}
```

#### 步骤 2：路由集成

```tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from '@monitoring/sdk';

function App() {
  const location = useLocation();

  useEffect(() => {
    // 路由变化时上报
    trackEvent('page_view', {
      pageName: location.pathname,
      timestamp: Date.now()
    });
  }, [location.pathname]);

  return <Outlet />;
}
```

#### 步骤 3：组件使用

```tsx
import { useMonitor, usePageView } from '../hooks/useMonitor';

function ProductDetail({ productId }: { productId: string }) {
  const { track, capture } = useMonitor();
  usePageView('product_detail'); // 自动上报页面浏览

  const handleAddToCart = async () => {
    try {
      await addToCart(productId);
      track('add_to_cart', { productId });
    } catch (e) {
      capture(e as Error, { productId });
    }
  };

  return (
    <button onClick={handleAddToCart}>加入购物车</button>
  );
}
```

### 3.3 SPA 与 MPA 集成关键区别

| 对比维度      | SPA（Vue/React） | MPA（服务端渲染）          |
| :-------- | :------------- | :------------------ |
| **初始化次数** | 应用启动时一次        | 每个页面加载时（但单例模式保证唯一）  |
| **页面追踪**  | 路由守卫/useEffect | DOMContentLoaded 事件 |
| **生命周期**  | 组件挂载/卸载        | 页面加载/卸载             |
| **用户状态**  | 内存中保持          | 需要 localStorage 持久化 |
| **资源加载**  | 按需懒加载          | 每次页面重新加载            |
| **集成复杂度** | 框架特定配置         | 通用 JS 脚本            |

***

## 四、最佳实践建议

### 4.1 配置最佳实践

```javascript
// 生产环境配置模板
init({
  apiKey: process.env.MONITOR_API_KEY,
  endpoint: process.env.MONITOR_ENDPOINT,
  
  // 核心功能全开
  captureErrors: true,
  capturePerformance: true,
  captureApiRequests: true,
  captureUserBehavior: true,
  
  // 高流量优化
  sampleRate: process.env.NODE_ENV === 'production' ? 0.8 : 1.0,
  batchSize: 50,
  batchInterval: 10000,
  
  // 安全过滤
  ignoreUrls: [
    /analytics/,
    /cdn/
  ],
  
  // 数据增强与隐私保护
  beforeSend: (event) => {
    // 添加版本信息
    event.data.version = process.env.APP_VERSION;
    
    // 敏感数据脱敏
    if (event.data.url?.includes('/api/user')) {
      event.data.url = '/api/user/[hidden]';
    }
    
    // 过滤用户密码等字段
    if (event.data.password) {
      event.data.password = '[protected]';
    }
    
    return event;
  }
});
```

### 4.2 用户追踪最佳实践

```javascript
// 用户登录成功后
const login = async (username, password) => {
  const user = await api.login(username, password);
  
  // 设置用户标识
  sdk.setUser({
    id: user.id,
    username: user.username,
    role: user.role,
    loginTime: Date.now()
  });
  
  // 持久化到 localStorage
  localStorage.setItem('userId', user.id);
  localStorage.setItem('userInfo', JSON.stringify({
    username: user.username,
    role: user.role
  }));
};

// 用户登出时
const logout = () => {
  // 清除用户信息
  sdk.clearUser();
  localStorage.removeItem('userId');
  localStorage.removeItem('userInfo');
};
```

### 4.3 错误处理最佳实践

```javascript
// 全局错误边界（React）
class ErrorBoundary extends React.Component {
  componentDidCatch(error, info) {
    captureException(error, {
      component: this.props.name,
      info: info.componentStack
    });
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

// API 请求错误统一处理
const fetchWithMonitor = async (url, options) => {
  const startTime = Date.now();
  try {
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    
    // 上报成功请求
    captureApiRequest({
      url,
      method: options.method || 'GET',
      statusCode: response.status,
      duration,
      success: response.ok,
      timestamp: Date.now()
    });
    
    return response;
  } catch (e) {
    const duration = Date.now() - startTime;
    
    // 上报失败请求
    captureApiRequest({
      url,
      method: options.method || 'GET',
      statusCode: 0,
      duration,
      success: false,
      timestamp: Date.now(),
      error: e.message
    });
    
    throw e;
  }
};
```

***

## 五、核心概念总结

| 概念             | 说明                                        |
| :------------- | :---------------------------------------- |
| **单例模式**       | SDK 全局唯一实例，`init()` 创建，`getInstance()` 获取 |
| **自动捕获**       | 错误、性能、API、行为可自动采集，零侵入                     |
| **便捷 API**     | 无需持有实例，直接调用，容错性强                          |
| **批量上报**       | 事件入队，达到阈值或超时后批量发送                         |
| **重试机制**       | 指数退避策略，保证数据可靠性                            |
| **beforeSend** | 发送前钩子，支持数据修改和拦截                           |
| **采样率**        | 控制上报比例，平衡数据量与性能                           |

***

## 六、常见问题解答

**Q1：SDK 初始化后，页面间如何共享状态？**

A：MPA 场景下通过 `localStorage` 持久化用户信息；SPA 场景下状态天然保存在内存中。

**Q2：如何确保 SDK 不会影响页面性能？**

A：SDK 采用批量异步上报机制，所有采集操作都是非阻塞的，不会阻塞主线程。

**Q3：支持哪些浏览器？**

A：支持所有现代浏览器（Chrome、Firefox、Safari、Edge），IE11 需要额外的 polyfill。

**Q4：如何调试 SDK？**

A：设置 `debug: true`，SDK 会在控制台输出详细日志。

**Q5：数据上报失败会怎样？**

A：SDK 会自动重试（最多 `maxRetries` 次），采用指数退避策略，失败事件会保留在队列中等待下次发送。

***

通过以上指南，您可以在任何类型的 Web 应用中实现全面、可靠的监控覆盖。如需进一步定制或有其他问题，请参考 SDK 源码或联系技术支持。
