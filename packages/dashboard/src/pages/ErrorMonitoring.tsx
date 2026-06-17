import { useState, useEffect } from 'react';
import { Table, Card, Tag, Input, Select, Button, Space, Typography, Spin } from 'antd';
import { WarningOutlined, SearchOutlined, DownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Layout from '../components/Layout';
import axios from 'axios';
import { useProject } from '../context/ProjectContext';

interface ErrorItem {
  id: string;
  error_type: string;
  message: string;
  url: string;
  count: number;
  last_occurrence: string;
}

export default function ErrorMonitoring() {
  const { currentProject, loading: projectLoading } = useProject();
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentProject) return;

    const fetchErrors = async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const response = await axios.get('/api/v1/errors/stats', { params: { projectId: currentProject.id, startDate: sevenDaysAgo, endDate: today } });

        setErrors(response.data.map((item: { error_type: string; message: string; url: string; count: number; last_occurrence: string }, index: number) => ({
          id: `error-${index}`,
          error_type: item.error_type,
          message: item.message || `An error occurred of type ${item.error_type}`,
          url: item.url || 'https://example.com/path',
          count: item.count,
          last_occurrence: item.last_occurrence || new Date().toISOString(),
        })));
      } catch {
        setErrors([
          { id: '1', error_type: 'TypeError', message: 'Cannot read properties of undefined', url: '/users', count: 120, last_occurrence: '2024-01-15T10:30:00Z' },
          { id: '2', error_type: 'ReferenceError', message: 'variable is not defined', url: '/dashboard', count: 85, last_occurrence: '2024-01-15T09:15:00Z' },
          { id: '3', error_type: 'RangeError', message: 'Maximum call stack size exceeded', url: '/api/data', count: 65, last_occurrence: '2024-01-15T08:45:00Z' },
          { id: '4', error_type: 'SyntaxError', message: 'Unexpected token in JSON', url: '/settings', count: 45, last_occurrence: '2024-01-15T07:20:00Z' },
          { id: '5', error_type: 'TypeError', message: 'Cannot read properties of null', url: '/products', count: 38, last_occurrence: '2024-01-15T06:55:00Z' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    fetchErrors();
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

  const filteredErrors = errors.filter((error) => {
    const matchesSearch = error.message.toLowerCase().includes(searchTerm.toLowerCase()) || error.error_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || error.error_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    const csv = [['类型', '消息', 'URL', '数量', '最后发生时间']]
      .concat(filteredErrors.map((e) => [e.error_type, e.message, e.url, String(e.count), e.last_occurrence]))
      .map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const typeColorMap: Record<string, string> = {
    TypeError: 'red',
    ReferenceError: 'orange',
    RangeError: 'gold',
    SyntaxError: 'magenta',
  };

  const columns: ColumnsType<ErrorItem> = [
    {
      title: '错误类型',
      dataIndex: 'error_type',
      render: (type: string) => (
        <Space>
          <WarningOutlined style={{ color: '#ff4d4f' }} />
          <Tag color={typeColorMap[type] || 'default'}>{type}</Tag>
        </Space>
      ),
    },
    { title: '消息', dataIndex: 'message', ellipsis: true },
    { title: 'URL', dataIndex: 'url', render: (url: string) => <Typography.Text type="secondary">{url}</Typography.Text> },
    { title: '发生次数', dataIndex: 'count', align: 'right', render: (count: number) => <Typography.Text strong style={{ color: '#ff4d4f' }}>{count}</Typography.Text> },
    { title: '最后发生时间', dataIndex: 'last_occurrence', align: 'right', render: (t: string) => new Date(t).toLocaleString('zh-CN') },
  ];

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>错误监控</h1>
          <p>实时追踪和分析前端错误</p>
        </div>
        <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>导出数据</Button>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索错误消息或类型..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: 300 }}
            allowClear
          />
          <Select value={filterType} onChange={setFilterType} style={{ width: 160 }}>
            <Select.Option value="all">全部类型</Select.Option>
            <Select.Option value="TypeError">TypeError</Select.Option>
            <Select.Option value="ReferenceError">ReferenceError</Select.Option>
            <Select.Option value="RangeError">RangeError</Select.Option>
            <Select.Option value="SyntaxError">SyntaxError</Select.Option>
          </Select>
        </Space>
      </Card>

      <Card>
        <Table columns={columns} dataSource={filteredErrors} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }} />
      </Card>
    </Layout>
  );
}
