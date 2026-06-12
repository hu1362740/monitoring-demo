# 开发环境配置与使用指南

## 1. 环境要求

### 1.1 软件版本要求

| 软件 | 最低版本 | 推荐版本 | 说明 |
|------|----------|----------|------|
| Node.js | 18.0.0 | 20.x LTS | JavaScript运行时 |
| npm | 9.0.0 | 10.x | 包管理工具 |
| MySQL | 8.0 | 8.0+ | 数据库服务 |
| Redis | 7.0 | 7.x | 缓存服务 |
| Git | 2.30.0 | 2.40+ | 版本控制 |

### 1.2 开发工具推荐

| 工具 | 说明 | 推荐配置 |
|------|------|----------|
| VS Code | 代码编辑器 | 安装ESLint、Prettier插件 |
| Docker | 容器化部署 | 用于快速搭建测试环境 |
| Postman | API测试工具 | 测试服务端接口 |

---

## 2. 环境搭建步骤

### 2.1 克隆项目

```bash
# 克隆项目到本地
git clone <repository-url>
cd monitoring-demo
```

### 2.2 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装各子包依赖（如果需要）
npm install --workspace=packages/sdk
npm install --workspace=packages/server
npm install --workspace=packages/dashboard
```

### 2.3 数据库配置

#### 2.3.1 安装 MySQL（Windows）

如果系统中尚未安装 MySQL，请按照以下步骤安装：

1. **下载 MySQL Installer**：
   - 访问 [MySQL 官方下载页面](https://dev.mysql.com/downloads/installer/)
   - 下载 MySQL Installer for Windows（推荐 MySQL 8.0 版本）

2. **安装步骤**：
   - 运行安装程序，选择 "Developer Default" 类型
   - 在安装过程中，设置 root 用户密码（例如：`root123`）
   - 确保勾选 "Add MySQL to PATH" 选项
   - 完成安装后，启动 MySQL 服务

#### 2.3.2 创建数据库和用户

打开命令提示符或 PowerShell，执行以下步骤：

```bash
# 登录 MySQL（使用 root 用户）
mysql -u root -p
# 输入密码：root123

# 创建数据库
CREATE DATABASE monitoring CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 创建用户
CREATE USER 'monitor'@'localhost' IDENTIFIED BY 'monitor123';

# 授予权限
GRANT ALL PRIVILEGES ON monitoring.* TO 'monitor'@'localhost';
FLUSH PRIVILEGES;

# 退出
EXIT;
```

**注意**：如果 `mysql` 命令不可用，请使用完整路径：
```powershell
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

#### 2.3.3 执行初始化脚本

**Windows PowerShell 用户**：
```powershell
# 使用 monitor 用户执行初始化脚本（替换为你的 MySQL 路径）
$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$sqlContent = Get-Content scripts/init.sql -Raw
& $mysqlPath -u monitor -pmonitor123 monitoring -e $sqlContent
```

**说明**：
- `-pmonitor123` 表示密码为 `monitor123`（-p 和密码之间没有空格）
- 如果 MySQL 路径不同，请替换为你的实际路径

#### 2.3.4 Redis 配置

**安装 Redis**：
1. 访问 [Redis 官方下载页面](https://github.com/tporadowski/redis/releases)
2. 下载最新的 Windows 版本
3. 解压到合适的目录（如 `C:\Redis`）
4. 添加到系统 PATH 或使用完整路径启动

**启动 Redis**：
```powershell
# 启动 Redis 服务器
redis-server

# 或使用完整路径
& "C:\Redis\redis-server.exe"
```

#### 2.3.5 使用 Docker Compose（推荐，需先安装 Docker）

如果已安装 Docker，可以使用以下命令一键启动数据库：

```bash
# 启动数据库服务（后台运行）
docker compose up -d mysql redis

# 查看服务状态
docker compose ps
```

**说明**：
- Docker Compose 会自动创建数据库和用户
- 初始化脚本会自动执行

### 2.4 环境变量配置

在 `packages/server` 目录下创建 `.env` 文件：

```env
# 服务器配置
PORT=3000

# JWT配置
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=24h

# MySQL配置
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=monitoring
MYSQL_USER=monitor
MYSQL_PASSWORD=monitor123

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
```

---

## 3. 启动开发服务器

### 3.1 启动服务端

```bash
# 方式一：使用ts-node-dev（支持热重载）
npm run dev --workspace=packages/server

# 方式二：先编译再运行
npm run build --workspace=packages/server
npm run start --workspace=packages/server
```

服务端默认监听 `http://localhost:3000`

### 3.2 启动前端开发服务器

```bash
cd packages/dashboard
npm run dev
```

前端开发服务器默认监听 `http://localhost:5173`

### 3.3 启动SDK开发模式

```bash
cd packages/sdk
npm run build:watch
```

---

## 4. 代码质量保障

### 4.1 ESLint检查

```bash
# 检查所有代码
npm run lint

# 检查特定包
npm run lint --workspace=packages/sdk
npm run lint --workspace=packages/server
```

### 4.2 类型检查

```bash
# 检查TypeScript类型
npx tsc --noEmit
```

### 4.3 单元测试

```bash
# 运行SDK测试
npm test --workspace=packages/sdk

# 运行服务端测试
npm test --workspace=packages/server
```

---

## 5. 开发工作流

### 5.1 分支管理

| 分支 | 用途 |
|------|------|
| main | 主分支，稳定版本 |
| develop | 开发分支，日常开发 |
| feature/* | 功能开发分支 |
| bugfix/* | Bug修复分支 |

### 5.2 代码提交规范

```
<type>(<scope>): <description>

<body>

<footer>
```

**type说明：**
- feat: 新功能
- fix: Bug修复
- docs: 文档更新
- style: 代码格式（不影响功能）
- refactor: 代码重构
- test: 测试用例
- chore: 构建/工具配置

---

## 6. 常见问题解决方案

### 6.1 端口占用

```bash
# 查找占用端口的进程
netstat -ano | findstr :3000

# 杀死进程
taskkill /F /PID <pid>
```

### 6.2 依赖安装失败

```bash
# 清除缓存
npm cache clean --force

# 删除node_modules重新安装
rm -rf node_modules package-lock.json
npm install
```

### 6.3 数据库连接失败

检查事项：
1. MySQL服务是否启动
2. `.env` 文件中的数据库配置是否正确
3. 数据库用户权限是否正确配置

### 6.4 热重载不生效

确保使用 `npm run dev` 命令启动服务，而非 `npm start`。

---

## 7. 开发配置推荐

### 7.1 VS Code配置

创建 `.vscode/settings.json`：

```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### 7.2 调试配置

创建 `.vscode/launch.json`：

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Server Debug",
      "program": "${workspaceFolder}/packages/server/src/index.ts",
      "preLaunchTask": "npm: build",
      "outFiles": ["${workspaceFolder}/packages/server/dist/**/*.js"]
    }
  ]
}
```
