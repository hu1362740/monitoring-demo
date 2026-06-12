# 正式环境部署与使用指南

## 1. 部署架构说明

### 1.1 整体架构

```
┌─────────────────────────────────────────────────────────────────┐
│                      外部访问层                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Nginx     │    │   Nginx     │    │   Nginx     │          │
│  │   (负载均衡) │    │   (前端)    │    │   (API)     │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
└─────────│──────────────────│──────────────────│─────────────────┘
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      应用服务层                                │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Node.js Cluster (多进程)                    │    │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │    │
│  │  │ Worker1 │ │ Worker2 │ │ Worker3 │ │ Worker4 │       │    │
│  │  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘       │    │
│  └───────│──────────│──────────│──────────│───────────────┘    │
└──────────│───────────│──────────│──────────│──────────────────┘
           │           │          │          │
           ▼           ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      数据存储层                                │
│  ┌─────────────────────────┐    ┌─────────────────────────┐    │
│  │      MySQL主从集群       │    │         Redis集群        │    │
│  │  ┌──────┐    ┌──────┐   │    │  ┌──────┐    ┌──────┐   │    │
│  │  │ Master│───>│ Slave│   │    │  │ Master│───>│ Slave│   │    │
│  │  └──────┘    └──────┘   │    │  └──────┘    └──────┘   │    │
│  └─────────────────────────┘    └─────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 服务器配置要求

| 服务器类型 | CPU | 内存 | 磁盘 | 数量 |
|------------|-----|------|------|------|
| 前端服务器 | 2核 | 4GB | 50GB SSD | 2台 |
| API服务器 | 4核 | 8GB | 100GB SSD | 2台 |
| 数据库服务器 | 8核 | 16GB | 500GB SSD | 2台(主从) |
| Redis服务器 | 4核 | 8GB | 100GB SSD | 2台(主从) |

---

## 2. 部署流程

### 2.1 代码部署

```bash
# 克隆代码到生产服务器
git clone <repository-url>
cd monitoring-demo

# 切换到生产分支
git checkout main

# 安装依赖
npm install --production

# 构建前端
npm run build:dashboard

# 构建服务端
npm run build --workspace=packages/server

# 构建SDK
npm run build:sdk
```

### 2.2 Docker容器化部署

```bash
# 构建Docker镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

### 2.3 Nginx配置

创建 `/etc/nginx/conf.d/monitoring.conf`：

```nginx
upstream api_servers {
    server api-server-1:3000;
    server api-server-2:3000;
    ip_hash;
}

server {
    listen 80;
    server_name monitoring.example.com;

    # HTTPS重定向
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name monitoring.example.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # 前端静态文件
    location / {
        root /var/www/monitoring-demo/dist;
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api/ {
        proxy_pass http://api_servers/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 10s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 安全头部
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-XSS-Protection "1; mode=block";
    add_header X-Content-Type-Options "nosniff";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Gzip压缩
    gzip on;
    gzip_types text/html text/plain text/css application/javascript application/json;
}
```

---

## 3. 环境变量配置

### 3.1 服务端环境变量

创建 `/etc/environment` 或 `.env.production`：

```env
# 服务器配置
PORT=3000
NODE_ENV=production

# JWT配置
JWT_SECRET=your-strong-secret-key-here
JWT_EXPIRES_IN=24h

# MySQL配置（主库）
MYSQL_HOST=mysql-master.example.com
MYSQL_PORT=3306
MYSQL_DATABASE=monitoring
MYSQL_USER=monitor_prod
MYSQL_PASSWORD=strong-password-here

# Redis配置
REDIS_HOST=redis-master.example.com
REDIS_PORT=6379
REDIS_PASSWORD=redis-password-here

# 日志配置
LOG_LEVEL=info
LOG_FILE=/var/log/monitoring/server.log

# 监控配置
METRICS_ENABLED=true
METRICS_PORT=9090
```

### 3.2 配置规范

| 配置项 | 说明 | 安全级别 |
|--------|------|----------|
| JWT_SECRET | JWT密钥 | 高敏感 |
| MYSQL_PASSWORD | 数据库密码 | 高敏感 |
| REDIS_PASSWORD | Redis密码 | 高敏感 |
| LOG_FILE | 日志路径 | 一般 |
| NODE_ENV | 运行环境 | 一般 |

---

## 4. 监控与告警

### 4.1 系统监控

使用Prometheus + Grafana进行监控：

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'monitoring-server'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9090']
```

### 4.2 日志收集

配置ELK栈进行日志收集：

```bash
# Filebeat配置
filebeat.inputs:
  - type: log
    paths:
      - /var/log/monitoring/*.log

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
```

### 4.3 告警配置

配置告警规则 `alerting-rules.yml`：

```yaml
groups:
  - name: monitoring-alerts
    rules:
      - alert: HighErrorRate
        expr: sum(rate(http_errors_total[5m])) > 100
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "高错误率告警"
          description: "最近5分钟错误数超过100"
```

---

## 5. 日志管理

### 5.1 日志格式

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "service": "monitoring-server",
  "requestId": "abc-123",
  "message": "Event received",
  "data": {
    "projectId": "project-1",
    "eventCount": 10
  }
}
```

### 5.2 日志轮换

配置logrotate `/etc/logrotate.d/monitoring`：

```
/var/log/monitoring/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0640 www-data www-data
    postrotate
        systemctl reload nginx > /dev/null 2>/dev/null || true
    endscript
}
```

---

## 6. 备份与恢复

### 6.1 数据库备份

```bash
# 每日备份脚本
#!/bin/bash
BACKUP_DIR="/backup/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u monitor_prod -p monitoring > ${BACKUP_DIR}/backup_${DATE}.sql
gzip ${BACKUP_DIR}/backup_${DATE}.sql

# 保留最近30天备份
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete
```

### 6.2 Redis备份

```bash
# Redis持久化备份
redis-cli BGSAVE
cp /var/lib/redis/dump.rdb /backup/redis/dump_${DATE}.rdb
```

### 6.3 数据恢复

```bash
# 恢复MySQL
gunzip backup_${DATE}.sql.gz
mysql -u monitor_prod -p monitoring < backup_${DATE}.sql

# 恢复Redis
cp /backup/redis/dump_${DATE}.rdb /var/lib/redis/dump.rdb
systemctl restart redis
```

---

## 7. 版本更新与回滚

### 7.1 更新流程

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
npm install --production

# 3. 构建
npm run build:dashboard
npm run build --workspace=packages/server

# 4. 停止旧服务
pm2 stop monitoring-server

# 5. 启动新服务
pm2 start monitoring-server

# 6. 验证
curl -I http://localhost:3000/health
```

### 7.2 回滚流程

```bash
# 1. 回滚代码
git revert HEAD

# 2. 重新构建
npm run build:dashboard
npm run build --workspace=packages/server

# 3. 重启服务
pm2 restart monitoring-server

# 4. 验证
curl -I http://localhost:3000/health
```

### 7.3 使用PM2管理进程

```bash
# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs

# 重启应用
pm2 reload all
```

---

## 8. 安全配置

### 8.1 防火墙配置

```bash
# 开放必要端口
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3000/tcp
ufw allow from 10.0.0.0/8 to any port 3306
ufw allow from 10.0.0.0/8 to any port 6379
ufw enable
```

### 8.2 SSL证书配置

使用Let's Encrypt配置SSL：

```bash
# 安装certbot
apt-get install certbot python3-certbot-nginx

# 获取证书
certbot --nginx -d monitoring.example.com

# 自动续期
certbot renew --dry-run
```

---

## 9. 系统维护

### 9.1 定期维护任务

| 任务 | 频率 | 说明 |
|------|------|------|
| 数据库备份 | 每日 | 自动备份到远程存储 |
| 日志清理 | 每日 | 清理30天前的日志 |
| 系统更新 | 每周 | 操作系统安全更新 |
| 性能检查 | 每周 | 检查服务器性能指标 |

### 9.2 紧急处理流程

1. **服务宕机**：立即启动备用服务器
2. **数据库故障**：切换到从库，修复主库
3. **网络攻击**：启用WAF规则，封禁IP
4. **数据泄露**：立即隔离系统，通知安全团队

---

## 10. 使用说明

### 10.1 登录系统

访问地址：`https://monitoring.example.com`

### 10.2 系统功能

| 功能模块 | 说明 |
|----------|------|
| Dashboard | 实时监控概览 |
| 错误监控 | 追踪和分析前端错误 |
| 性能分析 | 分析和优化前端性能 |
| API请求 | 监控API请求性能 |
| 告警管理 | 配置告警规则 |
| 系统设置 | 管理系统配置 |

### 10.3 用户支持

- 技术支持邮箱：support@example.com
- 服务时间：7x24小时
