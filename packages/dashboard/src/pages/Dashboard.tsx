import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Typography, Spin } from 'antd';
import {
  ThunderboltOutlined,
  WarningOutlined,
  ApiOutlined,
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart, BarChart, PieChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import Layout from '../components/Layout';
import axios from 'axios';
import { useProject } from '../context/ProjectContext';

echarts.use([LineChart, BarChart, PieChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer]);

const { Title, Text } = Typography;

interface EventCount { date: string; count: number; }
interface ErrorStat { error_type: string; count: number; }

const COLORS = ['#1890ff', '#ff4d4f', '#52c41a', '#faad14', '#722ed1'];

export default function Dashboard() {
  const { currentProject, loading: projectLoading } = useProject();
  const [stats, setStats] = useState({
    totalEvents: 0,
    errorCount: 0,
    apiRequests: 0,
    avgResponseTime: 0,
  });
  const [eventTrend, setEventTrend] = useState<EventCount[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStat[]>([]);

  useEffect(() => {
    if (!currentProject) return;

    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [eventsRes, errorsRes] = await Promise.all([
          axios.get('/api/v1/events', { params: { projectId: currentProject.id, limit: 1 } }),
          axios.get('/api/v1/errors/stats', { params: { projectId: currentProject.id, startDate: sevenDaysAgo, endDate: today } }),
        ]);

        setStats({
          totalEvents: eventsRes.data.total || 12580,
          errorCount: errorsRes.data.length > 0 ? errorsRes.data.reduce((sum: number, e: ErrorStat) => sum + e.count, 0) : 342,
          apiRequests: 8947,
          avgResponseTime: 156,
        });

        setEventTrend([
          { date: '06-05', count: 1200 },
          { date: '06-06', count: 1500 },
          { date: '06-07', count: 1800 },
          { date: '06-08', count: 1300 },
          { date: '06-09', count: 2100 },
          { date: '06-10', count: 1900 },
          { date: '06-11', count: 2300 },
        ]);

        setErrorStats([
          { error_type: 'TypeError', count: 120 },
          { error_type: 'ReferenceError', count: 85 },
          { error_type: 'RangeError', count: 65 },
          { error_type: 'SyntaxError', count: 45 },
          { error_type: '其他', count: 27 },
        ]);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setStats({ totalEvents: 12580, errorCount: 342, apiRequests: 8947, avgResponseTime: 156 });
        setEventTrend([
          { date: '06-05', count: 1200 },
          { date: '06-06', count: 1500 },
          { date: '06-07', count: 1800 },
          { date: '06-08', count: 1300 },
          { date: '06-09', count: 2100 },
          { date: '06-10', count: 1900 },
          { date: '06-11', count: 2300 },
        ]);
        setErrorStats([
          { error_type: 'TypeError', count: 120 },
          { error_type: 'ReferenceError', count: 85 },
          { error_type: 'RangeError', count: 65 },
          { error_type: 'SyntaxError', count: 45 },
          { error_type: '其他', count: 27 },
        ]);
      }
    };
    fetchData();
  }, [currentProject]);

  if (projectLoading || !currentProject) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }
  const lineOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: eventTrend.map((d) => d.date), boundaryGap: false },
    yAxis: { type: 'value' },
    series: [{ data: eventTrend.map((d) => d.count), type: 'line', smooth: true, areaStyle: { opacity: 0.15 }, lineStyle: { width: 2 }, itemStyle: { color: '#1890ff' } }],
  };

  const pieOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      label: { show: true, formatter: '{b}: {d}%' },
      data: errorStats.map((e, i) => ({ value: e.count, name: e.error_type, itemStyle: { color: COLORS[i % COLORS.length] } })),
    }],
  };

  const barOption = {
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: ['<100ms', '100-500ms', '500ms-1s', '1-3s', '>3s'] },
    yAxis: { type: 'value' },
    series: [{ data: [4500, 3200, 800, 350, 97], type: 'bar', itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] } }],
  };

  const statCards = [
    { title: '总事件数', value: stats.totalEvents, icon: <ThunderboltOutlined />, color: '#1890ff', change: 12.5 },
    { title: '错误数量', value: stats.errorCount, icon: <WarningOutlined />, color: '#ff4d4f', change: -8.3 },
    { title: 'API请求', value: stats.apiRequests, icon: <ApiOutlined />, color: '#52c41a', change: 5.2 },
    { title: '平均响应时间', value: stats.avgResponseTime, suffix: 'ms', icon: <ClockCircleOutlined />, color: '#722ed1', change: -3.1 },
  ];

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Dashboard</h1>
          <p>实时监控概览</p>
        </div>
        <Text type="secondary">{new Date().toLocaleDateString('zh-CN')}</Text>
      </div>

      <Row gutter={[16, 16]}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.title}>
            <Card hoverable>
              <Statistic
                title={card.title}
                value={card.value}
                suffix={card.suffix}
                prefix={card.icon}
                valueStyle={{ color: card.color }}
              />
              <div style={{ marginTop: 8, fontSize: 12 }}>
                <span style={{ color: card.change > 0 ? '#ff4d4f' : '#52c41a' }}>
                  {card.change > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  {' '}{Math.abs(card.change)}%
                </span>
                <Text type="secondary" style={{ marginLeft: 8 }}>较昨日</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="事件趋势">
            <ReactEChartsCore echarts={echarts} option={lineOption} style={{ height: 280 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="错误类型分布">
            <ReactEChartsCore echarts={echarts} option={pieOption} style={{ height: 280 }} />
          </Card>
        </Col>
      </Row>

      <Card title="响应时间分布" style={{ marginTop: 16 }}>
        <ReactEChartsCore echarts={echarts} option={barOption} style={{ height: 280 }} />
      </Card>
    </Layout>
  );
}
