# 测试环境配置与使用指南

## 1. 测试环境概述

### 1.1 环境定位

测试环境用于：
- 功能测试验证
- 集成测试验证
- 性能测试验证
- Bug复现与修复验证

### 1.2 环境架构

```
测试环境
├── 前端Dashboard (nginx)
├── 服务端API (Node.js)
├── MySQL数据库 (独立实例)
└── Redis缓存 (独立实例)
```

---

## 2. 测试环境部署

### 2.1 使用Docker部署

```bash
# 进入项目目录
cd monitoring-demo

# 启动测试环境
docker-compose up -d

# 查看服务状态
docker-compose ps
```

### 2.2 手动部署

#### 2.2.1 服务端部署

```bash
# 进入服务端目录
cd packages/server

# 安装依赖
npm install --production

# 设置环境变量
export NODE_ENV=test
export PORT=3000
export MYSQL_HOST=localhost
export MYSQL_DATABASE=monitoring_test
export MYSQL_USER=monitor
export MYSQL_PASSWORD=monitor123
export REDIS_HOST=localhost

# 启动服务
npm run start
```

#### 2.2.2 前端部署

```bash
# 进入前端目录
cd packages/dashboard

# 构建生产版本
npm run build

# 使用nginx部署
# 将dist目录复制到nginx html目录
```

---

## 3. 测试数据准备

### 3.1 初始化测试数据

```bash
# 执行测试数据初始化脚本
mysql -u monitor -p monitoring_test < scripts/test-data.sql
```

### 3.2 测试数据说明

| 表名 | 数据量 | 说明 |
|------|--------|------|
| users | 10条 | 测试用户数据 |
| projects | 5条 | 测试项目数据 |
| events | 1000条 | 测试事件数据 |
| errors | 200条 | 测试错误数据 |

### 3.3 测试账号

| 角色 | 邮箱 | 密码 | 权限 |
|------|------|------|------|
| 管理员 | admin@test.com | password | 全部权限 |
| 编辑员 | editor@test.com | password | 编辑权限 |
| 查看员 | viewer@test.com | password | 只读权限 |

---

## 4. 测试用例执行

### 4.1 单元测试

```bash
# 运行SDK单元测试
npm test --workspace=packages/sdk

# 运行服务端单元测试
npm test --workspace=packages/server

# 生成测试报告
npm test --workspace=packages/sdk -- --coverage
```

### 4.2 API接口测试

使用Postman或curl测试API接口：

#### 4.2.1 登录接口

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'
```

#### 4.2.2 事件上报接口

```bash
curl -X POST http://localhost:3000/api/v1/events \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "test-api-key",
    "events": [
      {
        "type": "error",
        "timestamp": 1609459200000,
        "data": {"message": "Test error"}
      }
    ]
  }'
```

### 4.3 前端功能测试

| 测试模块 | 测试内容 | 验证标准 |
|----------|----------|----------|
| 登录页 | 登录功能、密码显示隐藏 | 成功登录/失败提示 |
| Dashboard | 数据展示、图表渲染 | 数据正常显示 |
| 错误监控 | 搜索、筛选、导出 | 功能正常可用 |
| 性能分析 | 指标展示、趋势图 | 数据准确 |
| 告警管理 | 创建、编辑、删除 | 操作成功 |

---

## 5. 自动化测试

### 5.1 测试脚本

创建测试脚本 `tests/automated-test.sh`：

```bash
#!/bin/bash

echo "=== 运行单元测试 ==="
npm test --workspace=packages/sdk
npm test --workspace=packages/server

echo "=== 运行API测试 ==="
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password"}'

echo "=== 测试完成 ==="
```

### 5.2 CI/CD集成

在 `.github/workflows/test.yml` 中配置：

```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test --workspace=packages/sdk
      - run: npm test --workspace=packages/server
```

---

## 6. 测试报告

### 6.1 生成测试报告

```bash
# 生成JUnit格式报告
npm test --workspace=packages/sdk -- --coverage --reporter=jest-junit

# 生成HTML报告
npm test --workspace=packages/sdk -- --coverage --coverageReporters=html
```

### 6.2 报告查看

```bash
# 打开HTML报告
open packages/sdk/coverage/lcov-report/index.html
```

---

## 7. 测试环境管理

### 7.1 访问地址

| 服务 | 地址 |
|------|------|
| 前端Dashboard | http://localhost:8080 |
| 服务端API | http://localhost:3000 |
| MySQL | localhost:3306 |
| Redis | localhost:6379 |

### 7.2 权限管理

- 测试环境账号由管理员统一管理
- 测试数据定期清理（每周一次）
- 敏感数据使用脱敏处理

### 7.3 数据清理

```bash
# 清理测试数据
mysql -u monitor -p -e "DELETE FROM events WHERE project_id = 'test-project'"
```

---

## 8. 常见问题

### 8.1 测试环境不可访问

检查事项：
1. Docker容器是否运行
2. 端口是否被占用
3. 防火墙是否开放端口

### 8.2 测试数据丢失

确保定期备份测试数据库：

```bash
mysqldump -u monitor -p monitoring_test > backup.sql
```

### 8.3 测试用例失败

检查：
1. 测试环境是否正常运行
2. 测试数据是否存在
3. 接口返回是否符合预期
