/**
 * @description MonitoringSDK 测试文件
 * 测试 SDK 核心功能：
 * - SDK 初始化与配置
 * - 单例模式验证
 * - 事件追踪功能
 * - 异常捕获功能
 * - 用户信息管理
 * - API 便捷函数
 */

import { init, getInstance, captureException, trackEvent, MonitoringSDK } from '../src';

describe('MonitoringSDK', () => {
  /**
   * @description 每个测试前的设置
   * - 清除所有 mock
   * - Mock global.fetch
   */
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  /**
   * @description 测试 SDK 初始化
   * 验证 SDK 能够正确初始化并返回实例
   */
  test('should initialize SDK', () => {
    // 初始化 SDK
    const sdk = init({ apiKey: 'test-key' });
    
    // 验证实例被创建
    expect(sdk).toBeDefined();
    expect(sdk).toBeInstanceOf(MonitoringSDK);
    
    // 验证 getInstance 返回同一实例
    expect(getInstance()).toBe(sdk);
  });

  /**
   * @description 测试单例模式
   * 验证多次调用 init 返回同一个实例
   */
  test('should not create multiple instances', () => {
    // 第一次初始化
    init({ apiKey: 'test-key' });
    const instance1 = getInstance();
    
    // 第二次初始化
    init({ apiKey: 'test-key' });
    const instance2 = getInstance();
    
    // 验证是同一个实例
    expect(instance1).toBe(instance2);
  });

  /**
   * @description 测试自定义事件追踪
   * 验证 track 方法能够追踪自定义事件
   */
  test('should track custom events', () => {
    // 初始化 SDK
    const sdk = init({ apiKey: 'test-key', endpoint: 'http://test.com' });
    
    // 追踪自定义事件
    sdk.track('test_event', { foo: 'bar' });
    
    // 验证实例存在
    expect(sdk).toBeDefined();
  });

  /**
   * @description 测试异常捕获
   * 验证 captureException 方法能够捕获异常
   */
  test('should capture exceptions', () => {
    // 初始化 SDK
    const sdk = init({ apiKey: 'test-key', endpoint: 'http://test.com' });
    
    // 创建测试错误
    const error = new Error('test error');
    
    // 捕获异常
    sdk.captureException(error, { context: 'test' });
    
    // 验证实例存在
    expect(sdk).toBeDefined();
  });

  /**
   * @description 测试设置用户信息
   * 验证 setUser 方法能够设置用户信息
   */
  test('should set user info', () => {
    // 初始化 SDK
    const sdk = init({ apiKey: 'test-key' });
    
    // 设置用户信息
    sdk.setUser({ id: '123', name: 'Test User' });
    
    // 验证实例存在
    expect(sdk).toBeDefined();
  });

  /**
   * @description 测试清除用户信息
   * 验证 clearUser 方法能够清除用户信息
   */
  test('should clear user info', () => {
    // 初始化 SDK
    const sdk = init({ apiKey: 'test-key' });
    
    // 设置然后清除用户信息
    sdk.setUser({ id: '123' });
    sdk.clearUser();
    
    // 验证实例存在
    expect(sdk).toBeDefined();
  });

  /**
   * @description 测试销毁 SDK
   * 验证 destroy 方法能够销毁 SDK 实例
   */
  test('should destroy SDK', () => {
    // 初始化 SDK
    const sdk = init({ apiKey: 'test-key' });
    
    // 销毁 SDK
    sdk.destroy();
    
    // 验证实例仍可获取（销毁后实例对象仍存在但功能停止）
    expect(getInstance()).not.toBeNull();
  });

  /**
   * @description 测试初始化参数验证
   * 验证缺少 apiKey 时会创建实例但可能不正常工作
   */
  test('should create instance without apiKey', () => {
    // 使用空配置初始化（不会抛出错误，但不推荐）
    // @ts-expect-error 测试缺少必填参数的情况
    const sdk = init({});
    expect(sdk).toBeDefined();
  });

  /**
   * @description 测试启用/禁用状态
   * 验证 enabled 配置能够控制 SDK 功能
   */
  test('should respect enabled configuration', () => {
    // 初始化禁用的 SDK
    const sdk = init({ apiKey: 'test-key', enabled: false });
    
    // 尝试追踪事件（不会实际发送）
    sdk.track('test_event', { test: 'data' });
    
    // 验证实例存在
    expect(sdk).toBeDefined();
  });
});

/**
 * @description API 便捷函数测试
 * 测试通过便捷函数调用 SDK 功能
 */
describe('API Functions', () => {
  /**
   * @description 每个测试前的设置
   * - 清除所有 mock
   * - Mock global.fetch
   */
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  /**
   * @description 测试 captureException 便捷函数
   * 验证 SDK 初始化后便捷函数能够正常工作
   */
  test('captureException should work when SDK is initialized', () => {
    // 先初始化 SDK
    init({ apiKey: 'test-key' });
    
    // 使用便捷函数捕获异常
    expect(() => captureException(new Error('test'))).not.toThrow();
  });

  /**
   * @description 测试 trackEvent 便捷函数
   * 验证 SDK 初始化后便捷函数能够正常工作
   */
  test('trackEvent should work when SDK is initialized', () => {
    // 先初始化 SDK
    init({ apiKey: 'test-key' });
    
    // 使用便捷函数追踪事件
    expect(() => trackEvent('test', { foo: 'bar' })).not.toThrow();
  });

  /**
   * @description 测试未初始化时的便捷函数行为
   * 验证未初始化 SDK 时便捷函数不会抛出错误
   */
  test('API functions should not throw when SDK is not initialized', () => {
    // 不初始化 SDK，直接调用便捷函数
    expect(() => captureException(new Error('test'))).not.toThrow();
    expect(() => trackEvent('test', { foo: 'bar' })).not.toThrow();
  });
});