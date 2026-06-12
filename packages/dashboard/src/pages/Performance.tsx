import { useEffect, useState } from 'react';
import { Activity, Clock, Zap, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import axios from 'axios';

interface MetricData {
  name: string;
  value: number;
}

interface TimeData {
  time: string;
  fcp: number;
  lcp: number;
  tti: number;
}

export default function Performance() {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [timeTrend, setTimeTrend] = useState<TimeData[]>([]);
  const [avgMetrics, setAvgMetrics] = useState({
    fcp: 0,
    lcp: 0,
    tti: 0,
    cls: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        await axios.get('/api/v1/metrics/summary', { 
          params: { projectId: 'project-1', startDate: sevenDaysAgo, endDate: today } 
        });

        setAvgMetrics({
          fcp: 1850,
          lcp: 2450,
          tti: 3200,
          cls: 0.15
        });

        setMetrics([
          { name: '首字节时间', value: 850 },
          { name: 'DNS解析', value: 120 },
          { name: 'TCP连接', value: 280 },
          { name: '请求响应', value: 450 },
          { name: 'DOM渲染', value: 1200 },
          { name: '资源加载', value: 800 }
        ]);

        setTimeTrend([
          { time: '00:00', fcp: 1600, lcp: 2200, tti: 2800 },
          { time: '04:00', fcp: 1500, lcp: 2100, tti: 2600 },
          { time: '08:00', fcp: 2100, lcp: 2800, tti: 3500 },
          { time: '12:00', fcp: 2400, lcp: 3200, tti: 4000 },
          { time: '16:00', fcp: 1900, lcp: 2500, tti: 3200 },
          { time: '20:00', fcp: 1700, lcp: 2300, tti: 2900 },
          { time: '23:59', fcp: 1500, lcp: 2000, tti: 2600 }
        ]);
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
      }
    };

    fetchData();
  }, []);

  const getPerformanceColor = (value: number, type: 'fcp' | 'lcp' | 'tti') => {
    const thresholds = {
      fcp: { good: 1800, warning: 3000 },
      lcp: { good: 2500, warning: 4000 },
      tti: { good: 3800, warning: 5500 }
    };
    if (value < thresholds[type].good) return 'green';
    if (value < thresholds[type].warning) return 'yellow';
    return 'red';
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">性能分析</h1>
          <p className="text-gray-500 mt-1">分析和优化前端性能指标</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="首次内容绘制(FCP)"
            value={`${(avgMetrics.fcp / 1000).toFixed(1)}s`}
            icon={<Clock className="w-6 h-6" />}
            color={getPerformanceColor(avgMetrics.fcp, 'fcp') as 'blue' | 'green' | 'red'}
            change={-5.2}
            changeLabel="较昨日"
          />
          <StatCard
            title="最大内容绘制(LCP)"
            value={`${(avgMetrics.lcp / 1000).toFixed(1)}s`}
            icon={<TrendingUp className="w-6 h-6" />}
            color={getPerformanceColor(avgMetrics.lcp, 'lcp') as 'blue' | 'green' | 'red'}
            change={3.8}
            changeLabel="较昨日"
          />
          <StatCard
            title="可交互时间(TTI)"
            value={`${(avgMetrics.tti / 1000).toFixed(1)}s`}
            icon={<Zap className="w-6 h-6" />}
            color={getPerformanceColor(avgMetrics.tti, 'tti') as 'blue' | 'green' | 'red'}
            change={-8.1}
            changeLabel="较昨日"
          />
          <StatCard
            title="累积布局偏移(CLS)"
            value={avgMetrics.cls.toFixed(2)}
            icon={<Activity className="w-6 h-6" />}
            color={avgMetrics.cls < 0.1 ? 'green' : avgMetrics.cls < 0.25 ? 'yellow' : 'red'}
            change={-12.5}
            changeLabel="较昨日"
          />
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">核心指标趋势</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeTrend}>
                <XAxis dataKey="time" />
                <YAxis tickFormatter={(tick) => `${tick / 1000}s`} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip formatter={(value) => [`${(value as number / 1000).toFixed(2)}s`]} />
                <Line type="monotone" dataKey="fcp" name="FCP" stroke="#3B82F6" strokeWidth={2} />
                <Line type="monotone" dataKey="lcp" name="LCP" stroke="#10B981" strokeWidth={2} />
                <Line type="monotone" dataKey="tti" name="TTI" stroke="#F59E0B" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">时间分解</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip formatter={(value) => [`${value}ms`]} />
                  <Bar dataKey="value" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">性能评分</h3>
            <div className="space-y-4">
              {[
                { label: '性能', score: 85, color: 'bg-green-500' },
                { label: '可访问性', score: 92, color: 'bg-green-500' },
                { label: '最佳实践', score: 95, color: 'bg-green-500' },
                { label: 'SEO', score: 88, color: 'bg-green-500' }
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.label}</span>
                    <span className={`text-sm font-bold ${item.score >= 90 ? 'text-green-600' : item.score >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {item.score}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${item.color}`}
                      style={{ width: `${item.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
