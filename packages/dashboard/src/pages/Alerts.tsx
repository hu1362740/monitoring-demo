import { useState } from 'react';
import { Bell, BellOff, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Filter, Search } from 'lucide-react';
import Layout from '../components/Layout';

interface Alert {
  id: string;
  name: string;
  type: 'error' | 'performance' | 'api';
  condition: string;
  threshold: number;
  enabled: boolean;
  createdAt: string;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([
    { id: '1', name: '错误率告警', type: 'error', condition: '错误数 >', threshold: 100, enabled: true, createdAt: '2024-01-10' },
    { id: '2', name: '响应时间告警', type: 'performance', condition: '平均响应时间 >', threshold: 500, enabled: true, createdAt: '2024-01-12' },
    { id: '3', name: 'API失败率告警', type: 'api', condition: '失败率 >', threshold: 5, enabled: false, createdAt: '2024-01-14' },
    { id: '4', name: 'LCP告警', type: 'performance', condition: 'LCP >', threshold: 2500, enabled: true, createdAt: '2024-01-15' }
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredAlerts = alerts.filter(alert => {
    const matchesSearch = alert.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || alert.type === filterType;
    return matchesSearch && matchesType;
  });

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === id ? { ...alert, enabled: !alert.enabled } : alert
    ));
  };

  const deleteAlert = (id: string) => {
    setAlerts(alerts.filter(alert => alert.id !== id));
  };

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      error: '错误',
      performance: '性能',
      api: 'API'
    };
    return labels[type] || type;
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      error: 'bg-red-100 text-red-700',
      performance: 'bg-purple-100 text-purple-700',
      api: 'bg-blue-100 text-blue-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">告警管理</h1>
            <p className="text-slate-500 mt-2 text-sm">配置和管理告警规则</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm shadow-blue-200 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            新建告警
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索告警名称..."
              className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white shadow-sm"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-11 pr-8 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white shadow-sm"
            >
              <option value="all">全部类型</option>
              <option value="error">错误</option>
              <option value="performance">性能</option>
              <option value="api">API</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAlerts.map((alert) => (
            <div key={alert.id} className={`bg-white rounded-2xl p-6 border border-slate-100 shadow-sm ${alert.enabled ? '' : 'opacity-60'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {alert.enabled ? (
                    <Bell className="w-5 h-5 text-blue-500" />
                  ) : (
                    <BellOff className="w-5 h-5 text-gray-400" />
                  )}
                  <h3 className="font-semibold text-gray-800">{alert.name}</h3>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(alert.type)}`}>
                  {getTypeLabel(alert.type)}
                </span>
              </div>
              
              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">
                  {alert.condition} <span className="font-medium">{alert.threshold}</span>
                  {alert.type === 'api' ? '%' : alert.type === 'performance' && alert.threshold > 100 ? 'ms' : ''}
                </p>
                <p className="text-xs text-gray-400">创建于 {alert.createdAt}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  onClick={() => toggleAlert(alert.id)}
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  {alert.enabled ? (
                    <><ToggleRight className="w-4 h-4" /> 启用</>
                  ) : (
                    <><ToggleLeft className="w-4 h-4" /> 禁用</>
                  )}
                </button>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteAlert(alert.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold text-gray-800 mb-6">新建告警规则</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">告警名称</label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="输入告警名称"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">告警类型</label>
                  <select className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                    <option value="error">错误</option>
                    <option value="performance">性能</option>
                    <option value="api">API</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">触发条件</label>
                  <div className="flex items-center gap-2">
                    <select className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none">
                      <option value="gt">大于 (&gt;)</option>
                      <option value="lt">小于 (&lt;)</option>
                      <option value="eq">等于 (=)</option>
                    </select>
                    <input
                      type="number"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="阈值"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
