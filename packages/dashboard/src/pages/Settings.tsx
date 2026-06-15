import { useState } from 'react';
import { User, Shield, Database, Bell, Save } from 'lucide-react';
import Layout from '../components/Layout';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({
    username: 'admin',
    email: 'admin@example.com'
  });
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    webhook: true
  });
  const [security, setSecurity] = useState({
    twoFactor: false,
    sessionTimeout: 30
  });

  const tabs = [
    { id: 'profile', label: '个人信息', icon: User },
    { id: 'notifications', label: '通知设置', icon: Bell },
    { id: 'security', label: '安全设置', icon: Shield },
    { id: 'database', label: '数据库', icon: Database }
  ];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">系统设置</h1>
          <p className="text-slate-500 mt-2 text-sm">管理系统配置和个人偏好</p>
        </div>

        <div className="flex gap-2 border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">个人信息</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">用户名</label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">邮箱</label>
                  <input
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <Save className="w-4 h-4" />
                  保存更改
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">通知设置</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">邮件通知</p>
                    <p className="text-sm text-gray-500">接收告警邮件通知</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, email: !notifications.email })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notifications.email ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        notifications.email ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">短信通知</p>
                    <p className="text-sm text-gray-500">接收告警短信通知</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, sms: !notifications.sms })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notifications.sms ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        notifications.sms ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">Webhook通知</p>
                    <p className="text-sm text-gray-500">发送告警到指定Webhook地址</p>
                  </div>
                  <button
                    onClick={() => setNotifications({ ...notifications, webhook: !notifications.webhook })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      notifications.webhook ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        notifications.webhook ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">安全设置</h2>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">双因素认证</p>
                    <p className="text-sm text-gray-500">启用后登录需要额外验证</p>
                  </div>
                  <button
                    onClick={() => setSecurity({ ...security, twoFactor: !security.twoFactor })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      security.twoFactor ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        security.twoFactor ? 'left-7' : 'left-1'
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">会话超时时间</label>
                  <select
                    value={security.sessionTimeout}
                    onChange={(e) => setSecurity({ ...security, sessionTimeout: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    <option value="15">15分钟</option>
                    <option value="30">30分钟</option>
                    <option value="60">1小时</option>
                    <option value="120">2小时</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800">数据库管理</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600">数据库连接</p>
                  <p className="text-2xl font-bold text-green-700 mt-1">已连接</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-600">数据量</p>
                  <p className="text-2xl font-bold text-blue-700 mt-1">12.5 MB</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm text-purple-600">表数量</p>
                  <p className="text-2xl font-bold text-purple-700 mt-1">8</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  备份数据库
                </button>
                <button className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
                  优化数据库
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
