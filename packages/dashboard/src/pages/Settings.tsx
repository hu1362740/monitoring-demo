import { useState } from 'react';
import { Tabs, Card, Form, Input, Select, Switch, Button, Row, Col, Statistic, message } from 'antd';
import { UserOutlined, BellOutlined, SafetyOutlined, DatabaseOutlined, SaveOutlined } from '@ant-design/icons';
import Layout from '../components/Layout';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({ username: 'admin', email: 'admin@example.com' });
  const [notifications, setNotifications] = useState({ email: true, sms: false, webhook: true });
  const [security, setSecurity] = useState({ twoFactor: false, sessionTimeout: 30 });

  const tabItems = [
    {
      key: 'profile',
      label: <span><UserOutlined /> 个人信息</span>,
      children: (
        <Card>
          <Form layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item label="用户名">
              <Input value={profile.username} onChange={(e) => setProfile({ ...profile, username: e.target.value })} />
            </Form.Item>
            <Form.Item label="邮箱">
              <Input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" icon={<SaveOutlined />} onClick={() => message.success('保存成功')}>保存更改</Button>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'notifications',
      label: <span><BellOutlined /> 通知设置</span>,
      children: (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { key: 'email', label: '邮件通知', desc: '接收告警邮件通知' },
              { key: 'sms', label: '短信通知', desc: '接收告警短信通知' },
              { key: 'webhook', label: 'Webhook通知', desc: '发送告警到指定Webhook地址' },
            ].map((item) => (
              <Card size="small" key={item.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{item.label}</div>
                    <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>{item.desc}</div>
                  </div>
                  <Switch checked={(notifications as any)[item.key]} onChange={(v) => setNotifications({ ...notifications, [item.key]: v })} />
                </div>
              </Card>
            ))}
          </div>
        </Card>
      ),
    },
    {
      key: 'security',
      label: <span><SafetyOutlined /> 安全设置</span>,
      children: (
        <Card>
          <Form layout="vertical" style={{ maxWidth: 600 }}>
            <Form.Item label="双因素认证">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
                <div>
                  <div style={{ fontWeight: 500 }}>双因素认证</div>
                  <div style={{ color: 'rgba(0,0,0,0.45)', fontSize: 13 }}>启用后登录需要额外验证</div>
                </div>
                <Switch checked={security.twoFactor} onChange={(v) => setSecurity({ ...security, twoFactor: v })} />
              </div>
            </Form.Item>
            <Form.Item label="会话超时时间">
              <Select value={security.sessionTimeout} onChange={(v) => setSecurity({ ...security, sessionTimeout: v })}>
                <Select.Option value={15}>15分钟</Select.Option>
                <Select.Option value={30}>30分钟</Select.Option>
                <Select.Option value={60}>1小时</Select.Option>
                <Select.Option value={120}>2小时</Select.Option>
              </Select>
            </Form.Item>
          </Form>
        </Card>
      ),
    },
    {
      key: 'database',
      label: <span><DatabaseOutlined /> 数据库</span>,
      children: (
        <Card>
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={8}><Card><Statistic title="数据库连接" value="已连接" valueStyle={{ color: '#52c41a' }} /></Card></Col>
            <Col xs={24} sm={8}><Card><Statistic title="数据量" value="12.5" suffix="MB" valueStyle={{ color: '#1890ff' }} /></Card></Col>
            <Col xs={24} sm={8}><Card><Statistic title="表数量" value={8} valueStyle={{ color: '#722ed1' }} /></Card></Col>
          </Row>
          <Space>
            <Button type="primary" onClick={() => message.success('备份成功')}>备份数据库</Button>
            <Button onClick={() => message.success('优化成功')}>优化数据库</Button>
          </Space>
        </Card>
      ),
    },
  ];

  return (
    <Layout>
      <div className="page-header">
        <h1>系统设置</h1>
        <p>管理系统配置和个人偏好</p>
      </div>
      <Card>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>
    </Layout>
  );
}
