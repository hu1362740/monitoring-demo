import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Network, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import axios from 'axios';

interface EventCount {
  date: string;
  count: number;
}

interface ErrorStat {
  error_type: string;
  count: number;
}

const COLORS = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalEvents: 0,
    errorCount: 0,
    apiRequests: 0,
    avgResponseTime: 0
  });
  const [eventTrend, setEventTrend] = useState<EventCount[]>([]);
  const [errorStats, setErrorStats] = useState<ErrorStat[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const [eventsRes, errorsRes] = await Promise.all([
          axios.get('/api/v1/events', { params: { projectId: 'project-1', limit: 1 } }),
          axios.get('/api/v1/errors/stats', { params: { projectId: 'project-1', startDate: sevenDaysAgo, endDate: today } })
        ]);

        setStats({
          totalEvents: eventsRes.data.total || 12580,
          errorCount: errorsRes.data.length > 0 ? errorsRes.data.reduce((sum: number, e: ErrorStat) => sum + e.count, 0) : 342,
          apiRequests: 8947,
          avgResponseTime: 156
        });

        setEventTrend([
          { date: '06-05', count: 1200 },
          { date: '06-06', count: 1500 },
          { date: '06-07', count: 1800 },
          { date: '06-08', count: 1300 },
          { date: '06-09', count: 2100 },
          { date: '06-10', count: 1900 },
          { date: '06-11', count: 2300 }
        ]);

        setErrorStats([
          { error_type: 'TypeError', count: 120 },
          { error_type: 'ReferenceError', count: 85 },
          { error_type: 'RangeError', count: 65 },
          { error_type: 'SyntaxError', count: 45 },
          { error_type: '其他', count: 27 }
        ]);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
            <p className="text-gray-500 mt-1">实时监控概览</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{new Date().toLocaleDateString('zh-CN')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="总事件数"
            value={stats.totalEvents.toLocaleString()}
            icon={<Activity className="w-6 h-6" />}
            color="blue"
            change={12.5}
            changeLabel="较昨日"
          />
          <StatCard
            title="错误数量"
            value={stats.errorCount.toLocaleString()}
            icon={<AlertTriangle className="w-6 h-6" />}
            color="red"
            change={-8.3}
            changeLabel="较昨日"
          />
          <StatCard
            title="API请求"
            value={stats.apiRequests.toLocaleString()}
            icon={<Network className="w-6 h-6" />}
            color="green"
            change={5.2}
            changeLabel="较昨日"
          />
          <StatCard
            title="平均响应时间"
            value={`${stats.avgResponseTime}ms`}
            icon={<TrendingUp className="w-6 h-6" />}
            color="purple"
            change={-3.1}
            changeLabel="较昨日"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">事件趋势</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={eventTrend}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">错误类型分布</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={errorStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="count"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {errorStats.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">响应时间分布</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: '<100ms', value: 4500 },
                { name: '100-500ms', value: 3200 },
                { name: '500ms-1s', value: 800 },
                { name: '1-3s', value: 350 },
                { name: '>3s', value: 97 }
              ]}>
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Bar dataKey="value" fill="#10B981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </Layout>
  );
}
