import { useState, useEffect } from 'react';
import { Table, Card, Tag, Input, Select, Button, Row, Col, Statistic, Space, Spin, Empty, DatePicker } from 'antd';
import { ApiOutlined, ClockCircleOutlined, CheckCircleOutlined, DownloadOutlined, SearchOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import Layout from '../components/Layout';
import axios from 'axios';
import dayjs from 'dayjs';
import { useProject } from '../context/ProjectContext';

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
  const { currentProject, loading: projectLoading } = useProject();
  const [requests, setRequests] = useState<ApiRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(7, 'day'), dayjs()]);
  const [stats, setStats] = useState({ totalCount: 0, avgDuration: 0, successRate: '0' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  useEffect(() => {
    if (!currentProject) return;

    const fetchData = async () => {
      const startDate = dateRange[0].format('YYYY-MM-DD');
      const endDate = dateRange[1].format('YYYY-MM-DD');
      
      try {
        // 并行请求统计数据和列表数据
        const [statsRes, listRes] = await Promise.all([
          axios.get('/api/v1/api-requests/stats', { 
            params: { projectId: currentProject.id, startDate, endDate } 
          }),
          axios.get('/api/v1/api-requests', { 
            params: { 
              projectId: currentProject.id, 
              startDate, 
              endDate, 
              page: pagination.current, 
              pageSize: pagination.pageSize,
              search: searchTerm,
              method: filterMethod,
              status: filterStatus
            } 
          })
        ]);
        
        // 更新统计数据（适配标准响应格式）
        setStats({
          totalCount: statsRes.data.data?.totalCount || 0,
          avgDuration: statsRes.data.data?.avgDuration || 0,
          successRate: statsRes.data.data?.successRate || '0',
        });
        
        // 更新列表数据（适配标准响应格式）
        const apiRequests = listRes.data.data?.result || listRes.data.data?.requests || listRes.data.data || [];
        setRequests(apiRequests.map((item: Record<string, unknown>, index: number) => ({
          id: String(item.id) || `api-${index}`,
          url: String(item.url || item.data?.url || ''),
          method: String(item.method || item.data?.method || 'GET'),
          statusCode: Number(item.status_code || item.statusCode || item.data?.statusCode || 0),
          duration: Number(item.duration || item.data?.duration || 0),
          success: Boolean(item.success || item.data?.success),
          timestamp: String(item.timestamp || item.created_at || new Date().toISOString()),
        })));
        
        // 更新分页总数
        setPagination(prev => ({ ...prev, total: listRes.data.data?.total || 0 }));
      } catch (error) {
        console.error('Failed to fetch API requests:', error);
        setRequests([]);
        setStats({ totalCount: 0, avgDuration: 0, successRate: '0' });
        setPagination(prev => ({ ...prev, total: 0 }));
      }
    };
    fetchData();
  }, [currentProject, dateRange, pagination.current, pagination.pageSize, searchTerm, filterMethod, filterStatus]);

  const handleTableChange = (paginationInfo: { current: number; pageSize: number }) => {
    setPagination(paginationInfo);
  };

  useEffect(() => {
    setPagination(prev => ({ ...prev, current: 1 }));
  }, [searchTerm, filterMethod, filterStatus, dateRange]);

  if (projectLoading || !currentProject) {
    return (
      <Layout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
          <Spin size="large" />
        </div>
      </Layout>
    );
  }

  const handleExport = () => {
    const csv = [['URL', '方法', '状态码', '响应时间(ms)', '成功', '时间']]
      .concat(requests.map((r) => [r.url, r.method, String(r.statusCode), String(r.duration), String(r.success), r.timestamp]))
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
        <DatePicker.RangePicker
          value={dateRange}
          onChange={(dates) => {
            if (dates && dates.length === 2) {
              setDateRange([dates[0], dates[1]]);
            }
          }}
          style={{ width: 280 }}
          placeholder={['开始日期', '结束日期']}
          presets={[
            { label: '近7天', value: [dayjs().subtract(7, 'day'), dayjs()] },
            { label: '近30天', value: [dayjs().subtract(30, 'day'), dayjs()] },
          ]}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card><Statistic title="总请求数" value={stats.totalCount} prefix={<ApiOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card><Statistic title="平均响应时间" value={stats.avgDuration} suffix="ms" prefix={<ClockCircleOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card><Statistic title="成功率" value={stats.successRate} suffix="%" prefix={<CheckCircleOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
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
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleExport}>导出数据</Button>
        </Space>
      </Card>

      <Card>
        {requests.length === 0 ? (
          <Empty description="暂无API请求数据，请先上报数据" style={{ padding: '40px 0' }} />
        ) : (
          <Table 
            columns={columns} 
            dataSource={requests} 
            rowKey="id" 
            pagination={{ 
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true, 
              showTotal: (total) => `共 ${total} 条` 
            }}
            onChange={handleTableChange}
          />
        )}
      </Card>
    </Layout>
  );
}
