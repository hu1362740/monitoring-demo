import { useState } from 'react';
import { Card, Row, Col, Tag, Switch, Button, Input, Select, Modal, Form, Space, Typography, message } from 'antd';
import { BellOutlined, BellFilled, PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import Layout from '../components/Layout';

interface AlertItem {
  id: string;
  name: string;
  type: 'error' | 'performance' | 'api';
  condition: string;
  threshold: number;
  enabled: boolean;
  createdAt: string;
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<AlertItem[]>([
    { id: '1', name: '错误率告警', type: 'error', condition: '错误数 >', threshold: 100, enabled: true, createdAt: '2024-01-10' },
    { id: '2', name: '响应时间告警', type: 'performance', condition: '平均响应时间 >', threshold: 500, enabled: true, createdAt: '2024-01-12' },
    { id: '3', name: 'API失败率告警', type: 'api', condition: '失败率 >', threshold: 5, enabled: false, createdAt: '2024-01-14' },
    { id: '4', name: 'LCP告警', type: 'performance', condition: 'LCP >', threshold: 2500, enabled: true, createdAt: '2024-01-15' },
  ]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form] = Form.useForm();

  const filteredAlerts = alerts.filter((alert) => {
    const matchesSearch = alert.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || alert.type === filterType;
    return matchesSearch && matchesType;
  });

  const toggleAlert = (id: string) => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)));
  };

  const deleteAlert = (id: string) => {
    setAlerts(alerts.filter((a) => a.id !== id));
    message.success('告警规则已删除');
  };

  const typeColorMap: Record<string, string> = { error: 'red', performance: 'purple', api: 'blue' };
  const typeLabelMap: Record<string, string> = { error: '错误', performance: '性能', api: 'API' };

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>告警管理</h1>
          <p>配置和管理告警规则</p>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setShowCreateModal(true)}>新建告警</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input prefix={<SearchOutlined />} placeholder="搜索告警名称..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 300 }} allowClear />
          <Select value={filterType} onChange={setFilterType} style={{ width: 140 }}>
            <Select.Option value="all">全部类型</Select.Option>
            <Select.Option value="error">错误</Select.Option>
            <Select.Option value="performance">性能</Select.Option>
            <Select.Option value="api">API</Select.Option>
          </Select>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        {filteredAlerts.map((alert) => (
          <Col xs={24} sm={12} lg={8} key={alert.id}>
            <Card style={{ opacity: alert.enabled ? 1 : 0.6 }} actions={[
              <Space key="toggle"><Switch size="small" checked={alert.enabled} onChange={() => toggleAlert(alert.id)} /> <Typography.Text type="secondary">{alert.enabled ? '启用' : '禁用'}</Typography.Text></Space>,
              <Button key="edit" type="text" icon={<EditOutlined />} />,
              <Button key="delete" type="text" icon={<DeleteOutlined />} danger onClick={() => deleteAlert(alert.id)} />,
            ]}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Space>
                  {alert.enabled ? <BellFilled style={{ color: '#1890ff' }} /> : <BellOutlined style={{ color: '#d9d9d9' }} />}
                  <Typography.Text strong>{alert.name}</Typography.Text>
                </Space>
                <Tag color={typeColorMap[alert.type]}>{typeLabelMap[alert.type]}</Tag>
              </div>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 4 }}>
                {alert.condition} <Typography.Text strong>{alert.threshold}</Typography.Text>
                {alert.type === 'api' ? '%' : alert.type === 'performance' && alert.threshold > 100 ? 'ms' : ''}
              </Typography.Paragraph>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>创建于 {alert.createdAt}</Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>

      <Modal title="新建告警规则" open={showCreateModal} onCancel={() => setShowCreateModal(false)} onOk={() => { setShowCreateModal(false); message.success('告警规则已创建'); }}>
        <Form form={form} layout="vertical">
          <Form.Item label="告警名称" name="name" rules={[{ required: true, message: '请输入告警名称' }]}>
            <Input placeholder="输入告警名称" />
          </Form.Item>
          <Form.Item label="告警类型" name="type" rules={[{ required: true }]}>
            <Select placeholder="选择告警类型">
              <Select.Option value="error">错误</Select.Option>
              <Select.Option value="performance">性能</Select.Option>
              <Select.Option value="api">API</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item label="触发条件" style={{ marginBottom: 0 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Select defaultValue="gt" style={{ width: '40%' }}>
                <Select.Option value="gt">大于 (&gt;)</Select.Option>
                <Select.Option value="lt">小于 (&lt;)</Select.Option>
                <Select.Option value="eq">等于 (=)</Select.Option>
              </Select>
              <Form.Item name="threshold" noStyle rules={[{ required: true, message: '请输入阈值' }]}>
                <Input placeholder="阈值" style={{ width: '60%' }} />
              </Form.Item>
            </Space.Compact>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
