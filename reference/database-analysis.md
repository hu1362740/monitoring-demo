# 前端监控系统数据库设计分析文档

## 目录

1. [数据库表结构设计](#1-数据库表结构设计)
   - 1.1 设计理念与架构
   - 1.2 表结构详细说明
   - 1.3 表关系图
   - 1.4 字段设计解析

2. [数据库设计评估](#2-数据库设计评估)
   - 2.1 设计优点
   - 2.2 存在不足
   - 2.3 优化建议

3. [SDK数据上报流程分析](#3-sdk数据上报流程分析)
   - 3.1 数据流转总览
   - 3.2 API接口详解
   - 3.3 数据存储映射关系

---

## 1. 数据库表结构设计

### 1.1 设计理念与架构

本项目采用**分层存储架构**，将数据分为三大层次：

| 层次 | 功能定位 | 存储内容 | 表名 |
|------|----------|----------|------|
| **基础层** | 用户与项目管理 | 用户信息、项目配置、权限关联 | `users`, `projects`, `user_projects` |
| **事件层** | 原始数据存储 | 原始事件、错误详情、性能指标、API请求 | `events`, `errors`, `performance_metrics`, `api_requests` |
| **告警层** | 告警规则与通知 | 告警配置、告警记录 | `alerts`, `alert_notifications` |

**设计原则**：
- **事件归一化**：所有原始事件统一存储在 `events` 表，便于统一查询和管理
- **专用表优化**：针对错误、性能、API请求分别设计专用表，优化特定查询场景
- **非关系型字段**：使用 `JSON` 类型存储动态数据，保持灵活性
- **索引优化**：针对高频查询字段建立索引

### 1.2 表结构详细说明

#### 1.2.1 基础表

**users（用户表）**

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 用户唯一标识 |
| username | VARCHAR(100) | NOT NULL, UNIQUE | 用户名 |
| email | VARCHAR(255) | NOT NULL, UNIQUE | 用户邮箱（登录凭证） |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希值（bcrypt） |
| role | ENUM | NOT NULL, DEFAULT 'viewer' | 用户角色：admin/editor/viewer |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**projects（项目表）**

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | VARCHAR(64) | PRIMARY KEY | 项目唯一标识（UUID） |
| name | VARCHAR(100) | NOT NULL | 项目名称 |
| api_key | VARCHAR(128) | NOT NULL, UNIQUE | SDK上报认证密钥 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**user_projects（用户项目关联表）**

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| user_id | BIGINT UNSIGNED | PRIMARY KEY, FOREIGN KEY | 用户ID |
| project_id | VARCHAR(64) | PRIMARY KEY, FOREIGN KEY | 项目ID |
| role | ENUM | NOT NULL, DEFAULT 'viewer' | 用户在项目中的角色 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 1.2.2 事件表

**events（事件主表）**

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 事件唯一标识 |
| type | VARCHAR(50) | NOT NULL | 事件类型：error/click/pageview等 |
| project_id | VARCHAR(64) | NOT NULL | 所属项目ID |
| timestamp | DATETIME | NOT NULL | 事件发生时间 |
| data | JSON | NOT NULL | 事件详细数据（JSON格式） |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 入库时间 |

**errors（错误表）**

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 错误记录ID |
| project_id | VARCHAR(64) | NOT NULL | 所属项目ID |
| error_type | VARCHAR(100) | NOT NULL | 错误类型（如TypeError） |
| message | TEXT | NOT NULL | 错误消息 |
| stack | TEXT | NULL | 堆栈跟踪信息 |
| url | VARCHAR(1024) | NULL | 出错页面URL |
| user_agent | VARCHAR(512) | NULL | 用户代理信息 |
| timestamp | DATETIME | NOT NULL | 错误发生时间 |
| count | INT UNSIGNED | NOT NULL, DEFAULT 1 | 错误重复计数 |
| last_occurrence | DATETIME | NOT NULL | 最后出现时间 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**performance_metrics（性能指标表）**

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 指标记录ID |
| project_id | VARCHAR(64) | NOT NULL | 所属项目ID |
| metric_type | VARCHAR(50) | NOT NULL | 指标类型：fcp/lcp/tti/tbt/cls等 |
| value | DECIMAL(20,6) | NOT NULL | 指标数值（毫秒） |
| timestamp | DATETIME | NOT NULL | 采集时间 |
| data | JSON | NULL | 附加信息 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**api_requests（API请求表）**

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 请求记录ID |
| project_id | VARCHAR(64) | NOT NULL | 所属项目ID |
| url | VARCHAR(1024) | NOT NULL | 请求URL |
| method | VARCHAR(10) | NOT NULL | HTTP方法 |
| status_code | INT | NOT NULL | 状态码 |
| duration | DECIMAL(20,6) | NOT NULL | 请求耗时（毫秒） |
| success | TINYINT(1) | NOT NULL, DEFAULT 1 | 是否成功 |
| timestamp | DATETIME | NOT NULL | 请求时间 |
| data | JSON | NULL | 附加信息 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |

#### 1.2.3 告警表

**alerts（告警规则表）**

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 规则ID |
| project_id | VARCHAR(64) | NOT NULL | 所属项目ID |
| name | VARCHAR(100) | NOT NULL | 规则名称 |
| type | ENUM | NOT NULL | 告警类型：error/performance/api |
| condition | JSON | NOT NULL | 触发条件（JSON） |
| threshold | DECIMAL(20,6) | NOT NULL | 阈值 |
| enabled | TINYINT(1) | NOT NULL, DEFAULT 1 | 是否启用 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**alert_notifications（告警通知表）**

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT UNSIGNED | PRIMARY KEY, AUTO_INCREMENT | 通知记录ID |
| alert_id | BIGINT UNSIGNED | NOT NULL, FOREIGN KEY | 关联告警规则ID |
| status | ENUM | NOT NULL, DEFAULT 'pending' | 状态：pending/sent/failed |
| message | TEXT | NULL | 通知内容 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |

### 1.3 表关系图

```
                              ┌─────────────┐
                              │    users    │
                              └──────┬──────┘
                                     │ 1:N
                                     ▼
                    ┌───────────────────────────────┐
                    │        user_projects          │
                    │  (用户-项目多对多关联)         │
                    └───────────────┬───────────────┘
                                   │ N:1
                                   ▼
                              ┌─────────────┐
                              │  projects   │
                              └──────┬──────┘
                                     │ 1:N
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
    ┌──────────┐            ┌───────────────┐         ┌──────────────┐
    │  events  │            │ errors        │         │ alerts       │
    │  (原始事件)│            │ (错误聚合)     │         │ (告警规则)    │
    └──────────┘            └───────┬───────┘         └──────┬───────┘
                                     │                       │
                                     ▼                       ▼
                           ┌───────────────┐         ┌───────────────┐
                           │api_requests   │         │alert_notifica-│
                           │ (API请求记录)   │         │   tions       │
                           └───────────────┘         └───────────────┘
                                     │
                                     ▼
                           ┌───────────────┐
                           │performance_   │
                           │   metrics     │
                           │ (性能指标)     │
                           └───────────────┘
```

### 1.4 字段设计解析

#### 1.4.1 主键设计

| 表名 | 主键类型 | 设计原因 |
|------|----------|----------|
| users | BIGINT AUTO_INCREMENT | 自增ID，简单高效 |
| projects | VARCHAR(64) | UUID格式，分布式环境友好 |
| user_projects | (user_id, project_id) | 复合主键，确保唯一关联 |
| events | BIGINT AUTO_INCREMENT | 高写入场景，自增效率高 |

#### 1.4.2 JSON字段使用

项目中多处使用 `JSON` 类型存储动态数据：

| 表名 | JSON字段 | 用途 |
|------|----------|------|
| events | data | 存储各类事件的自定义数据 |
| errors | 无 | 错误数据已结构化存储 |
| performance_metrics | data | 存储指标的附加信息 |
| api_requests | data | 存储请求头、响应头信息 |
| alerts | condition | 存储灵活的告警条件配置 |

#### 1.4.3 索引设计

| 表名 | 索引字段 | 用途 |
|------|----------|------|
| events | type, project_id, timestamp | 支持按类型、项目、时间查询 |
| errors | project_id, error_type, timestamp | 支持错误聚合统计 |
| performance_metrics | project_id, metric_type, timestamp | 支持性能指标趋势查询 |
| api_requests | project_id, url(255), timestamp | 支持API请求分析 |
| projects | api_key | 快速验证SDK上报权限 |
| users | email | 快速登录验证 |

---

## 2. 数据库设计评估

### 2.1 设计优点

#### 2.1.1 架构清晰
- 采用分层设计，职责明确
- 事件主表与专用表配合，兼顾通用性和针对性

#### 2.1.2 灵活性高
- 使用JSON字段存储动态数据，无需频繁变更表结构
- 事件类型通过type字段区分，易于扩展新事件类型

#### 2.1.3 查询优化
- 针对高频查询场景设计专用表（errors, performance_metrics, api_requests）
- 建立了必要的索引，提升查询效率

#### 2.1.4 安全性考虑
- 密码存储使用bcrypt哈希
- API Key用于SDK认证，隔离不同项目数据

#### 2.1.5 错误聚合机制
- errors表使用count字段实现错误去重聚合
- last_occurrence字段便于追踪最新错误

### 2.2 存在不足

#### 2.2.1 数据冗余问题
- events表存储所有原始事件，同时errors/performance_metrics/api_requests也存储同类数据
- 可能导致数据重复存储，增加存储成本

#### 2.2.2 缺少环境维度
- 当前设计未区分开发/测试/生产环境
- 无法按环境维度进行数据筛选和对比

#### 2.2.3 会话追踪缺失
- 缺少用户会话（Session）表
- 难以追踪单个用户的完整行为链路

#### 2.2.4 索引覆盖不足
- events表缺少`(project_id, timestamp, type)`复合索引
- 复杂查询可能触发全表扫描

#### 2.2.5 时间精度限制
- 使用DATETIME类型（秒级精度）
- 无法精确记录毫秒级事件顺序

#### 2.2.6 缺少数据生命周期管理
- 未设计数据归档策略
- 随着数据增长，查询性能会下降

### 2.3 优化建议

#### 2.3.1 引入环境表

```sql
CREATE TABLE environments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  project_id VARCHAR(64) NOT NULL,
  name VARCHAR(50) NOT NULL, -- production/staging/development
  color VARCHAR(7) DEFAULT '#10B981',
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

#### 2.3.2 增加会话追踪表

```sql
CREATE TABLE sessions (
  id VARCHAR(64) PRIMARY KEY,
  project_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NULL,
  start_time DATETIME(6) NOT NULL,
  end_time DATETIME(6) NULL,
  user_agent TEXT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

#### 2.3.3 优化索引策略

```sql
-- events表增加复合索引
ALTER TABLE events ADD INDEX idx_project_type_timestamp (project_id, type, timestamp);

-- 考虑按时间分区（适用于大数据量场景）
ALTER TABLE events PARTITION BY RANGE (TO_DAYS(timestamp)) (
  PARTITION p202401 VALUES LESS THAN (TO_DAYS('2024-02-01')),
  PARTITION p202402 VALUES LESS THAN (TO_DAYS('2024-03-01'))
);
```

#### 2.3.4 提升时间精度

```sql
-- 将timestamp字段改为DATETIME(6)支持微秒级精度
ALTER TABLE events MODIFY COLUMN timestamp DATETIME(6) NOT NULL;
ALTER TABLE errors MODIFY COLUMN timestamp DATETIME(6) NOT NULL;
ALTER TABLE performance_metrics MODIFY COLUMN timestamp DATETIME(6) NOT NULL;
ALTER TABLE api_requests MODIFY COLUMN timestamp DATETIME(6) NOT NULL;
```

---

## 3. SDK数据上报流程分析

### 3.1 数据流转总览

```
SDK采集数据
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
数据分发处理
    │
    ├──► events表 (原始事件)
    │
    ├──► errors表 (错误数据)
    │
    ├──► performance_metrics表 (性能指标)
    │
    └──► api_requests表 (API请求)
```

### 3.2 API接口详解

#### 3.2.1 事件上报接口

**接口地址**：`POST /api/v1/events`

**请求结构**：
```json
{
  "apiKey": "demo-api-key-12345",
  "events": [
    {
      "type": "error",
      "timestamp": 1700000000000,
      "data": {
        "message": "ReferenceError: x is not defined",
        "stack": "Error at ..."
      }
    }
  ]
}
```

**处理流程**：
1. 验证 `apiKey` 是否有效
2. 通过 `apiKey` 获取 `project_id`
3. 批量写入 `events` 表
4. 根据事件类型分发到对应专用表

#### 3.2.2 性能指标上报接口

**接口地址**：`POST /api/v1/metrics`

**请求结构**：
```json
{
  "projectId": "project-1",
  "metricType": "fcp",
  "value": 1200.500,
  "data": {
    "url": "https://example.com/"
  }
}
```

**处理流程**：
1. 验证必填参数（projectId, metricType, value）
2. 写入 `performance_metrics` 表
3. 更新Redis缓存

#### 3.2.3 查询接口

| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/v1/events` | GET | 查询事件列表 |
| `/api/v1/errors/stats` | GET | 获取错误统计 |
| `/api/v1/metrics` | GET | 查询性能指标 |
| `/api/v1/metrics/summary` | GET | 获取性能汇总 |

### 3.3 数据存储映射关系

#### 3.3.1 SDK事件类型与数据表映射

| SDK事件类型 | 存储表 | 说明 |
|-------------|--------|------|
| error | events + errors | 原始事件存储到events，聚合后存储到errors |
| performance | events + performance_metrics | 原始事件存储到events，解析后存储到performance_metrics |
| api_request | events + api_requests | 原始事件存储到events，解析后存储到api_requests |
| custom | events | 仅存储到events表 |
| click/pageview | events | 仅存储到events表 |

#### 3.3.2 SDK采集器与数据流向

```
ErrorCapturer
    │
    ├──► type: 'error'
    │
    └──► events表 + errors表

PerformanceCapturer
    │
    ├──► type: 'performance'
    │
    └──► events表 + performance_metrics表

ApiRequestCapturer
    │
    ├──► type: 'api_request'
    │
    └──► events表 + api_requests表

UserBehaviorCapturer
    │
    ├──► type: 'click' / 'pageview'
    │
    └──► events表
```

#### 3.3.3 数据写入流程代码分析

**事件写入**（eventController.ts）：

```typescript
// 批量写入events表
const promises = events.map((event: EventData) => {
  const timestamp = new Date(event.timestamp)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  return execute(
    'INSERT INTO events (type, project_id, timestamp, data) VALUES (?, ?, ?, ?)',
    [event.type, projectId, timestamp, JSON.stringify(event.data)]
  );
});
await Promise.all(promises);
```

**性能指标写入**（performanceController.ts）：

```typescript
await execute(
  'INSERT INTO performance_metrics (project_id, metric_type, value, timestamp, data) VALUES (?, ?, ?, ?, ?)',
  [projectId, metricType, value, timestamp, data ? JSON.stringify(data) : null]
);
```

---

## 附录：默认数据

### 初始化用户

| 字段 | 值 |
|------|------|
| username | admin |
| email | admin@example.com |
| password | admin（哈希后存储） |
| role | admin |

### 初始化项目

| 字段 | 值 |
|------|------|
| id | project-1 |
| name | Demo Project |
| api_key | demo-api-key-12345 |

---

## 总结

本项目数据库设计遵循了监控系统的基本需求，架构清晰、灵活性较高，但在数据冗余、环境隔离、会话追踪等方面存在改进空间。SDK数据上报通过统一的事件接口进入系统，经过API Key验证后分发到各专用表存储。建议在后续迭代中增加环境维度、会话追踪功能，并优化索引策略以应对大规模数据场景。