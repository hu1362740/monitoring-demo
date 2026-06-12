# 前端监控系统

一个功能完善、架构合理的前端监控系统，包含SDK模块、服务端模块和客户端展示模块。

## 技术栈

### SDK模块
- TypeScript
- Rollup (打包构建)

### 服务端模块
- Node.js + Express
- MySQL (数据库)
- Redis (缓存)
- JWT (认证)

### 客户端展示模块
- React + TypeScript
- Vite (构建工具)
- Recharts (图表)
- Lucide React (图标)

## 项目结构

```
monitoring-demo/
├── packages/
│   ├── sdk/           # 前端监控SDK
│   │   ├── src/
│   │   │   ├── core/   # 核心模块
│   │   │   ├── api.ts  # 对外API
│   │   │   ├── types.ts # 类型定义
│   │   │   └── index.ts
│   │   ├── tests/      # 单元测试
│   │   └── dist/       # 构建产物
│   ├── server/         # 服务端
│   │   ├── src/
│   │   │   ├── controllers/
│   │   │   ├── routes/
│   │   │   ├── db/
│   │   │   ├── middleware/
│   │   │   ├── app.ts
│   │   │   └── index.ts
│   │   └── dist/
│   └── dashboard/      # 管理后台
│       ├── src/
│       │   ├── pages/
│       │   ├── components/
│       │   ├── context/
│       │   └── main.tsx
│       └── dist/
├── scripts/            # 数据库初始化
├── docker-compose.yml
└── package.json
```

## 功能特性

### SDK模块
- 可配置化的前端监控SDK
- 自动捕获异常及性能数据
- 支持自定义埋点
- 模块化设计，支持按需加载
- 支持多种引入方式（ES Module、CommonJS、UMD）
- 数据采集API：页面性能指标、错误捕获、用户行为、API请求监控

### 服务端模块
- 高性能数据接收接口
- 数据验证、清洗与标准化
- MySQL数据库优化设计
- Redis缓存策略
- 数据聚合分析功能

### 客户端展示模块
- React管理后台，响应式设计
- 数据可视化（趋势图、饼图、列表）
- 数据筛选、搜索与导出
- 告警配置与通知
- 用户权限管理系统

## 快速开始

### 环境要求
- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 7.0

### 使用Docker部署

```bash
# 启动所有服务
docker-compose up -d

# 访问管理后台
# http://localhost:8080

# 测试账号
# 邮箱: admin@example.com
# 密码: password
```

### 本地开发

```bash
# 安装依赖
npm install

# 启动服务端
npm run start:server

# 启动前端开发服务器
npm run start:dashboard

# 构建SDK
npm run build:sdk
```

## API文档

### 事件上报接口

**POST** `/api/v1/events`

```json
{
  "apiKey": "your-api-key",
  "events": [
    {
      "type": "error",
      "timestamp": 1609459200000,
      "data": {
        "message": "Error message",
        "stack": "Error stack"
      }
    }
  ]
}
```

### 认证接口

**POST** `/api/v1/auth/login`

```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

## SDK使用示例

```javascript
// ES Module
import { init, captureException } from '@monitoring/sdk';

const sdk = init({
  apiKey: 'your-api-key',
  endpoint: 'https://api.monitoring.example.com/v1/events',
  captureErrors: true,
  capturePerformance: true,
  captureApiRequests: true
});

// 手动捕获异常
try {
  // 业务代码
} catch (error) {
  captureException(error, { context: 'business logic' });
}

// 自定义埋点
sdk.track('user_login', { method: 'email' });
```

## 测试

```bash
# 运行SDK测试
npm test --workspace=packages/sdk

# 运行服务端测试
npm test --workspace=packages/server
```

## 许可证

MIT License
