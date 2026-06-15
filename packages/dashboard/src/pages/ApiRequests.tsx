import { useState, useEffect } from 'react';
import { Network, Search, Filter, Download, CheckCircle, XCircle, Clock } from 'lucide-react';
import Layout from '../components/Layout';
import axios from 'axios';

interface ApiRequest {
  id: string;
  url: string;
  method: string;
  statusCode: number;
  duration: number;
  success: boolean;
  timestamp: string;
}

export default function ApiRequests() {
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        await axios.get('/api/v1/events', { params: { projectId: 'project-1', type: 'api_request' } });
        
        setRequests([
          { id: '1', url: '/api/users', method: 'GET', statusCode: 200, duration: 125, success: true, timestamp: '2024-01-15T10:30:00Z' },
          { id: '2', url: '/api/products', method: 'GET', statusCode: 200, duration: 234, success: true, timestamp: '2024-01-15T10:30:01Z' },
          { id: '3', url: '/api/orders', method: 'POST', statusCode: 201, duration: 567, success: true, timestamp: '2024-01-15T10:30:02Z' },
          { id: '4', url: '/api/users/123', method: 'GET', statusCode: 404, duration: 89, success: false, timestamp: '2024-01-15T10:30:03Z' },
          { id: '5', url: '/api/payment', method: 'POST', statusCode: 500, duration: 1200, success: false, timestamp: '2024-01-15T10:30:04Z' },
          { id: '6', url: '/api/categories', method: 'GET', statusCode: 200, duration: 98, success: true, timestamp: '2024-01-15T10:30:05Z' },
          { id: '7', url: '/api/search', method: 'GET', statusCode: 200, duration: 445, success: true, timestamp: '2024-01-15T10:30:06Z' },
          { id: '8', url: '/api/auth/login', method: 'POST', statusCode: 200, duration: 876, success: true, timestamp: '2024-01-15T10:30:07Z' }
        ]);
      } catch (error) {
        console.error('Failed to fetch API requests:', error);
      }
    };

    fetchData();
  }, []);

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = filterMethod === 'all' || req.method === filterMethod;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'success' && req.success) || 
      (filterStatus === 'error' && !req.success);
    return matchesSearch && matchesMethod && matchesStatus;
  });

  const avgDuration = requests.length > 0 
    ? Math.round(requests.reduce((sum, r) => sum + r.duration, 0) / requests.length) 
    : 0;
  
  const successRate = requests.length > 0
    ? ((requests.filter(r => r.success).length / requests.length) * 100).toFixed(1)
    : '0';

  const handleExport = () => {
    const csv = [['URL', '方法', '状态码', '响应时间(ms)', '成功', '时间']]
      .concat(filteredRequests.map(r => [r.url, r.method, r.statusCode, r.duration, r.success, r.timestamp]))
      .map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api_requests.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getMethodColor = (method: string) => {
    const colors: Record<string, string> = {
      GET: 'bg-green-100 text-green-700',
      POST: 'bg-blue-100 text-blue-700',
      PUT: 'bg-yellow-100 text-yellow-700',
      DELETE: 'bg-red-100 text-red-700',
      PATCH: 'bg-purple-100 text-purple-700'
    };
    return colors[method] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">API请求监控</h1>
            <p className="text-slate-500 mt-2 text-sm">追踪和分析API请求性能</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            导出数据
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">总请求数</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{requests.length}</p>
              </div>
              <Network className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">平均响应时间</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{avgDuration}ms</p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">成功率</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{successRate}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索URL..."
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white shadow-sm"
            />
          </div>
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white shadow-sm"
          >
            <option value="all">全部方法</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white shadow-sm"
          >
            <option value="all">全部状态</option>
            <option value="success">成功</option>
            <option value="error">失败</option>
          </select>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">URL</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">方法</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">状态码</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">响应时间</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">状态</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-blue-600 font-medium">{req.url}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getMethodColor(req.method)}`}>
                        {req.method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        req.statusCode >= 200 && req.statusCode < 300 ? 'bg-green-100 text-green-700' :
                        req.statusCode >= 400 && req.statusCode < 500 ? 'bg-yellow-100 text-yellow-700' :
                        req.statusCode >= 500 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {req.statusCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-gray-800">{req.duration}ms</td>
                    <td className="px-6 py-4 text-center">
                      {req.success ? (
                        <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 mx-auto" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-500">
                      {new Date(req.timestamp).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
