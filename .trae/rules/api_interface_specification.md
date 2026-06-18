## API 接口统一规范

### 接口命名
- 采用 RESTful 风格，资源名词复数形式，禁止动词
- 正确：`POST /api/events` `GET /api/metrics`
- 错误：`POST /api/uploadEvent` `GET /api/getData`

### 请求规范
- 统一前缀 `/api/v{version}`，当前版本 v1
- Content-Type: `application/json`，压缩传输 `Content-Encoding: gzip`
- 认证头：`X-Project-Id` + `X-SDK-Token`，禁止在 URL 传敏感参数

### 响应标准格式
```json
{
  "code": 0,
  "message": "success",
  "data": {},
//   "requestId": "uuid-用于链路追踪"
}

### 分页查询
- 页码分页：page（从1开始，默认1）、pageSize（默认10，最大100）
- 响应 data 包含 result 和 total （总记录数）