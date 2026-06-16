# 前端监控系统 - 服务端技术文档

## 目录

1. [项目架构概述](#1-项目架构概述)
   - 1.1 入口文件与启动流程
   - 1.2 系统架构设计
   - 1.3 模块划分与组件交互
   - 1.4 数据流图

2. [SDK上报数据处理流程](#2-sdk上报数据处理流程)
   - 2.1 数据接收端点
   - 2.2 传输协议
   - 2.3 数据验证机制
   - 2.4 存储策略
   - 2.5 后续处理逻辑

3. [核心模块功能说明](#3-核心模块功能说明)
   - 3.1 路由设计
   - 3.2 中间件实现
   - 3.3 数据库交互方式

4. [API接口文档](#4-api接口文档)
   - 4.1 认证接口
   - 4.2 事件接口
   - 4.3 项目接口
   - 4.4 错误码说明

5. [部署与运维指南](#5-部署与运维指南)
   - 5.1 环境配置要求
   - 5.2 启动命令
   - 5.3 日志管理
   - 5.4 常见问题排查

6. [安全策略说明](#6-安全策略说明)
   - 6.1 认证授权机制
   - 6.2 数据加密方式
   - 6.3 防攻击措施

---

## 1. 项目架构概述

### 1.1 入口文件与启动流程

**入口文件路径**：`packages/server/src/index.ts`

**启动流程**：

```
startServer()
    │
    ├─► connectRedis()          // 连接 Redis 缓存
    │       │
    │       └─► 成功: 记录日志
    │       └─► 失败: 仅记录错误，不阻止服务启动
    │
    └─► app.listen(config.port)  // 启动 Express HTTP 服务
            │
            └─► 监听配置端口，服务就绪
```

**关键代码示例**：

```typescript
// packages/server/src/index.ts
async function startServer(): Promise<void> {
  try {
    await connectRedis();
    console.log('Redis connected successfully');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }

  app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
  });
}
```

### 1.2 系统架构设计

**技术栈**：
- **框架**: Express.js 4.x
- **语言**: TypeScript
- **数据库**: MySQL 8.0+
- **缓存**: Redis 6.0+
- **认证**: JWT (jsonwebtoken)
- **密码加密**: bcrypt

**架构风格**：集成式单体应用 (Integrated Monolith)

### 1.3 模块划分与组件交互

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| **路由层** | URL 分发与请求路由 | `routes/*.ts` |
| **控制器层** | 业务逻辑处理 | `controllers/*.ts` |
| **中间件层** | 请求预处理与认证 | `middleware/*.ts` |
| **数据层** | 数据库与缓存操作 | `db/mysql.ts`, `db/redis.ts` |
| **配置层** | 环境变量与配置管理 | `config.ts` |
| **应用层** | Express 应用配置 | `app.ts` |

**组件交互关系**：

```
客户端请求
    │
    ▼
┌─────────────────────────────────────────────┐
│              app.ts (Express 应用)          │
│  ┌───────────────────────────────────────┐  │
│  │          CORS / Body Parser           │  │  ← 全局中间件
│  └───────────────────────────────────────┘  │
│                   │                         │
│                   ▼                         │
│  ┌───────────────────────────────────────┐  │
│  │         路由分发 (routes/*.ts)         │  │
│  └───────────────────────────────────────┘  │
│         │              │                   │
│    认证路由         事件路由         项目路由
│         │              │                   │
│         ▼              ▼                   ▼
│  ┌───────────┐  ┌──────────────┐  ┌──────────────┐
│  │authController││eventController││projectController│
│  └─────┬─────┘  └──────┬───────┘  └──────┬───────┘
│        │               │                  │
│        ▼               ▼                  ▼
│  ┌───────────┐  ┌───────────┐  ┌───────────┐
│  │   mysql   │  │   mysql   │  │   mysql   │
│  │   redis   │  │   redis   │  │   redis   │
│  └───────────┘  └───────────┘  └───────────┘
└─────────────────────────────────────────────┘
```

### 1.4 数据流图

```
┌─────────────────┐     HTTP POST     ┌─────────────────┐
│   SDK 客户端     │ ───────────────► │    /api/v1/events│
└─────────────────┘                    └────────┬────────┘
                                                │
                                                ▼
                                    ┌───────────────────────┐
                                    │   receiveEvents()      │
                                    │   1. 参数校验         │
                                    │   2. API Key 验证     │
                                    └───────────┬───────────┘
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        ▼                       ▼                       ▼
                ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
                │   MySQL       │      │   MySQL       │      │   Redis       │
                │ INSERT events │      │ SELECT project│      │ SET cache     │
                └───────────────┘      └───────────────┘      └───────────────┘
```

---

## 2. SDK上报数据处理流程

### 2.1 数据接收端点

| 端点 | 方法 | 功能 | 认证要求 |
|------|------|------|----------|
| `/api/v1/events` | POST | 批量接收事件数据 | API Key |
| `/api/v1/events` | GET | 查询事件列表 | JWT |

### 2.2 传输协议

- **协议**: HTTP/HTTPS
- **数据格式**: JSON
- **请求体大小限制**: 10MB
- **字符编码**: UTF-8

**请求示例**：

```json
POST /api/v1/events
Content-Type: application/json

{
  "apiKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "events": [
    {
      "type": "error",
      "timestamp": 1700000000000,
      "data": {
        "message": "ReferenceError: xxx is not defined",
        "stack": "...",
        "url": "https://example.com/page"
      }
    }
  ]
}
```

### 2.3 数据验证机制

**验证流程**：

1. **参数存在性检查**
   - `apiKey` 必须存在且非空
   - `events` 必须存在且为数组
   - 数组不能为空

2. **API Key 有效性验证**
   - 查询 `projects` 表验证 apiKey 是否存在
   - 无效 apiKey 返回 401 错误

3. **事件数据结构检查**
   - 每个事件必须包含 `type`、`timestamp`、`data` 字段
   - `timestamp` 必须为有效时间戳

### 2.4 存储策略

**数据库存储**：

| 表名 | 用途 | 存储策略 |
|------|------|----------|
| `projects` | 项目信息 | 单条 INSERT |
| `events` | 事件数据 | 批量 INSERT（Promise.all） |
| `users` | 用户信息 | 单条 INSERT/UPDATE |

**缓存策略**：

| 缓存键 | 过期时间 | 用途 |
|--------|----------|------|
| `events:{projectId}:{type}:{limit}:{offset}` | 5分钟 | 事件列表查询缓存 |
| `errors:stats:{projectId}:{start}:{end}` | 5分钟 | 错误统计缓存 |
| `project:{projectId}:events:count` | 60秒 | 事件计数实时展示 |

### 2.5 后续处理逻辑

**数据写入后的处理**：

```
事件写入完成
    │
    ├─► 更新 Redis 缓存（项目事件计数）
    │       │
    │       └─► KEY: project:{projectId}:events:count
    │       └─► TTL: 60 秒
    │
    └─► 返回响应 { received: N }
```

---

## 3. 核心模块功能说明

### 3.1 路由设计

**路由模块结构**：

| 文件 | 路由前缀 | 功能范围 |
|------|----------|----------|
| `routes/auth.ts` | `/api/v1/auth` | 用户认证相关 |
| `routes/events.ts` | `/api/v1` | 事件上报与查询 |
| `routes/metrics.ts` | `/api/v1` | 性能指标相关 |
| `routes/projects.ts` | `/api/v1/projects` | 项目管理 |

**路由注册流程**（`app.ts`）：

```typescript
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', eventRoutes);
app.use('/api/v1', metricRoutes);
app.use('/api/v1', projectRoutes);
```

### 3.2 中间件实现

**认证中间件**（`middleware/auth.ts`）：

| 中间件 | 功能 | 使用场景 |
|--------|------|----------|
| `authenticate` | JWT 验证，挂载用户信息到 `req.user` | 需要用户认证的接口 |
| `requireRole(role)` | 角色权限校验 | 需要特定角色权限的接口 |

**认证流程**：

```
请求到达
    │
    ▼
检查 Authorization 头
    │
    ├─► 不存在或格式错误 → 401 Unauthorized
    │
    ▼
JWT 验证
    │
    ├─► 签名无效/过期 → 401 Invalid token
    │
    ▼
查询用户信息
    │
    ├─► 用户不存在 → 401 Unauthorized
    │
    ▼
挂载 req.user
    │
    ▼
执行下一个中间件/控制器
```

**全局中间件**（`app.ts`）：

```typescript
app.use(cors());                                    // 跨域支持
app.use(express.json({ limit: '10mb' }));           // JSON 解析，限制 10MB
app.use(express.urlencoded({ extended: true }));    // URL 编码解析
```

### 3.3 数据库交互方式

**MySQL 连接池配置**（`db/mysql.ts`）：

```typescript
export const pool = mysql.createPool({
  host: config.mysql.host,
  port: config.mysql.port,
  database: config.mysql.database,
  user: config.mysql.user,
  password: config.mysql.password,
  waitForConnections: true,    // 连接耗尽时排队等待
  connectionLimit: 10,         // 最大连接数
  queueLimit: 0                // 队列无限制
});
```

**数据库操作封装**：

| 函数 | 用途 | 返回值 |
|------|------|--------|
| `query(sql, params)` | 执行 SELECT 查询 | 结果行数组 |
| `execute(sql, params)` | 执行 INSERT/UPDATE/DELETE | ResultSetHeader |

**关键特点**：
- 自动获取和释放连接，避免连接泄漏
- 使用参数化查询，防止 SQL 注入
- 支持 TypeScript 泛型，类型安全

**Redis 缓存操作**（`db/redis.ts`）：

| 函数 | 用途 |
|------|------|
| `getCache<T>(key)` | 获取缓存，自动 JSON 反序列化 |
| `setCache<T>(key, value, ttl?)` | 设置缓存，支持过期时间 |
| `deleteCache(key)` | 删除缓存 |

---

## 4. API接口文档

### 4.1 认证接口

#### 4.1.1 用户登录

**路径**: `POST /api/v1/auth/login`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 用户邮箱 |
| `password` | string | 是 | 用户密码 |

**成功响应**（200 OK）:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "role": "viewer"
  }
}
```

**失败响应**（401 Unauthorized）:

```json
{ "error": "Invalid email or password" }
```

#### 4.1.2 用户注册

**路径**: `POST /api/v1/auth/register`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 用户名 |
| `email` | string | 是 | 用户邮箱 |
| `password` | string | 是 | 用户密码 |

**成功响应**（201 Created）:

```json
{
  "id": 2,
  "username": "bob",
  "email": "bob@example.com",
  "role": "viewer"
}
```

**失败响应**（409 Conflict）:

```json
{ "error": "User already exists" }
```

#### 4.1.3 获取用户信息

**路径**: `GET /api/v1/auth/profile`

**认证**: 需要 JWT

**成功响应**（200 OK）:

```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "role": "admin"
}
```

### 4.2 事件接口

#### 4.2.1 上报事件

**路径**: `POST /api/v1/events`

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `apiKey` | string | 是 | 项目 API Key |
| `events` | array | 是 | 事件数组 |

**事件对象结构**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 事件类型（error/click/pageview/performance/api_request） |
| `timestamp` | number | 是 | 事件时间戳（毫秒） |
| `data` | object | 是 | 事件数据 |

**成功响应**（200 OK）:

```json
{ "received": 10 }
```

**失败响应**:

```json
// 400 Bad Request
{ "error": "Invalid request" }

// 401 Unauthorized
{ "error": "Invalid API key" }
```

#### 4.2.2 查询事件列表

**路径**: `GET /api/v1/events`

**查询参数**:

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `projectId` | string | 是 | - | 项目 ID |
| `type` | string | 否 | - | 事件类型过滤 |
| `limit` | number | 否 | 100 | 每页数量 |
| `offset` | number | 否 | 0 | 偏移量 |

**成功响应**（200 OK）:

```json
{
  "events": [...],
  "total": 1000
}
```

#### 4.2.3 获取错误统计

**路径**: `GET /api/v1/errors/stats`

**查询参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `projectId` | string | 是 | 项目 ID |
| `startDate` | string | 否 | 开始日期 |
| `endDate` | string | 否 | 结束日期 |

**成功响应**（200 OK）:

```json
[
  { "error_type": "ReferenceError", "count": 100, "total_occurrences": 150 },
  { "error_type": "TypeError", "count": 50, "total_occurrences": 80 }
]
```

### 4.3 项目接口

#### 4.3.1 创建项目

**路径**: `POST /api/v1/projects`

**认证**: 需要 JWT

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 项目名称 |

**成功响应**（201 Created）:

```json
{
  "id": 1,
  "name": "我的电商项目",
  "apiKey": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "createdAt": "2024-01-15 10:30:00"
}
```

#### 4.3.2 获取项目列表

**路径**: `GET /api/v1/projects`

**认证**: 需要 JWT

**成功响应**（200 OK）:

```json
{
  "projects": [
    {
      "id": 1,
      "name": "项目A",
      "api_key": "xxx",
      "created_at": "2024-01-15 10:30:00",
      "updated_at": "2024-01-15 10:30:00"
    }
  ]
}
```

#### 4.3.3 获取项目详情

**路径**: `GET /api/v1/projects/:id`

**认证**: 需要 JWT

**路径参数**:

| 参数 | 类型 | 说明 |
|------|------|------|
| `id` | string | 项目 ID |

**成功响应**（200 OK）:

```json
{
  "id": 1,
  "name": "项目A",
  "api_key": "xxx",
  "created_at": "2024-01-15 10:30:00",
  "updated_at": "2024-01-15 10:30:00"
}
```

**失败响应**（404 Not Found）:

```json
{ "error": "Project not found" }
```

#### 4.3.4 更新项目

**路径**: `PUT /api/v1/projects/:id`

**认证**: 需要 JWT

**请求体**:

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 新项目名称 |

**成功响应**（200 OK）:

```json
{
  "id": "1",
  "name": "新项目名",
  "updatedAt": "2024-01-15 11:00:00"
}
```

#### 4.3.5 删除项目

**路径**: `DELETE /api/v1/projects/:id`

**认证**: 需要 JWT

**成功响应**（200 OK）:

```json
{ "message": "Project deleted successfully" }
```

#### 4.3.6 重新生成 API Key

**路径**: `POST /api/v1/projects/:id/regenerate-api-key`

**认证**: 需要 JWT

**成功响应**（200 OK）:

```json
{ "apiKey": "new-api-key-here" }
```

### 4.4 错误码说明

| HTTP 状态码 | 错误信息 | 说明 |
|-------------|----------|------|
| 400 | `Invalid request` | 请求参数无效或缺失 |
| 401 | `Unauthorized` | 未认证或认证失败 |
| 401 | `Invalid API key` | API Key 无效 |
| 401 | `Invalid token` | JWT 令牌无效或过期 |
| 403 | `Forbidden` | 权限不足 |
| 404 | `Not found` | 资源不存在 |
| 404 | `Project not found` | 项目不存在 |
| 409 | `User already exists` | 用户已存在（注册冲突） |
| 500 | `Internal server error` | 服务器内部错误 |

---

## 5. 部署与运维指南

### 5.1 环境配置要求

**Node.js 版本**: >= 18.0.0

**依赖安装**:

```bash
npm install
```

**环境变量文件**（`.env`）:

```env
# 服务器配置
PORT=3000

# JWT 配置
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# MySQL 配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=monitoring
MYSQL_USER=root
MYSQL_PASSWORD=your-mysql-password

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 5.2 启动命令

**开发模式**（带热重载）:

```bash
npm run dev
```

**生产模式**:

```bash
npm run build
npm start
```

**测试**:

```bash
npm test
```

### 5.3 日志管理

**日志输出方式**:

1. **控制台输出**: 启动后所有日志输出到控制台
2. **错误日志**: 错误信息通过 `console.error` 输出

**日志级别**:

- `console.log`: 一般信息（启动成功、连接成功等）
- `console.error`: 错误信息（连接失败、请求异常等）

**建议**: 生产环境建议配置日志收集工具（如 PM2、ELK 等）

### 5.4 常见问题排查

**问题 1: 数据库连接失败**

```
Error: connect ECONNREFUSED 127.0.0.1:3306
```

**解决方案**:
- 确认 MySQL 服务已启动
- 检查 `.env` 中的数据库配置是否正确
- 确认数据库端口未被占用

**问题 2: Redis 连接失败**

```
Failed to connect to Redis: Error: connect ECONNREFUSED 127.0.0.1:6379
```

**解决方案**:
- 确认 Redis 服务已启动
- 检查 `.env` 中的 Redis 配置是否正确

**问题 3: JWT 认证失败**

```
{ "error": "Invalid token" }
```

**解决方案**:
- 确认 JWT_SECRET 配置正确
- 检查 token 是否过期
- 确认 token 格式正确（Bearer + 空格 + token）

**问题 4: API Key 无效**

```
{ "error": "Invalid API key" }
```

**解决方案**:
- 确认 API Key 正确无误
- 确认项目已创建并存在于数据库中

---

## 6. 安全策略说明

### 6.1 认证授权机制

**JWT 认证流程**:

```
用户登录
    │
    ├─► 验证邮箱密码
    │       │
    │       └─► 成功: 签发 JWT
    │       └─► 失败: 返回 401
    │
    └─► JWT 包含: { userId }
            │
            ▼
后续请求
    │
    ├─► 从 Authorization 头提取 token
    │       │
    │       └─► 验证签名
    │       │       │
    │       │       └─► 有效: 查询用户信息
    │       │       └─► 无效: 返回 401
    │       │
    │       └─► 挂载 req.user
    │
    └─► 执行业务逻辑
```

**角色权限系统**:

| 角色 | 权限说明 |
|------|----------|
| `admin` | 管理员，拥有所有权限 |
| `viewer` | 普通用户，只读权限 |

**权限校验中间件**:

```typescript
export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (req.user.role !== role && req.user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}
```

### 6.2 数据加密方式

**密码加密**（bcrypt）:

```typescript
// 注册时加密密码
const passwordHash = await bcrypt.hash(password, 12);

// 登录时验证密码
const isValid = await bcrypt.compare(password, user.password_hash);
```

**加密强度**:
- Salt rounds: 12（平衡安全性与性能）
- 自动加盐，彩虹表攻击无效

**数据传输**:
- 建议生产环境使用 HTTPS
- API Key 通过请求体传输（非 URL 参数）

### 6.3 防攻击措施

**1. SQL 注入防护**

- 使用参数化查询（`?` 占位符）
- 禁止字符串拼接 SQL

**2. 暴力破解防护**

- 登录失败返回统一错误信息（不区分"用户不存在"和"密码错误"）
- 建议生产环境添加登录失败次数限制

**3. 请求大小限制**

```typescript
app.use(express.json({ limit: '10mb' }));
```

**4. 跨域保护**

```typescript
app.use(cors());
```

**5. JWT 安全**

- 设置合理的过期时间（默认 24 小时）
- 使用安全的密钥（建议 32 位以上随机字符串）
- 不在 JWT 中存储敏感信息

**6. 输入验证**

- 所有接口都进行参数校验
- 使用 `express-validator`（建议扩展）

---

## 附录：数据库表结构

### projects 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | 项目 ID |
| `name` | VARCHAR(100) | NOT NULL | 项目名称 |
| `api_key` | VARCHAR(32) | UNIQUE | API Key |
| `created_at` | DATETIME | NOT NULL | 创建时间 |
| `updated_at` | DATETIME | NOT NULL | 更新时间 |

### events 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | 事件 ID |
| `type` | VARCHAR(50) | NOT NULL | 事件类型 |
| `project_id` | INT | FOREIGN KEY | 项目 ID |
| `timestamp` | DATETIME | NOT NULL | 事件时间 |
| `data` | TEXT | - | 事件数据（JSON） |

### users 表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | INT | PRIMARY KEY, AUTO_INCREMENT | 用户 ID |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | 用户名 |
| `email` | VARCHAR(100) | UNIQUE, NOT NULL | 用户邮箱 |
| `password_hash` | VARCHAR(255) | NOT NULL | 密码哈希 |
| `role` | VARCHAR(20) | DEFAULT 'viewer' | 用户角色 |

---

**文档版本**: v1.0  
**生成日期**: 2024年  
**适用项目**: 前端监控系统服务端