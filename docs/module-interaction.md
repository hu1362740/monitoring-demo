# 模块间交互流程文档

## 1. 概述

本文档详细描述前端监控系统各模块间的交互流程，包括核心业务场景中各个模块的协作方式、数据传递、接口调用及异常处理机制。

---

## 2. 核心业务流程交互

### 2.1 事件采集与上报流程

#### 2.1.1 流程概述

SDK模块负责前端数据采集，通过网络层将数据上报到Server模块，Server模块进行数据验证、清洗和存储。

#### 2.1.2 交互步骤

| 步骤 | 模块 | 操作 | 数据传递 |
|------|------|------|----------|
| 1 | SDK | 初始化SDK配置 | `config: SDKConfig` |
| 2 | SDK | 捕获各类事件（错误/性能/API请求/用户行为） | `event: EventData` |
| 3 | SDK | 事件入队 | `queue: EventQueue` |
| 4 | SDK | 批量上报（定时/达到阈值） | `events: EventData[]` |
| 5 | Server | 验证API Key | `apiKey: string` |
| 6 | Server | 数据清洗与标准化 | `normalizedEvents: NormalizedEvent[]` |
| 7 | Server | 存储到MySQL | `rowsAffected: number` |
| 8 | Server | 更新Redis缓存 | `cacheKey: string` |

#### 2.1.3 调用链详情

```
SDK.init(config)
    │
    ▼
SDK.ErrorCapturer.capture(error)
    │
    ▼
SDK.EventSender.enqueue(event)
    │
    ▼
SDK.EventSender.flush() ──POST /api/v1/events──► Server.EventController.create()
                                                        │
                                                        ▼
                                                    Server.AuthService.validateApiKey(apiKey)
                                                        │
                                                        ▼
                                                    Server.DataService.cleanse(events)
                                                        │
                                                        ▼
                                                    Server.MySQL.insert(events)
                                                        │
                                                        ▼
                                                    Server.Redis.set(cacheKey, data)
                                                        │
                                                        ▼
                                                    return { success: true, count: n }
```

#### 2.1.4 数据结构

**请求数据：**
```typescript
interface EventReportRequest {
  apiKey: string;
  events: Array<{
    type: 'error' | 'performance' | 'api_request' | 'user_behavior';
    timestamp: number;
    data: Record<string, unknown>;
    projectId?: string;
    pageUrl?: string;
    userAgent?: string;
  }>;
}
```

**响应数据：**
```typescript
interface EventReportResponse {
  success: boolean;
  message: string;
  accepted: number;
  rejected: number;
}
```

---

### 2.2 用户登录与认证流程

#### 2.2.1 流程概述

用户通过Dashboard登录，Server验证用户凭证并返回JWT Token，后续请求携带Token进行身份验证。

#### 2.2.2 交互步骤

| 步骤 | 模块 | 操作 | 数据传递 |
|------|------|------|----------|
| 1 | Dashboard | 用户输入账号密码 | `email: string, password: string` |
| 2 | Dashboard | 调用登录接口 | POST `/api/v1/auth/login` |
| 3 | Server | 验证用户密码 | `hashedPassword: string` |
| 4 | Server | 生成JWT Token | `token: string` |
| 5 | Dashboard | 存储Token到LocalStorage | `token: string` |
| 6 | Dashboard | 后续请求携带Token | `Authorization: Bearer {token}` |
| 7 | Server | 验证Token有效性 | `decodedToken: JwtPayload` |

#### 2.2.3 调用链详情

```
Dashboard.LoginForm.onSubmit()
    │
    ▼
Dashboard.APIService.post('/api/v1/auth/login', credentials)
    │
    ▼
Server.AuthController.login(credentials)
    │
    ▼
Server.AuthService.verifyPassword(email, password)
    │
    ▼
Server.MySQL.query('SELECT * FROM users WHERE email = ?', [email])
    │
    ▼
bcrypt.compare(password, user.password)
    │
    ▼ (验证成功)
jsonwebtoken.sign({ userId, role }, JWT_SECRET)
    │
    ▼
return { token, user: { id, email, role } }
    │
    ▼
Dashboard.AuthContext.setUser(user)
    │
    ▼
localStorage.setItem('token', token)
```

#### 2.2.4 数据结构

**请求数据：**
```typescript
interface LoginRequest {
  email: string;
  password: string;
}
```

**响应数据：**
```typescript
interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    role: 'admin' | 'editor' | 'viewer';
    createdAt: string;
  };
}
```

---

### 2.3 数据查询与可视化流程

#### 2.3.1 流程概述

Dashboard根据用户操作发起数据查询请求，Server从数据库/缓存获取数据并返回，Dashboard进行可视化展示。

#### 2.3.2 交互步骤

| 步骤 | 模块 | 操作 | 数据传递 |
|------|------|------|----------|
| 1 | Dashboard | 用户选择时间范围和筛选条件 | `filters: FilterOptions` |
| 2 | Dashboard | 调用数据查询接口 | GET `/api/v1/events?params` |
| 3 | Server | 查询Redis缓存 | `cacheKey: string` |
| 4 | Server | 缓存命中直接返回 | `cachedData: DataResponse` |
| 5 | Server | 缓存未命中查询MySQL | `query: SQL` |
| 6 | Server | 更新Redis缓存 | `cacheData: DataResponse` |
| 7 | Dashboard | 渲染图表和表格 | `data: DataResponse` |

#### 2.3.3 调用链详情

```
Dashboard.DashboardPage.loadData()
    │
    ▼
Dashboard.APIService.get('/api/v1/metrics/summary', { params: filters })
    │
    ▼
Server.MetricsController.getSummary(filters)
    │
    ▼
Server.Redis.get(`metrics:${cacheKey}`)
    │
    ├── 命中 ──► return cachedData
    │
    └── 未命中 ──► Server.MySQL.query(aggregationQuery)
                        │
                        ▼
                    Server.Redis.set(`metrics:${cacheKey}`, result, EX 300)
                        │
                        ▼
                    return result
    │
    ▼
Dashboard.Recharts.render(data)
```

#### 2.3.4 数据结构

**请求参数：**
```typescript
interface QueryFilters {
  projectId: string;
  startTime: number;
  endTime: number;
  eventType?: string;
  page?: number;
  limit?: number;
}
```

**响应数据：**
```typescript
interface MetricsSummary {
  totalEvents: number;
  errorCount: number;
  avgPerformance: {
    fcp: number;
    lcp: number;
    tti: number;
  };
  apiRequestStats: {
    total: number;
    avgDuration: number;
    errorRate: number;
  };
  trend: Array<{
    timestamp: number;
    count: number;
  }>;
}
```

---

### 2.4 告警触发与通知流程

#### 2.4.1 流程概述

Server定时查询数据并比对告警规则，当触发阈值时生成告警通知并发送给指定接收人。

#### 2.4.2 交互步骤

| 步骤 | 模块 | 操作 | 数据传递 |
|------|------|------|----------|
| 1 | Server | 定时任务触发 | `schedule: cron` |
| 2 | Server | 查询告警规则 | `rules: AlertRule[]` |
| 3 | Server | 查询当前数据 | `currentValue: number` |
| 4 | Server | 比对阈值 | `threshold: number` |
| 5 | Server | 生成告警记录 | `alert: AlertRecord` |
| 6 | Server | 发送通知 | `notification: Notification` |
| 7 | Dashboard | 展示告警列表 | `alerts: AlertRecord[]` |

#### 2.4.3 调用链详情

```
Server.AlertService.schedule() (每5分钟)
    │
    ▼
Server.MySQL.query('SELECT * FROM alerts WHERE enabled = 1')
    │
    ▼
for each rule in rules:
    Server.MetricsService.calculateCurrentValue(rule.metric)
        │
        ▼
    if currentValue > rule.threshold:
        Server.MySQL.insert(alertRecord)
            │
            ▼
        Server.NotificationService.send(rule.recipients, alertRecord)
            │
            ├── 邮件通知
            ├── Webhook通知
            └── 短信通知 (可选)
    │
    ▼
Dashboard.AlertsPage.poll() (每30秒)
    │
    ▼
Server.AlertController.list({ status: 'active' })
    │
    ▼
Dashboard.AlertsPage.render(alerts)
```

#### 2.4.4 数据结构

**告警规则：**
```typescript
interface AlertRule {
  id: string;
  name: string;
  metricType: 'error_rate' | 'performance' | 'api_error';
  threshold: number;
  comparison: 'gt' | 'lt' | 'eq';
  duration: number; // 持续时间(分钟)
  recipients: Array<{
    type: 'email' | 'webhook' | 'sms';
    address: string;
  }>;
  enabled: boolean;
}
```

**告警记录：**
```typescript
interface AlertRecord {
  id: string;
  ruleId: string;
  ruleName: string;
  metricType: string;
  currentValue: number;
  threshold: number;
  status: 'active' | 'resolved';
  createdAt: string;
  resolvedAt?: string;
}
```

---

## 3. 模块间接口调用汇总

### 3.1 SDK → Server

| 接口 | HTTP方法 | 路径 | 描述 |
|------|----------|------|------|
| 事件上报 | POST | `/api/v1/events` | 批量上报事件数据 |

### 3.2 Dashboard → Server

| 接口 | HTTP方法 | 路径 | 描述 |
|------|----------|------|------|
| 用户登录 | POST | `/api/v1/auth/login` | 用户凭证验证 |
| 用户注册 | POST | `/api/v1/auth/register` | 新用户注册 |
| 获取用户信息 | GET | `/api/v1/auth/profile` | 获取当前用户信息 |
| 事件列表 | GET | `/api/v1/events` | 查询事件列表 |
| 错误统计 | GET | `/api/v1/errors/stats` | 获取错误统计数据 |
| 性能指标 | GET | `/api/v1/metrics` | 获取性能指标 |
| 性能汇总 | GET | `/api/v1/metrics/summary` | 获取性能汇总 |
| API请求列表 | GET | `/api/v1/api-requests` | 获取API请求记录 |
| 告警列表 | GET | `/api/v1/alerts` | 获取告警列表 |
| 创建告警规则 | POST | `/api/v1/alerts/rules` | 创建告警规则 |
| 更新告警规则 | PUT | `/api/v1/alerts/rules/:id` | 更新告警规则 |
| 删除告警规则 | DELETE | `/api/v1/alerts/rules/:id` | 删除告警规则 |

---

## 4. 异常处理机制

### 4.1 SDK异常处理

| 异常场景 | 处理方式 | 恢复策略 |
|----------|----------|----------|
| 网络请求失败 | 事件入队，重试机制 | 指数退避重试，最大重试3次 |
| 上报频率超限 | 丢弃旧事件 | 保留最近的事件 |
| API Key无效 | 停止上报并记录日志 | 通知开发者检查配置 |

### 4.2 Server异常处理

| 异常场景 | 处理方式 | 恢复策略 |
|----------|----------|----------|
| 数据库连接失败 | 返回503错误 | 自动重连，触发告警 |
| 数据验证失败 | 返回400错误 | 返回详细错误信息 |
| Token过期 | 返回401错误 | 提示用户重新登录 |
| 权限不足 | 返回403错误 | 拒绝访问并记录 |

### 4.3 Dashboard异常处理

| 异常场景 | 处理方式 | 恢复策略 |
|----------|----------|----------|
| API请求失败 | 显示错误提示 | 提供重试按钮 |
| 数据解析失败 | 显示空状态 | 记录错误日志 |
| 网络超时 | 显示加载失败 | 自动重试一次 |

---

## 5. 数据流转图

### 5.1 完整数据流转

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         数据流转全景图                                    │
├────────────────────────────────────────────────────────────────────────────┤
│                                                                            │
│   ┌──────────────┐     ┌──────────────┐     ┌──────────────┐              │
│   │   用户浏览器  │     │   用户浏览器  │     │   用户浏览器  │              │
│   │   (SDK注入)   │     │   (SDK注入)   │     │   (SDK注入)   │              │
│   └──────┬───────┘     └──────┬───────┘     └──────┬───────┘              │
│          │                    │                    │                       │
│          ▼                    ▼                    ▼                       │
│   ┌──────────────────────────────────────────────────────────┐            │
│   │                      SDK模块                              │            │
│   │  ErrorCapturer  PerformanceCapturer  ApiRequestCapturer   │            │
│   │       │                  │                   │            │            │
│   │       └──────────────────┼───────────────────┘            │            │
│   │                          ▼                               │            │
│   │                   EventSender                            │            │
│   │                     │                                   │            │
│   └─────────────────────┼───────────────────────────────────┘            │
│                         ▼                                                │
│              POST /api/v1/events                                         │
│                         │                                                │
│                         ▼                                                │
│   ┌──────────────────────────────────────────────────────────┐            │
│   │                     Server模块                            │            │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │            │
│   │  │ AuthService  │  │EventService  │  │MetricsService│    │            │
│   │  │ (验证API Key)│  │ (数据清洗)   │  │ (聚合计算)   │    │            │
│   │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │            │
│   │         │                 │                  │             │            │
│   │         └─────────────────┼──────────────────┘             │            │
│   │                           ▼                               │            │
│   │              ┌───────────────────────┐                     │            │
│   │              │     Data Layer        │                     │            │
│   │              │  ┌───────┐  ┌───────┐ │                     │            │
│   │              │  │ MySQL │  │ Redis │ │                     │            │
│   │              │  │(持久化)│  │(缓存) │ │                     │            │
│   │              │  └───────┘  └───────┘ │                     │            │
│   │              └───────────────────────┘                     │            │
│   └─────────────────────┼───────────────────────────────────┘            │
│                         ▼                                                │
│              GET /api/v1/* (查询接口)                                     │
│                         │                                                │
│                         ▼                                                │
│   ┌──────────────────────────────────────────────────────────┐            │
│   │                   Dashboard模块                           │            │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │            │
│   │  │   Charts     │  │    Tables    │  │   Filters    │    │            │
│   │  │ (可视化展示)  │  │ (数据列表)   │  │ (筛选条件)   │    │            │
│   │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘    │            │
│   │         │                 │                  │             │            │
│   │         └─────────────────┼──────────────────┘             │            │
│   │                           ▼                               │            │
│   │                    ┌───────────────┐                        │            │
│   │                    │  AuthContext  │                        │            │
│   │                    │  (状态管理)    │                        │            │
│   │                    └───────────────┘                        │            │
│   └──────────────────────────────────────────────────────────┘            │
│                         │                                                │
│                         ▼                                                │
│                   ┌───────────┐                                          │
│                   │  用户界面  │                                          │
│                   └───────────┘                                          │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. 关键交互时序图

### 6.1 事件上报时序

```
SDK                      Server                    MySQL                   Redis
│                          │                        │                       │
│─── capture(event) ────►  │                        │                       │
│                          │                        │                       │
│─── enqueue(event) ────►  │                        │                       │
│                          │                        │                       │
│─── flush() ──────────►  │                        │                       │
│   POST /api/v1/events   │                        │                       │
│────────────────────────►│                        │                       │
│                          │─── validateApiKey() ──►│                       │
│                          │◄─── valid ────────────│                       │
│                          │                        │                       │
│                          │─── cleanse(events) ───►│                       │
│                          │◄─── cleaned ──────────│                       │
│                          │                        │                       │
│                          │─── INSERT ────────────►│                       │
│                          │◄─── OK ───────────────│                       │
│                          │                        │                       │
│                          │─── SET key value ─────►                       │
│                          │◄─── OK ───────────────────────────────────────│
│                          │                        │                       │
│◄──── 200 OK ─────────────│                        │                       │
│                          │                        │                       │
```

### 6.2 用户登录时序

```
Dashboard                Server                    MySQL                  JWT
│                          │                        │                       │
│─── submit(email,pwd) ──► │                        │                       │
│   POST /api/v1/auth/login│                        │                       │
│────────────────────────►│                        │                       │
│                          │─── SELECT * FROM users │                       │
│                          │     WHERE email = ? ──►│                       │
│                          │◄─── user record ───────│                       │
│                          │                        │                       │
│                          │─── bcrypt.compare() ───│                       │
│                          │◄─── match ─────────────│                       │
│                          │                        │                       │
│                          │─── sign(token) ────────│──────────────────────►│
│                          │◄─── token ─────────────────────────────────────│
│                          │                        │                       │
│◄──── { token, user } ────│                        │                       │
│                          │                        │                       │
│─── localStorage.set() ──►│                        │                       │
│                          │                        │                       │
```

---

## 7. 总结

本系统模块间交互遵循以下原则：

1. **单向数据流**：SDK → Server → Dashboard，数据流向清晰
2. **异步通信**：事件上报采用批量异步方式，减少网络开销
3. **缓存优先**：查询请求优先读取缓存，提升响应速度
4. **松耦合**：模块间通过API接口交互，降低依赖
5. **容错设计**：各模块均有完善的异常处理和恢复机制