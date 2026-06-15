import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import {
  ClockCircleOutlined,
  ArrowUpOutlined,
  ThunderboltOutlined,
  DashboardOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, BarChart } from 'echarts/charts';
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import Layout from '../components/Layout';
import axios from 'axios';

echarts.use([LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

interface MetricData { name: string; value: number; }
interface TimeData { time: string; fcp: number; lcp: number; tti: number; }

export default function Performance() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [timeTrend, setTimeTrend] = useState<TimeData[]>([]);
  const [avgMetrics, setAvgMetrics] = useState({ fcp: 0, lcp: 0, tti: 0, cls: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await axios.get('/api/v1/metrics/summary', { params: { projectId: 'project-1', startDate: sevenDaysAgo, endDate: today } });

        setAvgMetrics({ fcp: 1850, lcp: 2450, tti: 3200, cls: 0.15 });

        setMetrics([
          { name: '首字节时间', value: 850 },
          { name: 'DNS解析', value: 120 },
          { name: 'TCP连接', value: 280 },
          { name: '请求响应', value: 450 },
          { name: 'DOM渲染', value: 1200 },
          { name: '资源加载', value: 800 },
        ]);

        setTimeTrend([
          { time: '00:00', fcp: 1600, lcp: 2200, tti: 2800 },
          { time: '04:00', fcp: 1500, lcp: 2100, tti: 2600 },
          { time: '08:00', fcp: 2100, lcp: 2800, tti: 3500 },
          { time: '12:00', fcp: 2400, lcp: 3200, tti: 4000 },
          { time: '16:00', fcp: 1900, lcp: 2500, tti: 3200 },
          { time: '20:00', fcp: 1700, lcp: 2300, tti: 2900 },
          { time: '23:59', fcp: 1500, lcp: 2000, tti: 2600 },
        ]);
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      }
    };
    fetchData();
  }, []);

  const getPerfStatus = (value: number, type: 'fcp' | 'lcp' | 'tti') => {
    const thresholds = { fcp: { good: 1800, warning: 3000 }, lcp: { good: 2500, warning: 4000 }, tti: { good: 3800, warning: 5500 } };
    if (value < thresholds[type].good) return '#52c41a';
    if (value < thresholds[type].warning) return '#faad14';
    return '#ff4d4f';
  };

  const lineOption = {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => (v / 1000).toFixed(2) + 's' },
    legend: { data: ['FCP', 'LCP', 'TTI'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: timeTrend.map((d) => d.time) },
    yAxis: { type: 'value', axisLabel: { formatter: (v: number) => (v / 1000) + 's' } },
    series: [
      { name: 'FCP', type: 'line', smooth: true, data: timeTrend.map((d) => d.fcp), itemStyle: { color: '#1890ff' } },
      { name: 'LCP', type: 'line', smooth: true, data: timeTrend.map((d) => d.lcp), itemStyle: { color: '#52c41a' } },
      { name: 'TTI', type: 'line', smooth: true, data: timeTrend.map((d) => d.tti), itemStyle: { color: '#faad14' } },
    ],
  };

  const barOption = {
    tooltip: { trigger: 'axis', valueFormatter: (v: number) => v + 'ms' },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: { type: 'category', data: metrics.map((d) => d.name), axisLabel: { rotate: 30 } },
    yAxis: { type: 'value', axisLabel: { formatter: '{value}ms' } },
    series: [{ type: 'bar', data: metrics.map((d) => d.value), itemStyle: { color: '#1890ff', borderRadius: [4, 4, 0, 0] } }],
  };

  const scores = [
    { label: '性能', score: 85 },
    { label: '可访问性', score: 92 },
    { label: '最佳实践', score: 95 },
    { label: 'SEO', score: 88 },
  ];

  return (
    <Layout>
      <div className="page-header">
        <h1>性能分析</h1>
        <p>分析和优化前端性能指标</p>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="首次内容绘制(FCP)" value={(avgMetrics.fcp / 1000).toFixed(1)} suffix="s" prefix={<ClockCircleOutlined />} valueStyle={{ color: getPerfStatus(avgMetrics.fcp, 'fcp') }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="最大内容绘制(LCP)" value={(avgMetrics.lcp / 1000).toFixed(1)} suffix="s" prefix={<ArrowUpOutlined />} valueStyle={{ color: getPerfStatus(avgMetrics.lcp, 'lcp') }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="可交互时间(TTI)" value={(avgMetrics.tti / 1000).toFixed(1)} suffix="s" prefix={<ThunderboltOutlined />} valueStyle={{ color: getPerfStatus(avgMetrics.tti, 'tti') }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic title="累积布局偏移(CLS)" value={avgMetrics.cls} precision={2} prefix={<DashboardOutlined />} valueStyle={{ color: avgMetrics.cls < 0.1 ? '#52c41a' : avgMetrics.cls < 0.25 ? '#faad14' : '#ff4d4f' }} />
          </Card>
        </Col>
      </Row>

      <Card title="核心指标趋势" style={{ marginTop: 16 }}>
        <ReactEChartsCore echarts={echarts} option={lineOption} style={{ height: 300 }} />
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="时间分解">
            <ReactEChartsCore echarts={echarts} option={barOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="性能评分">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {scores.map((item) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{item.label}</span>
                    <span style={{ fontWeight: 600, color: item.score >= 90 ? '#52c41a' : item.score >= 70 ? '#faad14' : '#ff4d4f' }}>{item.score}</span>
                  </div>
                  <Progress percent={item.score} showInfo={false} strokeColor={item.score >= 90 ? '#52c41a' : item.score >= 70 ? '#faad14' : '#ff4d4f'} />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </Layout>
  );
}
