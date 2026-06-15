import { useState, useEffect } from 'react';
import { Table, Card, Tag, Input, Select, Button, Row, Col, Statistic, Space } from 'antd';
import { ApiOutlined, ClockCircleOutlined, CheckCircleOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
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
          { id: '8', url: '/api/auth/login', method: 'POST', statusCode: 200, duration: 876, success: true, timestamp: '2024-01-15T10:30:07Z' },
        ]);
      } catch (error) {
        console.error('Failed to fetch API requests:', error);
      }
    };
    fetchData();
  }, []);

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = req.url.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMethod = filterMethod === 'all' || req.method === filterMethod;
    const matchesStatus = filterStatus === 'all' || (filterStatus === 'success' && req.success) || (filterStatus === 'error' && !req.success);
    return matchesSearch && matchesMethod && matchesStatus;
  });

  const avgDuration = requests.length > 0 ? Math.round(requests.reduce((sum, r) => sum + r.duration, 0) / requests.length) : 0;
  const successRate = requests.length > 0 ? ((requests.filter((r) => r.success).length / requests.length) * 100).toFixed(1) : '0';

  const handleExport = () => {
    const csv = [['URL', '方法', '状态码', '响应时间(ms)', '成功', '时间']]
      .concat(filteredRequests.map((r) => [r.url, r.method, String(r.statusCode), String(r.duration), String(r.success), r.timestamp]))
      .map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api_requests.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const methodColorMap: Record<string, string> = { GET: 'green', POST: 'blue', PUT: 'orange', DELETE: 'red', PATCH: 'purple' };
  const statusColor = (code: number) => {
    if (code >= 200 && code < 300) return 'success';
    if (code >= 400 && code < 500) return 'warning';
    if (code >= 500) return 'error';
    return 'default';
  };

  const columns: ColumnsType<ApiRequest> = [
    { title: 'URL', dataIndex: 'url', render: (url: string) => <span style={{ color: '#1890ff', fontWeight: 500 }}>{url}</span> },
    { title: '方法', dataIndex: 'method', render: (m: string) => <Tag color={methodColorMap[m] || 'default'}>{m}</Tag> },
    { title: '状态码', dataIndex: 'statusCode', align: 'center', render: (code: number) => <Tag color={statusColor(code)}>{code}</Tag> },
    { title: '响应时间', dataIndex: 'duration', align: 'right', render: (d: number) => <span style={{ fontWeight: 500 }}>{d}ms</span> },
    { title: '状态', dataIndex: 'success', align: 'center', render: (s: boolean) => s ? <Tag color="success" icon={<CheckCircleOutlined />}>成功</Tag> : <Tag color="error">失败</Tag> },
    { title: '时间', dataIndex: 'timestamp', align: 'right', render: (t: string) => new Date(t).toLocaleString('zh-CN') },
  ];

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>API请求监控</h1>
          <p>追踪和分析API请求性能</p>
        </div>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>导出数据</Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card><Statistic title="总请求数" value={requests.length} prefix={<ApiOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card><Statistic title="平均响应时间" value={avgDuration} suffix="ms" prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card><Statistic title="成功率" value={successRate} suffix="%" prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
      </Row>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input prefix={<SearchOutlined />} placeholder="搜索URL..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ width: 300 }} allowClear />
          <Select value={filterMethod} onChange={setFilterMethod} style={{ width: 140 }}>
            <Select.Option value="all">全部方法</Select.Option>
            <Select.Option value="GET">GET</Select.Option>
            <Select.Option value="POST">POST</Select.Option>
            <Select.Option value="PUT">PUT</Select.Option>
            <Select.Option value="DELETE">DELETE</Select.Option>
          </Select>
          <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 140 }}>
            <Select.Option value="all">全部状态</Select.Option>
            <Select.Option value="success">成功</Select.Option>
            <Select.Option value="error">失败</Select.Option>
          </Select>
        </Space>
      </Card>

      <Card>
        <Table columns={columns} dataSource={filteredRequests} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }} />
      </Card>
    </Layout>
  );
}
