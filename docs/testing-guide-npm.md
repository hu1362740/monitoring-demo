# npm run test 命令详解

## 一、`npm run test` 概述

### 1.1 什么是 `npm run test`

`npm run test` 是 npm 脚本命令，用于**执行项目的自动化测试**。它是现代软件开发中最基础、最重要的质量保障手段之一。

### 1.2 核心作用

`npm run test` 的核心作用是：

- **自动化执行测试用例**：替代手动测试，自动运行预设的测试场景
- **验证代码正确性**：确保新提交的代码没有破坏原有功能（回归测试）
- **保障代码质量**：通过测试覆盖率指标，确保代码被充分测试
- **加速开发迭代**：无需手动测试，提交代码前自动验证功能正确性

### 1.3 在项目开发中的重要程度

**重要程度：★★★★★（极高）**

原因：
1. **质量保障的最后防线**：单元测试、集成测试是代码进入仓库前的最后检查
2. **重构的安全网**：有了充分测试，才能放心重构代码
3. **文档作用**：测试用例本身就是最好的代码文档，展示如何使用代码
4. **团队协作基础**：确保多人协作时代码质量可控

### 1.4 什么时候需要运行测试

| 场景 | 是否需要测试 | 说明 |
|------|-------------|------|
| 提交代码前 | ✅ 必须 | CI/CD 流水线会自动执行 |
| 新功能开发完成后 | ✅ 必须 | 确保功能符合预期 |
| Bug 修复后 | ✅ 必须 | 验证 bug 已修复，防止回归 |
| 代码重构前 | ✅ 必须 | 确保重构不破坏功能 |
| 代码合并前 | ✅ 必须 | 合并请求需要通过所有测试 |
| 部署前 | ✅ 必须 | 生产环境不能有未通过的测试 |

---

## 二、如何配置和使用 `npm run test`

### 2.1 package.json 中的配置

`npm run test` 命令定义在 `package.json` 的 `scripts` 字段中：

```json
{
  "scripts": {
    "test": "jest --coverage"
  }
}
```

执行 `npm run test` 时，npm 会：
1. 查找当前目录下的 `package.json`
2. 读取 `scripts.test` 字段的值
3. 在 `node_modules/.bin/` 目录中查找对应的可执行文件
4. 执行该命令（本例中为 `jest --coverage`）

### 2.2 Jest 测试框架

本项目使用 **Jest** 作为测试框架，它是最流行的 JavaScript/TypeScript 测试框架之一。

**为什么选择 Jest？**
- 开箱即用：内置断言库、测试运行器、覆盖率报告
- 零配置：配合 `ts-jest` 可直接测试 TypeScript 代码
- 快速执行：支持增量测试和并行执行
- 强大的 Mock 功能：方便模拟依赖
- 覆盖率报告：自动生成测试覆盖率统计

### 2.3 Jest 配置文件详解

项目根目录下的 `jest.config.js` 是 Jest 的配置文件：

```javascript
module.exports = {
  preset: 'ts-jest',           // 使用 ts-jest 预设，支持 TypeScript
  testEnvironment: 'jsdom',    // 测试环境为 jsdom（模拟浏览器环境）
  testPathIgnorePatterns: [    // 忽略这些目录中的测试文件
    '/node_modules/',
    '/dist/'
  ],
  coverageThreshold: {         // 覆盖率阈值（必须达到的标准）
    global: {
      branches: 80,           // 分支覆盖率 ≥ 80%
      functions: 80,          // 函数覆盖率 ≥ 80%
      lines: 80,              // 行覆盖率 ≥ 80%
      statements: 80         // 语句覆盖率 ≥ 80%
    }
  }
};
```

**配置项详解：**

| 配置项 | 说明 | 常见值 |
|--------|------|--------|
| `preset` | 预设配置，ts-jest 让 Jest 能识别 TypeScript | `ts-jest` |
| `testEnvironment` | 测试运行环境 | `jsdom`（浏览器）、`node`（Node.js） |
| `testPathIgnorePatterns` | 测试文件路径忽略模式 | 通常忽略 `node_modules` 和构建目录 |
| `coverageThreshold` | 覆盖率达标阈值 | 通常 70%-90% |

### 2.4 测试文件命名规范

Jest 自动识别以下文件名为测试文件：

```
// 方式一：*.test.ts 或 *.test.tsx
EventSender.test.ts
SDK.test.ts

// 方式二：*.spec.ts 或 *.spec.tsx
EventSender.spec.ts

// 方式三：放在 __tests__ 目录中
__tests__/EventSender.ts
```

**本项目使用的命名方式**：第一种（`* .test.ts`）

---

## 三、`npm run test` 执行流程和做的事情

### 3.1 执行流程图

```
npm run test
    │
    ▼
┌─────────────────────────────────────────┐
│  1. Jest 初始化                          │
│     - 加载 jest.config.js 配置           │
│     - 加载 ts-jest 转换器                │
│     - 扫描测试文件                       │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  2. 收集测试用例                         │
│     - 查找所有 *.test.ts 文件            │
│     - 解析 describe() 和 test() 块       │
│     - 构建测试套件树                      │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  3. 执行测试                             │
│     - 按顺序执行每个测试文件              │
│     - 每个 test() 是一个独立测试用例      │
│     - beforeEach() 每个测试前执行         │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  4. 收集结果                             │
│     - 统计通过/失败的测试                 │
│     - 计算代码覆盖率                       │
│     - 检查覆盖率是否达标                   │
└─────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────┐
│  5. 输出报告                             │
│     - 终端显示测试结果                    │
│     - 生成覆盖率报告                      │
│     - 退出码（0=成功，非0=失败）          │
└─────────────────────────────────────────┘
```

### 3.2 测试用例结构

Jest 测试文件遵循以下结构：

```typescript
// describe: 测试套件，用于组织相关测试
describe('测试模块名称', () => {

  // beforeEach: 每个测试用例执行前运行
  beforeEach(() => {
    // 准备测试环境，如重置 mock
  });

  // test/it: 定义具体的测试用例
  test('测试场景描述', () => {
    // Arrange: 准备测试数据
    const expected = 'xxx';

    // Act: 执行要测试的操作
    const result = someFunction();

    // Assert: 验证结果是否符合预期
    expect(result).toBe(expected);
  });

  // 可以有多个 test()
  test('另一个测试场景', () => {
    // ...
  });
});
```

### 3.3 常用断言函数

`expect()` 是 Jest 的核心断言函数，配合匹配器使用：

| 匹配器 | 说明 | 示例 |
|--------|------|------|
| `.toBe(value)` | 严格相等（===） | `expect(1+1).toBe(2)` |
| `.toEqual(value)` | 深度相等（适合对象） | `expect({a:1}).toEqual({a:1})` |
| `.toBeNull()` | 是否为 null | `expect(null).toBeNull()` |
| `.toBeUndefined()` | 是否为 undefined | `expect(x).toBeUndefined()` |
| `.toBeTruthy()` | 是否为真值 | `expect(1).toBeTruthy()` |
| `.toBeFalsy()` | 是否为假值 | `expect(0).toBeFalsy()` |
| `.toContain(item)` | 数组/字符串是否包含 | `expect([1,2]).toContain(1)` |
| `.toHaveBeenCalled()` | 函数是否被调用 | `expect(mockFn).toHaveBeenCalled()` |
| `.toThrow()` | 函数是否抛出异常 | `expect(fn).toThrow()` |
| `.not.toBe()` | 取反 | `expect(1).not.toBe(2)` |

### 3.4 覆盖率报告

执行 `npm run test` 后，会生成覆盖率报告，格式如下：

```
----------|---------|---------|---------|-------------
File      | % Stmts | % Branch | % Funcs | % Lines
----------|---------|---------|---------|-------------
SDK.ts    |   95.00 |   85.00  |  100.00 |   95.00
EventSend.|   90.00 |   80.00  |   90.00 |   90.00
----------|---------|---------|---------|-------------
```

**覆盖率指标说明：**

| 指标 | 说明 | 含义 |
|------|------|------|
| Stmts (语句) | 被执行的语句占总语句的比例 | 越高越好 |
| Branch (分支) | if/switch 等分支被覆盖的比例 | 关键指标 |
| Funcs (函数) | 被调用的函数占总函数的比例 | 越高越好 |
| Lines (行) | 被覆盖的代码行占总行数的比例 | 综合指标 |

**本项目的覆盖率要求：≥ 80%**（在 jest.config.js 中配置）

---

## 四、本项目中 `npm run test` 的具体应用

### 4.1 SDK 项目测试配置

**package.json 配置：**
```json
{
  "scripts": {
    "test": "jest --coverage"
  }
}
```

**jest.config.js 配置：**
```javascript
module.exports = {
  preset: 'ts-jest',           // 支持 TypeScript 测试
  testEnvironment: 'jsdom',    // 模拟浏览器 DOM 环境
  testPathIgnorePatterns: [    // 忽略不需要测试的目录
    '/node_modules/',
    '/dist/'
  ],
  coverageThreshold: {
    global: {                  // 全局覆盖率阈值
      branches: 80,            // 分支覆盖率 ≥ 80%
      functions: 80,           // 函数覆盖率 ≥ 80%
      lines: 80,               // 行覆盖率 ≥ 80%
      statements: 80            // 语句覆盖率 ≥ 80%
    }
  }
};
```

### 4.2 测试文件说明

**文件位置：** `packages/sdk/tests/`

**EventSender.test.ts** - 事件发送器测试
```typescript
describe('EventSender', () => {
  test('should queue events', () => {
    // 测试事件队列功能
  });

  test('should flush when batch size is reached', async () => {
    // 测试批量发送达到阈值时的行为
  });

  test('should set and clear user info', () => {
    // 测试用户信息设置和清除
  });
});
```

**SDK.test.ts** - SDK 核心功能测试
```typescript
describe('MonitoringSDK', () => {
  test('should initialize SDK', () => {
    // 测试 SDK 初始化
  });

  test('should not create multiple instances', () => {
    // 测试单例模式
  });

  test('should track custom events', () => {
    // 测试自定义事件追踪
  });

  test('should capture exceptions', () => {
    // 测试异常捕获
  });
});
```

### 4.3 如何运行测试

**基本命令：**
```bash
npm run test
```

**常用参数：**

| 命令 | 说明 |
|------|------|
| `npm run test` | 运行所有测试 |
| `npm run test -- --watch` | 监听模式，文件变化自动重新测试 |
| `npm run test -- --watchAll` | 监听所有文件 |
| `npm run test -- EventSender` | 只运行 EventSender 相关测试 |
| `npm run test -- --coverage` | 生成覆盖率报告（默认已包含） |
| `npm run test -- --verbose` | 详细输出每个测试用例 |

**在 CI/CD 中的使用：**
```bash
npm run test
# 或只运行不生成覆盖率报告（更快）
npm run test -- --coverage=false
```

### 4.4 测试执行示例

运行 `npm run test` 后的典型输出：

```
 PASS  tests/EventSender.test.ts
 PASS  tests/SDK.test.ts
Test Suites: 2 passed, 2 total
Tests:       11 passed, 11 total
Time:        3.456s

File         | % Stmts | % Branch | % Funcs | % Lines
-------------|---------|----------|---------|---------
SDK.ts       |   95.00 |   85.00  |  100.00 |   95.00
EventSender  |   90.00 |   80.00  |   90.00 |   90.00
-------------|---------|----------|---------|---------
All files    |   92.50 |   82.50  |   95.00 |   92.50

Test Suites: 2 passed, 2 total
Tests:       11 passed, 11 total
```

### 4.5 测试成功/失败的判断标准

**测试成功（退出码 0）：**
- ✅ 所有测试用例都通过（0 failures）
- ✅ 代码覆盖率达到阈值要求（≥ 80%）

**测试失败（退出码 非0）：**
- ❌ 至少有一个测试用例失败
- ❌ 代码覆盖率未达标

---

## 五、常见问题和解决方案

### 5.1 测试失败常见原因

| 问题 | 可能原因 | 解决方案 |
|------|---------|---------|
| 测试超时 | 异步操作未完成 | 使用 `async/await` 或 `done()` 回调 |
| Mock 未生效 | Mock 放在错误位置 | 确保 `beforeEach` 中正确设置 Mock |
| 覆盖率不足 | 新代码未测试 | 添加更多测试用例 |
| 环境问题 | 缺少环境变量 | 在测试前设置必要的环境变量 |

### 5.2 测试最佳实践

1. **测试应该是独立的**：每个测试不依赖其他测试的执行结果
2. **测试应该是确定性的**：同样的输入总是产生同样的输出
3. **测试应该快速执行**：避免不必要的延迟
4. **测试应该覆盖边界情况**：空值、最大值、异常情况等
5. **测试应该有一致的命名**：`it('should do something when condition')`

---

## 六、总结

### 6.1 核心要点

1. **`npm run test` 是自动化测试命令**，用于验证代码正确性
2. **本项目使用 Jest 测试框架**，配置了 TypeScript 支持
3. **测试覆盖率阈值 80%**，未达标则测试失败
4. **测试文件命名** `*.test.ts`，放在 `tests/` 目录或源文件同目录
5. **每次提交代码前都应该运行测试**，确保代码质量

### 6.2 快速参考

```bash
# 运行所有测试
npm run test

# 监听模式（文件变化自动测试）
npm run test -- --watch

# 只运行特定测试
npm run test -- SDK

# 跳过覆盖率检查（快速测试）
npm run test -- --coverage=false
```

### 6.3 相关文档

- Jest 官方文档：https://jestjs.io/
- Jest 断言文档：https://jestjs.io/docs/expect
- ts-jest 文档：https://kulshekhar.github.io/ts-jest/
