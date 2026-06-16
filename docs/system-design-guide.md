# 前端监控系统架构设计指南

## 引言

前端监控系统是现代Web应用的核心基础设施之一，负责采集、存储、分析和展示前端应用的运行数据。一个高质量的前端监控系统需要在架构设计阶段就充分考虑可扩展性、稳定性和易用性。本文将从系统设计的核心问题出发，深入探讨前端监控系统的设计方法论和最佳实践。

---

## 一、三端开发顺序与设计流程

### 1.1 核心原则：数据驱动设计

前端监控系统的本质是**数据处理管道**，其设计应遵循"**数据为先**"的原则。三个核心模块的设计顺序不应是任意的，而应基于数据流转的逻辑来确定。

**数据流转方向**：
```
SDK端（数据采集）→ Server端（数据存储/处理）→ Dashboard端（数据展示）
```

### 1.2 最佳实践：先设计Server端

**推荐顺序**：**Server端 → SDK端 → Dashboard端**

#### 为什么先设计Server端？

| 原因 | 说明 |
|------|------|
| **数据契约中心** | Server端定义了数据接收的格式和存储结构，是SDK和Dashboard的桥梁 |
| **接口稳定性** | 先确定API接口规范，SDK和Dashboard可以并行开发 |
| **业务边界清晰** | Server端定义了系统能处理的数据类型和业务规则 |

#### 设计流程详解

**阶段一：Server端设计（约占总设计时间30%）**

```
1. 确定核心数据模型
       │
       ▼
2. 设计数据库表结构
       │
       ▼
3. 定义API接口规范
       │
       ▼
4. 实现数据存储与处理逻辑
```

**阶段二：SDK端设计（约占总设计时间40%）**

```
1. 分析前端可采集的数据类型
       │
       ▼
2. 根据Server端API规范设计数据上报格式
       │
       ▼
3. 实现各采集器（Error、Performance、API、Behavior）
       │
       ▼
4. 实现事件队列和批量上报机制
```

**阶段三：Dashboard端设计（约占总设计时间30%）**

```
1. 根据Server端API设计数据查询接口
       │
       ▼
2. 确定可视化需求和展示指标
       │
       ▼
3. 设计页面结构和组件
       │
       ▼
4. 实现数据可视化和交互功能
```

### 1.3 各端设计要点

#### SDK端设计要点

| 要点 | 说明 |
|------|------|
| **轻量性** | SDK体积要小，不影响宿主应用性能 |
| **稳定性** | 异常捕获逻辑不能影响宿主应用正常运行 |
| **可配置性** | 支持灵活配置采集项和上报策略 |
| **兼容性** | 支持多种浏览器环境和框架 |

#### Server端设计要点

| 要点 | 说明 |
|------|------|
| **高吞吐** | 支持大量并发请求 |
| **数据安全** | API Key验证、数据加密存储 |
| **数据清洗** | 对上报数据进行标准化处理 |
| **扩展性** | 支持添加新的数据类型 |

#### Dashboard端设计要点

| 要点 | 说明 |
|------|------|
| **实时性** | 支持实时数据展示 |
| **可视化** | 提供丰富的图表和报表 |
| **可交互** | 支持筛选、钻取等操作 |
| **响应式** | 适配多种屏幕尺寸 |

---

## 二、数据库表结构设计方法论

### 2.1 设计原则

#### 原则一：数据驱动设计

**核心思想**：数据库表结构应该根据实际需要存储的数据来设计，而不是凭空想象。

**正确流程**：
```
1. 分析业务需求 → 确定需要采集的数据类型
       │
       ▼
2. 定义数据结构 → 设计数据库表
       │
       ▼
3. 实现SDK → 按照数据表结构上报数据
```

#### 原则二：规范化与反规范化平衡

| 规范化 | 反规范化 |
|--------|----------|
| 减少数据冗余 | 提高查询性能 |
| 数据一致性强 | 查询更简单 |
| 插入/更新效率高 | 适合读多写少场景 |

**监控系统特点**：读多写少，查询复杂 → **适度反规范化**

#### 原则三：扩展性优先

设计时要考虑未来可能新增的数据类型和查询需求，避免频繁修改表结构。

### 2.2 设计流程

**步骤一：需求分析**

明确监控系统需要解决的核心问题：
- 需要采集哪些类型的数据？
- 需要支持哪些查询维度？
- 需要满足哪些业务场景？

**步骤二：数据建模**

将业务需求转化为数据模型：
- 实体识别：用户、项目、事件、告警等
- 关系定义：一对多、多对多关系
- 属性定义：每个实体包含哪些字段

**步骤三：表结构设计**

根据数据模型设计具体的表结构：
- 确定表名和字段名
- 定义字段类型和约束
- 设计索引策略

**步骤四：优化调整**

根据性能需求进行优化：
- 添加必要的索引
- 考虑分表策略
- 设计缓存层

---

## 三、专业前端监控系统数据库表结构设计

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      数据库表结构                              │
├─────────────────────────────────────────────────────────────────┤
│  基础表层                                                        │
│  ┌─────────┐  ┌──────────┐  ┌───────────┐  ┌─────────────┐      │
│  │  users  │  │ projects │  │ environments│ │   teams    │      │
│  └────┬────┘  └────┬─────┘  └─────┬─────┘  └──────┬──────┘      │
│       │            │              │                 │            │
│       └────┬───────┴──────────────┴─────────────────┘            │
│            │                                                     │
│  ┌─────────▼─────────────────────────────────────────────────┐   │
│  │                      事件表层                              │   │
│  │  ┌────────────┐ ┌──────────────┐ ┌──────────────────┐    │   │
│  │  │   events   │ │ error_details│ │ performance_data │    │   │
│  │  └─────┬──────┘ └──────┬───────┘ └─────────┬────────┘    │   │
│  │        │               │                    │               │   │
│  │  ┌─────▼──────┐ ┌──────▼───────┐ ┌─────────▼────────┐    │   │
│  │  │api_requests│ │ user_actions │ │  custom_events   │    │   │
│  │  └────────────┘ └──────────────┘ └──────────────────┘    │   │
│  └───────────────────────────────────────────────────────────┘   │
│            │                                                     │
│  ┌─────────▼─────────────────────────────────────────────────┐   │
│  │                      聚合表层                              │   │
│  │  ┌────────────┐ ┌──────────────┐ ┌──────────────────┐    │   │
│  │  │ error_stats│ │ perf_aggregates││ api_performance │    │   │
│  │  └────────────┘ └──────────────┘ └──────────────────┘    │   │
│  └───────────────────────────────────────────────────────────┘   │
│            │                                                     │
│  ┌─────────▼─────────────────────────────────────────────────┐   │
│  │                      告警表层                              │   │
│  │  ┌────────────┐ ┌──────────────┐ ┌──────────────────┐    │   │
│  │  │  alerts    │ │ alert_rules  │ │ alert_history    │    │   │
│  │  └────────────┘ └──────────────┘ └──────────────────┘    │   │
│  └───────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 基础表设计

#### 3.2.1 users（用户表）

**用途**：存储系统用户信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 用户唯一标识 |
| email | VARCHAR(255) | UNIQUE, NOT NULL | 用户邮箱 |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希值 |
| name | VARCHAR(100) | NOT NULL | 用户姓名 |
| role | ENUM('admin', 'user', 'viewer') | NOT NULL, DEFAULT 'user' | 用户角色 |
| status | ENUM('active', 'inactive') | NOT NULL, DEFAULT 'active' | 用户状态 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引设计**：
- `idx_users_email` (email)
- `idx_users_status` (status)

#### 3.2.2 projects（项目表）

**用途**：存储监控项目信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 项目唯一标识 |
| name | VARCHAR(255) | NOT NULL | 项目名称 |
| api_key | VARCHAR(64) | UNIQUE, NOT NULL | API密钥（用于SDK上报） |
| description | TEXT | NULL | 项目描述 |
| timezone | VARCHAR(50) | NOT NULL, DEFAULT 'UTC' | 时区设置 |
| status | ENUM('active', 'inactive') | NOT NULL, DEFAULT 'active' | 项目状态 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引设计**：
- `idx_projects_api_key` (api_key)
- `idx_projects_status` (status)

#### 3.2.3 environments（环境表）

**用途**：存储项目的不同环境（开发、测试、生产）

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 环境唯一标识 |
| project_id | BIGINT | FOREIGN KEY REFERENCES projects(id), NOT NULL | 所属项目ID |
| name | VARCHAR(50) | NOT NULL | 环境名称（如：production, staging, development） |
| color | VARCHAR(7) | NOT NULL, DEFAULT '#10B981' | 环境标识颜色 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引设计**：
- `idx_environments_project_id` (project_id)

#### 3.2.4 teams（团队表）

**用途**：存储团队信息，支持多租户场景

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 团队唯一标识 |
| name | VARCHAR(255) | NOT NULL | 团队名称 |
| description | TEXT | NULL | 团队描述 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

### 3.3 关联表设计

#### 3.3.1 team_users（团队用户关联表）

**用途**：存储团队与用户的多对多关系

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| team_id | BIGINT | FOREIGN KEY REFERENCES teams(id), PRIMARY KEY | 团队ID |
| user_id | BIGINT | FOREIGN KEY REFERENCES users(id), PRIMARY KEY | 用户ID |
| role | ENUM('owner', 'admin', 'member') | NOT NULL | 用户在团队中的角色 |
| joined_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 加入时间 |

**索引设计**：
- `idx_team_users_user_id` (user_id)

#### 3.3.2 project_users（项目用户关联表）

**用途**：存储项目与用户的多对多关系

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| project_id | BIGINT | FOREIGN KEY REFERENCES projects(id), PRIMARY KEY | 项目ID |
| user_id | BIGINT | FOREIGN KEY REFERENCES users(id), PRIMARY KEY | 用户ID |
| role | ENUM('owner', 'admin', 'viewer') | NOT NULL | 用户在项目中的角色 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |

**索引设计**：
- `idx_project_users_user_id` (user_id)

### 3.4 事件核心表设计

#### 3.4.1 events（事件主表）

**用途**：存储所有类型事件的统一入口，采用宽表设计

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 事件唯一标识 |
| project_id | BIGINT | FOREIGN KEY REFERENCES projects(id), NOT NULL | 所属项目ID |
| environment_id | BIGINT | FOREIGN KEY REFERENCES environments(id), NULL | 环境ID |
| type | ENUM('error', 'performance', 'api_request', 'user_action', 'custom') | NOT NULL | 事件类型 |
| timestamp | DATETIME(6) | NOT NULL | 事件发生时间（精确到微秒） |
| session_id | VARCHAR(64) | NULL | 用户会话ID |
| user_id | VARCHAR(64) | NULL | 用户标识（前端传入） |
| user_agent | TEXT | NULL | 浏览器User-Agent |
| browser | VARCHAR(50) | NULL | 浏览器名称 |
| browser_version | VARCHAR(20) | NULL | 浏览器版本 |
| os | VARCHAR(50) | NULL | 操作系统 |
| device_type | ENUM('desktop', 'mobile', 'tablet') | NULL | 设备类型 |
| url | TEXT | NULL | 发生事件的页面URL |
| referrer | TEXT | NULL | 来源页面URL |
| data | JSON | NOT NULL | 事件详细数据（JSON格式） |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 入库时间 |

**索引设计**：
- `idx_events_project_id` (project_id)
- `idx_events_type` (type)
- `idx_events_timestamp` (timestamp)
- `idx_events_session_id` (session_id)
- `idx_events_project_timestamp` (project_id, timestamp) **【重要】**

**设计说明**：
- **宽表设计**：所有事件类型存储在同一张表中，便于统一查询和管理
- **JSON字段**：`data`字段存储各类型事件的具体数据，保持灵活性
- **索引策略**：`project_id + timestamp`组合索引是查询的核心，大部分查询都会按项目和时间范围进行

#### 3.4.2 error_details（错误详情表）

**用途**：存储错误的详细信息，便于错误聚合和分析

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 错误详情ID |
| event_id | BIGINT | FOREIGN KEY REFERENCES events(id), UNIQUE | 关联事件ID |
| error_type | VARCHAR(255) | NOT NULL | 错误类型（如：Error, TypeError, RangeError） |
| message | TEXT | NOT NULL | 错误消息 |
| stack_trace | TEXT | NULL | 堆栈跟踪信息 |
| filename | VARCHAR(255) | NULL | 出错文件路径 |
| line_number | INT | NULL | 出错行号 |
| column_number | INT | NULL | 出错列号 |
| error_hash | VARCHAR(64) | NOT NULL | 错误唯一哈希（用于去重） |
| is_unhandled | TINYINT(1) | NOT NULL, DEFAULT 0 | 是否为未捕获异常 |

**索引设计**：
- `idx_error_details_error_hash` (error_hash)
- `idx_error_details_event_id` (event_id)

**设计说明**：
- **错误去重**：`error_hash`字段通过对错误消息、堆栈等信息进行哈希计算，实现错误聚合
- **快速定位**：`filename`、`line_number`、`column_number`便于快速定位代码问题

#### 3.4.3 performance_data（性能数据表）

**用途**：存储性能指标数据

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 性能数据ID |
| event_id | BIGINT | FOREIGN KEY REFERENCES events(id), UNIQUE | 关联事件ID |
| metric_type | ENUM('fcp', 'lcp', 'tti', 'tbt', 'cls', 'fid', 'ttfb', 'navigation') | NOT NULL | 指标类型 |
| value | DECIMAL(18,3) | NOT NULL | 指标值（单位：毫秒） |
| url | TEXT | NOT NULL | 页面URL |
| navigation_type | ENUM('navigate', 'reload', 'back_forward', 'prerender') | NULL | 导航类型 |
| server_timing | JSON | NULL | 服务器计时信息 |

**索引设计**：
- `idx_performance_metric_type` (metric_type)
- `idx_performance_event_id` (event_id)

**设计说明**：
- **核心Web指标**：支持FCP（First Contentful Paint）、LCP（Largest Contentful Paint）、TTI（Time to Interactive）、TBT（Total Blocking Time）、CLS（Cumulative Layout Shift）、FID（First Input Delay）、TTFB（Time to First Byte）
- **精确数值**：使用DECIMAL类型存储，避免浮点精度问题

#### 3.4.4 api_requests（API请求表）

**用途**：存储前端发起的API请求信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 请求ID |
| event_id | BIGINT | FOREIGN KEY REFERENCES events(id), UNIQUE | 关联事件ID |
| url | TEXT | NOT NULL | 请求URL |
| method | ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD') | NOT NULL | HTTP方法 |
| status_code | INT | NULL | HTTP状态码 |
| duration | DECIMAL(18,3) | NOT NULL | 请求耗时（毫秒） |
| request_size | BIGINT | NULL | 请求大小（字节） |
| response_size | BIGINT | NULL | 响应大小（字节） |
| is_success | TINYINT(1) | NOT NULL | 是否成功 |
| error_message | TEXT | NULL | 错误消息（如有） |

**索引设计**：
- `idx_api_requests_url` (url(255))
- `idx_api_requests_method` (method)
- `idx_api_requests_status_code` (status_code)

**设计说明**：
- **性能分析**：`duration`、`request_size`、`response_size`用于分析API性能瓶颈
- **错误追踪**：`status_code`、`is_success`、`error_message`便于定位失败请求

#### 3.4.5 user_actions（用户行为表）

**用途**：存储用户交互行为

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 行为ID |
| event_id | BIGINT | FOREIGN KEY REFERENCES events(id), UNIQUE | 关联事件ID |
| action_type | ENUM('click', 'input', 'submit', 'scroll', 'resize', 'focus', 'blur', 'navigate') | NOT NULL | 行为类型 |
| target_selector | VARCHAR(500) | NULL | 目标元素选择器 |
| target_text | VARCHAR(500) | NULL | 目标元素文本 |
| page_url | TEXT | NOT NULL | 当前页面URL |
| timestamp_offset | DECIMAL(18,3) | NOT NULL | 相对于会话开始的时间偏移（毫秒） |

**索引设计**：
- `idx_user_actions_action_type` (action_type)

**设计说明**：
- **用户旅程分析**：通过`timestamp_offset`可以还原用户在页面上的操作顺序
- **热点分析**：`target_selector`和`target_text`便于分析用户最常交互的元素

### 3.5 聚合表设计

#### 3.5.1 error_stats（错误统计表）

**用途**：存储错误聚合统计数据，用于快速查询

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 统计ID |
| project_id | BIGINT | FOREIGN KEY REFERENCES projects(id), NOT NULL | 项目ID |
| environment_id | BIGINT | FOREIGN KEY REFERENCES environments(id), NULL | 环境ID |
| error_hash | VARCHAR(64) | NOT NULL | 错误哈希 |
| error_type | VARCHAR(255) | NOT NULL | 错误类型 |
| message | TEXT | NOT NULL | 错误消息摘要 |
| count | BIGINT | NOT NULL, DEFAULT 0 | 错误发生次数 |
| user_count | BIGINT | NOT NULL, DEFAULT 0 | 受影响用户数 |
| first_occurrence | DATETIME | NOT NULL | 首次出现时间 |
| last_occurrence | DATETIME | NOT NULL | 最后出现时间 |
| period_start | DATETIME | NOT NULL | 统计周期开始时间 |
| period_end | DATETIME | NOT NULL | 统计周期结束时间 |

**索引设计**：
- `idx_error_stats_project_hash` (project_id, error_hash)
- `idx_error_stats_period` (period_start, period_end)

**设计说明**：
- **预聚合**：通过定时任务定期聚合原始错误数据，提高查询性能
- **时间维度**：支持按分钟、小时、天等不同粒度进行聚合

#### 3.5.2 perf_aggregates（性能聚合表）

**用途**：存储性能指标的聚合数据

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 聚合ID |
| project_id | BIGINT | FOREIGN KEY REFERENCES projects(id), NOT NULL | 项目ID |
| environment_id | BIGINT | FOREIGN KEY REFERENCES environments(id), NULL | 环境ID |
| metric_type | ENUM('fcp', 'lcp', 'tti', 'tbt', 'cls', 'fid', 'ttfb') | NOT NULL | 指标类型 |
| url_pattern | VARCHAR(500) | NULL | URL模式（用于分组） |
| p50 | DECIMAL(18,3) | NOT NULL | 中位数 |
| p75 | DECIMAL(18,3) | NOT NULL | 75百分位数 |
| p90 | DECIMAL(18,3) | NOT NULL | 90百分位数 |
| p95 | DECIMAL(18,3) | NOT NULL | 95百分位数 |
| p99 | DECIMAL(18,3) | NOT NULL | 99百分位数 |
| avg | DECIMAL(18,3) | NOT NULL | 平均值 |
| count | BIGINT | NOT NULL | 样本数 |
| period_start | DATETIME | NOT NULL | 统计周期开始时间 |
| period_end | DATETIME | NOT NULL | 统计周期结束时间 |

**索引设计**：
- `idx_perf_aggregates_project_metric` (project_id, metric_type)
- `idx_perf_aggregates_period` (period_start, period_end)

**设计说明**：
- **百分位数**：存储P50/P75/P90/P95/P99等百分位数，全面反映性能分布
- **URL分组**：`url_pattern`支持按URL模式进行分组统计

#### 3.5.3 api_performance（API性能表）

**用途**：存储API请求的聚合性能数据

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 记录ID |
| project_id | BIGINT | FOREIGN KEY REFERENCES projects(id), NOT NULL | 项目ID |
| url_pattern | VARCHAR(500) | NOT NULL | URL模式 |
| method | ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH') | NOT NULL | HTTP方法 |
| avg_duration | DECIMAL(18,3) | NOT NULL | 平均耗时 |
| p95_duration | DECIMAL(18,3) | NOT NULL | 95百分位耗时 |
| error_rate | DECIMAL(5,2) | NOT NULL | 错误率 |
| success_count | BIGINT | NOT NULL | 成功请求数 |
| error_count | BIGINT | NOT NULL | 失败请求数 |
| total_requests | BIGINT | NOT NULL | 总请求数 |
| period_start | DATETIME | NOT NULL | 统计周期开始时间 |
| period_end | DATETIME | NOT NULL | 统计周期结束时间 |

**索引设计**：
- `idx_api_performance_project_url` (project_id, url_pattern)

**设计说明**：
- **API健康度**：`error_rate`字段直接反映API的健康状况
- **性能基线**：`avg_duration`和`p95_duration`用于建立性能基线

### 3.6 告警表设计

#### 3.6.1 alert_rules（告警规则表）

**用途**：存储告警规则配置

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 规则ID |
| project_id | BIGINT | FOREIGN KEY REFERENCES projects(id), NOT NULL | 项目ID |
| name | VARCHAR(255) | NOT NULL | 规则名称 |
| type | ENUM('error_rate', 'error_count', 'performance', 'api_error', 'api_latency') | NOT NULL | 告警类型 |
| condition | JSON | NOT NULL | 触发条件（JSON格式） |
| threshold | DECIMAL(18,3) | NOT NULL | 阈值 |
| comparison | ENUM('gt', 'lt', 'gte', 'lte', 'eq') | NOT NULL | 比较运算符 |
| window_minutes | INT | NOT NULL, DEFAULT 5 | 时间窗口（分钟） |
| notification_channels | JSON | NOT NULL | 通知渠道（email, webhook, slack等） |
| is_enabled | TINYINT(1) | NOT NULL, DEFAULT 1 | 是否启用 |
| created_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 创建时间 |
| updated_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新时间 |

**索引设计**：
- `idx_alert_rules_project_id` (project_id)
- `idx_alert_rules_enabled` (is_enabled)

**设计说明**：
- **灵活配置**：`condition`字段支持复杂的触发条件配置
- **多渠道通知**：`notification_channels`支持多种通知方式

#### 3.6.2 alerts（告警记录表）

**用途**：存储触发的告警记录

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 告警ID |
| rule_id | BIGINT | FOREIGN KEY REFERENCES alert_rules(id), NOT NULL | 关联规则ID |
| project_id | BIGINT | FOREIGN KEY REFERENCES projects(id), NOT NULL | 项目ID |
| severity | ENUM('critical', 'warning', 'info') | NOT NULL | 告警级别 |
| title | VARCHAR(255) | NOT NULL | 告警标题 |
| message | TEXT | NOT NULL | 告警详情 |
| current_value | DECIMAL(18,3) | NULL | 当前值 |
| threshold_value | DECIMAL(18,3) | NULL | 阈值 |
| status | ENUM('firing', 'resolved') | NOT NULL, DEFAULT 'firing' | 告警状态 |
| fired_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 触发时间 |
| resolved_at | DATETIME | NULL | 解决时间 |

**索引设计**：
- `idx_alerts_project_id` (project_id)
- `idx_alerts_status` (status)
- `idx_alerts_fired_at` (fired_at)

#### 3.6.3 alert_history（告警历史表）

**用途**：存储告警的历史状态变更记录

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 历史ID |
| alert_id | BIGINT | FOREIGN KEY REFERENCES alerts(id), NOT NULL | 关联告警ID |
| status | ENUM('firing', 'resolved', 'acknowledged') | NOT NULL | 状态 |
| changed_at | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | 变更时间 |
| changed_by | BIGINT | FOREIGN KEY REFERENCES users(id), NULL | 变更人（如有） |
| comment | TEXT | NULL | 备注 |

### 3.7 会话追踪表设计

#### 3.7.1 sessions（会话表）

**用途**：存储用户会话信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | VARCHAR(64) | PRIMARY KEY | 会话ID |
| project_id | BIGINT | FOREIGN KEY REFERENCES projects(id), NOT NULL | 项目ID |
| environment_id | BIGINT | FOREIGN KEY REFERENCES environments(id), NULL | 环境ID |
| user_id | VARCHAR(64) | NULL | 用户标识 |
| start_time | DATETIME(6) | NOT NULL | 会话开始时间 |
| end_time | DATETIME(6) | NULL | 会话结束时间 |
| duration | BIGINT | NULL | 会话时长（毫秒） |
| page_views | INT | NOT NULL, DEFAULT 0 | 页面浏览次数 |
| user_agent | TEXT | NULL | 用户代理 |
| ip_address | VARCHAR(45) | NULL | IP地址 |
| country | VARCHAR(100) | NULL | 国家 |
| region | VARCHAR(100) | NULL | 地区 |
| city | VARCHAR(100) | NULL | 城市 |

**索引设计**：
- `idx_sessions_project_id` (project_id)
- `idx_sessions_start_time` (start_time)

### 3.8 数据字典表设计

#### 3.8.1 event_tags（事件标签表）

**用途**：存储事件的自定义标签

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| id | BIGINT | PRIMARY KEY, AUTO_INCREMENT | 标签ID |
| event_id | BIGINT | FOREIGN KEY REFERENCES events(id), NOT NULL | 关联事件ID |
| key | VARCHAR(100) | NOT NULL | 标签键 |
| value | VARCHAR(500) | NOT NULL | 标签值 |

**索引设计**：
- `idx_event_tags_event_id` (event_id)
- `idx_event_tags_key_value` (key, value)

---

## 四、数据库设计最佳实践

### 4.1 索引策略

**核心原则**：
1. **为查询条件创建索引**：经常作为WHERE条件的字段需要创建索引
2. **组合索引遵循最左前缀原则**：如`(project_id, timestamp)`
3. **避免过多索引**：索引会降低写入性能
4. **对大表考虑分区**：按时间范围分区可以提高查询效率

**推荐索引清单**：

| 表名 | 索引字段 | 用途 |
|------|----------|------|
| events | project_id, timestamp | 按项目和时间查询 |
| events | type | 按事件类型筛选 |
| events | session_id | 会话追踪 |
| error_details | error_hash | 错误去重和聚合 |
| performance_data | metric_type | 按指标类型查询 |
| api_requests | url(255), method | API请求统计 |
| error_stats | project_id, error_hash | 错误聚合查询 |
| perf_aggregates | project_id, metric_type | 性能聚合查询 |
| alerts | project_id, status | 告警列表查询 |

### 4.2 数据生命周期管理

**策略一：数据分区**

按时间对大表进行分区，如`events`表可以按天或按月分区。

**策略二：数据归档**

将历史数据定期迁移到归档表或数据仓库。

**策略三：TTL（Time To Live）**

为不同类型的数据设置不同的保留期限：

| 数据类型 | 保留期限 | 说明 |
|----------|----------|------|
| 原始事件 | 30-90天 | 用于问题排查 |
| 聚合数据 | 1-3年 | 用于趋势分析 |
| 告警记录 | 6个月-1年 | 用于审计 |
| 用户会话 | 30天 | 用于用户行为分析 |

### 4.3 读写分离

**架构建议**：
- **主库**：负责写入操作（事件上报）
- **从库**：负责读取操作（Dashboard查询、数据分析）
- **Redis缓存**：缓存热点数据（如聚合统计、告警规则）

### 4.4 数据安全

**措施一：数据加密**
- 敏感字段（如用户邮箱、IP地址）加密存储
- API Key使用不可逆哈希存储

**措施二：访问控制**
- 基于角色的访问控制（RBAC）
- 项目级权限隔离

**措施三：数据脱敏**
- 对外展示时脱敏处理敏感信息
- 日志中不记录敏感数据

---

## 五、总结

### 5.1 设计流程回顾

```
1. 需求分析 → 确定监控目标和数据类型
       │
       ▼
2. Server端设计 → 定义API规范和数据模型
       │
       ▼
3. 数据库设计 → 根据数据模型设计表结构
       │
       ▼
4. SDK端设计 → 按照API规范实现数据采集
       │
       ▼
5. Dashboard设计 → 根据API设计数据展示
```

### 5.2 核心设计要点

1. **数据驱动**：所有设计围绕数据流转展开
2. **可扩展性**：预留扩展空间，支持新增数据类型
3. **性能优先**：通过聚合表和索引优化查询性能
4. **安全性**：数据加密、权限控制、数据脱敏

### 5.3 关键表作用汇总

| 表类别 | 核心表 | 作用 |
|--------|--------|------|
| 基础表 | users, projects, environments | 存储系统基础信息 |
| 事件表 | events, error_details, performance_data | 存储原始监控数据 |
| 聚合表 | error_stats, perf_aggregates | 存储预计算的统计数据 |
| 告警表 | alert_rules, alerts | 存储告警规则和告警记录 |
| 会话表 | sessions | 存储用户会话信息 |

通过以上设计，一个专业的前端监控系统能够实现：
- 全面的数据采集
- 高效的数据存储和查询
- 灵活的告警配置
- 直观的数据可视化

这套设计方案既满足当前需求，又为未来扩展预留了空间，是构建高质量前端监控系统的坚实基础。