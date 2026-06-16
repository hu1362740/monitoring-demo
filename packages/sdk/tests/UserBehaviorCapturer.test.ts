/**
 * @description UserBehaviorCapturer 测试文件
 * 测试用户行为采集器的核心功能：
 * - 点击事件追踪
 * - 页面浏览事件追踪
 * - 表单提交事件追踪
 * - 事件监听器的清理
 */

import { UserBehaviorCapturer } from '../src/core/UserBehaviorCapturer';
import type { EventData } from '../src/types';

describe('UserBehaviorCapturer', () => {
  /** 用于收集发送的事件 */
  let capturedEvents: EventData[] = [];

  /**
   * @description 每个测试前的设置
   * - 重置 capturedEvents 数组
   */
  beforeEach(() => {
    capturedEvents = [];
    jest.clearAllMocks();
  });

  /**
   * @description 创建 UserBehaviorCapturer 实例的辅助函数
   */
  function createCapturer(): UserBehaviorCapturer {
    return new UserBehaviorCapturer((event: EventData) => {
      capturedEvents.push(event);
    });
  }

  /**
   * @description 测试用户行为采集器初始化
   * 验证 UserBehaviorCapturer 能够成功创建
   */
  test('should initialize UserBehaviorCapturer', () => {
    const capturer = createCapturer();
    expect(capturer).toBeDefined();
    capturer.destroy();
  });

  /**
   * @description 测试点击事件追踪
   * 验证能够捕获用户点击事件（排除自动上报的页面浏览事件）
   */
  test('should track click events', () => {
    // 创建行为采集器
    const capturer = createCapturer();

    // 创建一个测试按钮并添加到 DOM
    const button = document.createElement('button');
    button.id = 'test-button';
    button.className = 'btn btn-primary';
    document.body.appendChild(button);

    // 模拟点击事件
    button.click();

    // 验证点击事件被捕获（过滤掉页面浏览事件）
    const clickEvents = capturedEvents.filter(e => e.data.action === 'click');
    expect(clickEvents.length).toBe(1);
    expect(clickEvents[0].type).toBe('user_behavior');

    // 清理
    document.body.removeChild(button);
    capturer.destroy();
  });

  /**
   * @description 测试页面浏览事件追踪
   * 验证页面加载时会自动上报页面浏览事件
   */
  test('should track page view events', () => {
    // 创建行为采集器（会自动上报页面浏览事件）
    const capturer = createCapturer();

    // 验证页面浏览事件被捕获
    const pageViewEvent = capturedEvents.find(e => e.data.action === 'page_view');
    expect(pageViewEvent).toBeDefined();
    expect(pageViewEvent?.data.target).toBe(window.location.pathname);

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试表单提交事件追踪
   * 验证能够捕获表单提交事件
   */
  test('should track form submission events', () => {
    // 创建行为采集器
    const capturer = createCapturer();

    // 创建一个测试表单并添加到 DOM
    const form = document.createElement('form');
    form.id = 'test-form';
    form.action = '/submit';
    document.body.appendChild(form);

    // 模拟表单提交
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));

    // 验证表单提交事件被捕获（action 会被解析为完整 URL）
    const submitEvent = capturedEvents.find(e => e.data.action === 'form_submit');
    expect(submitEvent).toBeDefined();
    expect(submitEvent?.data.target).toContain('/submit');

    // 清理
    document.body.removeChild(form);
    capturer.destroy();
  });

  /**
   * @description 测试点击事件包含坐标信息
   * 验证点击事件包含客户端坐标（排除自动上报的页面浏览事件）
   */
  test('should include click coordinates in click events', () => {
    // 创建行为采集器
    const capturer = createCapturer();

    // 创建一个测试按钮并添加到 DOM
    const button = document.createElement('button');
    document.body.appendChild(button);

    // 模拟带坐标的点击事件
    const clickEvent = new MouseEvent('click', {
      clientX: 100,
      clientY: 200,
      bubbles: true
    });
    button.dispatchEvent(clickEvent);

    // 验证点击事件包含坐标信息（过滤掉页面浏览事件）
    const clickEvents = capturedEvents.filter(e => e.data.action === 'click');
    expect(clickEvents.length).toBe(1);
    expect(clickEvents[0].data.value).toEqual({ x: 100, y: 200 });

    // 清理
    document.body.removeChild(button);
    capturer.destroy();
  });

  /**
   * @description 测试页面浏览事件包含页面信息
   * 验证页面浏览事件包含 referrer、url 和 title
   */
  test('should include page info in page view events', () => {
    // 创建行为采集器
    const capturer = createCapturer();

    // 验证页面浏览事件包含页面信息
    const pageViewEvent = capturedEvents.find(e => e.data.action === 'page_view');
    expect(pageViewEvent?.data.value).toBeDefined();
    // 使用类型断言获取 value 属性
    const value = pageViewEvent?.data.value as Record<string, string>;
    expect(value?.url).toBe(window.location.href);
    expect(value?.title).toBe(document.title);
    expect(value?.referrer).toBe(document.referrer);

    // 清理
    capturer.destroy();
  });

  /**
   * @description 测试 destroy 方法移除事件监听器
   * 验证调用 destroy 后不再捕获事件（排除自动上报的页面浏览事件）
   */
  test('should remove event listeners when destroyed', () => {
    // 创建行为采集器
    const capturer = createCapturer();

    // 创建一个测试按钮并添加到 DOM
    const button = document.createElement('button');
    document.body.appendChild(button);

    // 点击一次（应该被捕获）
    button.click();
    const clickEventsBeforeDestroy = capturedEvents.filter(e => e.data.action === 'click');
    expect(clickEventsBeforeDestroy.length).toBe(1);

    // 销毁采集器
    capturer.destroy();

    // 再次点击（不应该被捕获）
    button.click();
    const clickEventsAfterDestroy = capturedEvents.filter(e => e.data.action === 'click');
    expect(clickEventsAfterDestroy.length).toBe(1); // 数量不变

    // 清理
    document.body.removeChild(button);
  });

  /**
   * @description 测试目标元素标识生成
   * 验证能够正确生成元素标识（tagName#id.class1.class2）
   */
  test('should generate correct target info for elements', () => {
    // 创建行为采集器
    const capturer = createCapturer();

    // 创建一个带 id 和 class 的元素
    const div = document.createElement('div');
    div.id = 'my-div';
    div.className = 'container main';
    document.body.appendChild(div);

    // 模拟点击
    div.click();

    // 验证目标标识格式正确
    const clickEvent = capturedEvents.find(e => e.data.action === 'click');
    expect(clickEvent?.data.target).toBe('div#my-div.container.main');

    // 清理
    document.body.removeChild(div);
    capturer.destroy();
  });
});