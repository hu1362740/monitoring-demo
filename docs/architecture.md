# 项目模块架构与关联关系文档

## 1. 项目整体架构

### 1.1 架构概述

本项目是一个前端监控系统，采用模块化设计，包含三个核心模块：

| 模块 | 职责 | 技术栈 |
|------|------|--------|
| SDK | 前端数据采集 | TypeScript + Rollup |
| Server | 数据接收与处理 | Node.js + Express |
| Dashboard | 数据可视化展示 | React + TypeScript |

### 1.2 模块架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        前端监控系统架构                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────┐                                │
│   │           SDK 模块 (前端)              │                                │
│   │  ┌─────────┐ ┌───────────┐ ┌────────┐ │                                │
│   │  │Error    │ │Performance│ │API     │ │                                │
│   │  │Capturer │ │Capturer   │ │Request │ │                                │
│   │  │         │ │           │ │Capturer│ │                                │
│   │  └────┬────┘ └─────┬─────┘ └────┬───┘ │                                │
│   └───────│────────────│────────────│─────┘                                │
│           │            │            │                                      │
│           ▼            ▼            ▼                                      │
│   ┌───────────────────────────────────────┐                                │
│   │           网络层 (HTTP/HTTPS)          │                                │
│   │           POST /api/v1/events          │                                │
│   └───────────────────────────────────────┘                                │
│                     │                                                      │
│                     ▼                                                      │
│   ┌───────────────────────────────────────┐                                │
│   │           Server 模块 (后端)            │                                │
│   │  ┌──────────┐ ┌──────────┐ ┌────────┐ │                                │
│   │  │Auth      │ │Event     │ │Metrics │ │                                │
│   │  │Controller│ │Controller│ │Service │ │                                │
│   │  └────┬─────┘ └────┬─────┘ └───┬────┘ │                                │
│   │       │            │          │       │                                │
│   │       ▼            ▼          ▼       │                                │
│   │  ┌────────────────────────────────┐   │                                │
│   │  │           Data Layer           │   │                                │
│   │  │  ┌──────┐      ┌─────────┐    │   │                                │
│   │  │  │MySQL │      │  Redis  │    │   │                                │
│   │  │  │(持久化)│     │ (缓存)   │    │   │                                │
│   │  │  └──────┘      └─────────┘    │   │                                │
│   │  └────────────────────────────────┘   │                                │
│   └───────────────────────────────────────┘                                │
│                     │                                                      │
│                     ▼                                                      │
│   ┌───────────────────────────────────────┐                                │
│   │         Dashboard 模块 (前端)           │                                │
│   │  ┌──────────┐ ┌──────────┐ ┌────────┐ │                                │
│   │  │Layout   │ │Charts    │ │Tables  │ │                                │
│   │  │Component│ │Component │ │Component│ │                                │
│   │  └────┬─────┘ └────┬─────┘ └───┬────┘ │                                │
│   │       │            │          │       │                                │
│   │       └────────────┴──────────┘       │                                │
│   │              │                       │                                │
│   │              ▼                       │                                │
│   │  ┌────────────────────────────────┐   │                                │
│   │  │         Auth Context          │   │                                │
│   │  │         API Service           │   │                                │
│   │  └────────────────────────────────┘   │                                │
│   └───────────────────────────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 模块详细说明

### 2.1 SDK模块

**职责**：前端数据采集与上报

**子模块**：

| 子模块 | 文件路径 | 功能说明 |
|--------|----------|----------|
| ErrorCapturer | `src/core/ErrorCapturer.ts` | 捕获JavaScript错误和Promise rejection |
| PerformanceCapturer | `src/core/PerformanceCapturer.ts` | 采集页面性能指标 |
| ApiRequestCapturer | `src/core/ApiRequestCapturer.ts` | 拦截HTTP请求 |
| UserBehaviorCapturer | `src/core/UserBehaviorCapturer.ts` | 追踪用户行为 |
| EventSender | `src/core/EventSender.ts` | 批量上报事件 |

**数据采集类型**：

| 类型 | 说明 | 采集内容 |
|------|------|----------|
| error | 错误事件 | 错误类型、消息、堆栈、URL |
| performance | 性能事件 | FCP、LCP、TTI、CLS |
| api_request | API请求 | URL、方法、状态码、耗时 |
| user_behavior | 用户行为 | 点击、页面浏览、表单提交 |

### 2.2 Server模块

**职责**：数据接收、处理、存储和查询

**子模块**：

| 子模块 | 文件路径 | 功能说明 |
|--------|----------|----------|
| AuthController | `src/controllers/authController.ts` | 用户认证与授权 |
| EventController | `src/controllers/eventController.ts` | 事件数据处理 |
| PerformanceController | `src/controllers/performanceController.ts` | 性能数据处理 |
| MySQL | `src/db/mysql.ts` | 数据库操作 |
| Redis | `src/db/redis.ts` | 缓存操作 |
| AuthMiddleware | `src/middleware/auth.ts` | JWT认证中间件 |

**数据库表结构**：

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| events | 原始事件存储 | type, project_id, timestamp, data |
| errors | 错误聚合 | error_type, message, count |
| performance_metrics | 性能指标 | metric_type, value, timestamp |
| api_requests | API请求记录 | url, method, status_code, duration |
| users | 用户信息 | username, email, role |
| projects | 项目信息 | name, api_key |
| alerts | 告警规则 | name, type, condition, threshold |

### 2.3 Dashboard模块

**职责**：数据可视化展示

**子页面**：

| 页面 | 文件路径 | 功能说明 |
|------|----------|----------|
| Login | `src/pages/Login.tsx` | 用户登录 |
| Dashboard | `src/pages/Dashboard.tsx` | 监控概览 |
| ErrorMonitoring | `src/pages/ErrorMonitoring.tsx` | 错误监控 |
| Performance | `src/pages/Performance.tsx` | 性能分析 |
| ApiRequests | `src/pages/ApiRequests.tsx` | API请求监控 |
| Alerts | `src/pages/Alerts.tsx` | 告警管理 |
| Settings | `src/pages/Settings.tsx` | 系统设置 |

**共享组件**：

| 组件 | 文件路径 | 功能说明 |
|------|----------|----------|
| Layout | `src/components/Layout.tsx` | 页面布局 |
| StatCard | `src/components/StatCard.tsx` | 统计卡片 |

---

## 3. 模块间接口调用关系

### 3.1 SDK与Server接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/events` | POST | 事件批量上报 |

**请求结构**：
```json
{
  "apiKey": "string",
  "events": [
    {
      "type": "string",
      "timestamp": "number",
      "data": "object"
    }
  ]
}
```

### 3.2 Dashboard与Server接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/auth/login` | POST | 用户登录 |
| `/api/v1/auth/register` | POST | 用户注册 |
| `/api/v1/auth/profile` | GET | 获取用户信息 |
| `/api/v1/events` | GET | 查询事件列表 |
| `/api/v1/errors/stats` | GET | 获取错误统计 |
| `/api/v1/metrics` | GET | 获取性能指标 |
| `/api/v1/metrics/summary` | GET | 获取性能汇总 |

---

## 4. 数据流图

### 4.1 事件上报流程

```
SDK采集事件
    │
    ▼
事件队列 (内存)
    │
    ▼ (批量/定时)
POST /api/v1/events
    │
    ▼
Server验证API Key
    │
    ▼
数据清洗与标准化
    │
    ▼
存储到MySQL (events表)
    │
    ▼
更新Redis缓存
    │
    ▼
Dashboard查询
    │
    ▼
返回数据展示
```

### 4.2 用户登录流程

```
用户输入账号密码
    │
    ▼
POST /api/v1/auth/login
    │
    ▼
验证用户信息
    │
    ▼ (成功)
生成JWT Token
    │
    ▼
返回Token和用户信息
    │
    ▼
前端存储Token到LocalStorage
    │
    ▼
后续请求携带Token
    │
    ▼
Server验证Token
    │
    ▼
返回数据
```

---

## 5. 模块依赖关系

### 5.1 依赖矩阵

| 模块 | SDK | Server | Dashboard |
|------|-----|--------|-----------|
| SDK | - | 依赖 | - |
| Server | 被依赖 | - | 被依赖 |
| Dashboard | - | 依赖 | - |

### 5.2 外部依赖

| 依赖 | 版本 | 用途 |
|------|------|------|
| express | ^4.18.0 | Web框架 |
| mysql2 | ^3.0.0 | MySQL驱动 |
| redis | ^4.6.0 | Redis客户端 |
| jsonwebtoken | ^9.0.0 | JWT认证 |
| bcrypt | ^5.1.0 | 密码加密 |
| react | ^18.2.0 | UI框架 |
| recharts | ^2.5.0 | 图表库 |
| axios | ^1.4.0 | HTTP客户端 |

---

## 6. 核心业务流程示例

### 6.1 错误监控流程

```
1. SDK捕获JavaScript错误
    │
    ▼
2. ErrorCapturer处理错误信息
    │
    ▼
3. EventSender批量上报
    │
    ▼
4. Server验证API Key
    │
    ▼
5. 存储到errors表 (去重聚合)
    │
    ▼
6. Dashboard查询错误统计
    │
    ▼
7. 展示错误列表和趋势图
```

### 6.2 性能监控流程

```
1. SDK采集性能指标
    │
    ▼
2. PerformanceCapturer计算指标
    │
    ▼
3. EventSender上报数据
    │
    ▼
4. Server存储到performance_metrics表
    │
    ▼
5. 定时聚合计算平均值
    │
    ▼
6. Dashboard展示性能趋势
```

### 6.3 告警触发流程

```
1. Server定时查询数据
    │
    ▼
2. 比对告警阈值
    │
    ▼ (超过阈值)
3. 生成告警通知
    │
    ▼
4. 发送通知 (邮件/短信/Webhook)
    │
    ▼
5. 记录告警历史
    │
    ▼
6. Dashboard展示告警列表
```

---

## 7. 技术选型说明

### 7.1 前端技术选型

| 技术 | 选型理由 |
|------|----------|
| React | 组件化开发，生态成熟 |
| TypeScript | 类型安全，提高代码质量 |
| Vite | 快速构建，热更新 |
| Recharts | 强大的图表库，易于使用 |
| Lucide React | 现代化图标库 |

### 7.2 后端技术选型

| 技术 | 选型理由 |
|------|----------|
| Node.js | 高性能，适合高并发 |
| Express | 轻量灵活，社区成熟 |
| MySQL | 稳定可靠，适合结构化数据 |
| Redis | 高性能缓存，减轻数据库压力 |
| JWT | 无状态认证，易于扩展 |

### 7.3 架构设计原则

1. **模块化设计**：各模块职责清晰，解耦性强
2. **可扩展性**：支持水平扩展，易于添加新功能
3. **高可用性**：数据库主从复制，负载均衡
4. **安全性**：数据加密传输，权限控制
5. **可观测性**：完善的日志和监控体系
