import { useState, useEffect } from 'react';
import { Table, Card, Tag, Input, Select, Button, Space, Typography, Spin, DatePicker, Tooltip } from 'antd';
import { WarningOutlined, SearchOutlined, DownloadOutlined, CalendarOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
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

const { RangePicker } = DatePicker;

export default function ErrorMonitoring() {
  const { currentProject, loading: projectLoading } = useProject();
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(false);
  
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(() => {
    // 默认设置为近7天
    const endDate = dayjs();
    const startDate = dayjs().subtract(7, 'day');
    return [startDate, endDate];
  });

  const presets = [
    {
      label: '近7天',
      value: () => {
        const end = dayjs();
        const start = dayjs().subtract(7, 'day');
        return [start, end] as [dayjs.Dayjs, dayjs.Dayjs];
      },
    },
    {
      label: '近30天',
      value: () => {
        const end = dayjs();
        const start = dayjs().subtract(30, 'day');
        return [start, end] as [dayjs.Dayjs, dayjs.Dayjs];
      },
    },
    {
      label: '近90天',
      value: () => {
        const end = dayjs();
        const start = dayjs().subtract(90, 'day');
        return [start, end] as [dayjs.Dayjs, dayjs.Dayjs];
      },
    },
  ];

  const fetchErrors = async () => {
    if (!currentProject) return;
    
    setLoading(true);
    try {
      let startDate: string;
      let endDate: string;

      if (dateRange && dateRange[0] && dateRange[1]) {
        startDate = dateRange[0].format('YYYY-MM-DD');
        endDate = dateRange[1].format('YYYY-MM-DD');
      } else {
        endDate = dayjs().format('YYYY-MM-DD');
        startDate = dayjs().subtract(7, 'day').format('YYYY-MM-DD');
      }

      const params: Record<string, string> = {
        projectId: currentProject.id,
        startDate,
        endDate,
      };

      if (searchTerm.trim()) {
        params.message = searchTerm.trim();
      }

      if (filterType && filterType !== 'all') {
        params.errorType = filterType;
      }

      const response = await axios.get('/api/v1/errors/stats', { params });
      
      const errorData = response.data.data || [];
      if (errorData.length > 0) {
        setErrors(errorData.map((item: { error_type: string; message: string; url: string; count: number; last_occurrence: string }, index: number) => ({
          id: `error-${index}`,
          error_type: item.error_type,
          message: item.message || `An error occurred of type ${item.error_type}`,
          url: item.url || 'https://example.com/path',
          count: item.count,
          last_occurrence: item.last_occurrence || new Date().toISOString(),
        })));
      } else {
        setErrors([]);
      }
    } catch (error) {
      console.error('Failed to fetch errors:', error);
      setErrors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentProject) {
      fetchErrors();
    }
  }, [currentProject, dateRange]);

  const handleDateRangeChange = (dates: [dayjs.Dayjs, dayjs.Dayjs] | null) => {
    setDateRange(dates);
  };

  const handleSearch = () => {
    fetchErrors();
  };

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
      width: 140,
      render: (type: string) => (
        <Space>
          <WarningOutlined style={{ color: '#ff4d4f' }} />
          <Tag color={typeColorMap[type] || 'default'}>{type}</Tag>
        </Space>
      ),
    },
    {
      title: '消息',
      dataIndex: 'message',
      width: 300,
      render: (message: string) => (
        <Tooltip placement="topLeft" title={message}>
          <div
            style={{
              maxWidth: 280,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {message}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'URL',
      dataIndex: 'url',
      width: 250,
      render: (url: string) => (
        <Tooltip placement="topLeft" title={url}>
          <Typography.Text
            type="secondary"
            ellipsis
            style={{ maxWidth: 230, display: 'inline-block', verticalAlign: 'middle' }}
          >
            {url}
          </Typography.Text>
        </Tooltip>
      ),
    },
    { title: '发生次数', dataIndex: 'count', width: 100, align: 'right', render: (count: number) => <Typography.Text strong style={{ color: '#ff4d4f' }}>{count}</Typography.Text> },
    { title: '最后发生时间', dataIndex: 'last_occurrence', width: 170, align: 'right', render: (t: string) => new Date(t).toLocaleString('zh-CN') },
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
          
          <RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            placeholder={['开始日期', '结束日期']}
            prefixIcon={<CalendarOutlined />}
            style={{ width: 300 }}
            presets={presets}
          />
          
          <Button type="primary" onClick={handleSearch}>查询</Button>
        </Space>
      </Card>

      <Card>
        <Table columns={columns} dataSource={filteredErrors} rowKey="id" loading={loading} pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `共 ${total} 条` }} />
      </Card>
    </Layout>
  );
}
