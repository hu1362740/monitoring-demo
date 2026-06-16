import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Modal,
  Form,
  Input,
  message,
  Space,
  Tag,
  Popconfirm,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ReloadOutlined,
  KeyOutlined,
} from '@ant-design/icons';
import Layout from '../components/Layout';
import axios from 'axios';

interface Project {
  id: string;
  name: string;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
}

export default function Projects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/v1/projects');
      const projectsData = (response.data.projects || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        apiKey: item.api_key || item.apiKey || '',
        createdAt: item.created_at || item.createdAt || '',
        updatedAt: item.updated_at || item.updatedAt || '',
      }));
      setProjects(projectsData);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      message.error('获取项目列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = () => {
    setEditingProject(null);
    form.resetFields();
    setVisible(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue({
      name: project.name,
    });
    setVisible(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      if (editingProject) {
        await axios.put(`/api/v1/projects/${editingProject.id}`, values);
        message.success('项目更新成功');
      } else {
        await axios.post('/api/v1/projects', values);
        message.success('项目创建成功');
      }
      setVisible(false);
      fetchProjects();
    } catch (error) {
      console.error('Failed to save project:', error);
      message.error('保存失败');
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      await axios.delete(`/api/v1/projects/${projectId}`);
      message.success('项目删除成功');
      fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
      message.error('删除失败');
    }
  };

  const handleRegenerateApiKey = async (projectId: string) => {
    try {
      const response = await axios.post(`/api/v1/projects/${projectId}/regenerate-api-key`);
      setProjects(projects.map(p => 
        p.id === projectId ? { ...p, apiKey: response.data.apiKey } : p
      ));
      message.success('API Key 已重新生成');
    } catch (error) {
      console.error('Failed to regenerate API key:', error);
      message.error('重新生成失败');
    }
  };

  const copyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    message.success('已复制到剪贴板');
  };

  const columns = [
    {
      title: '项目名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'API Key',
      dataIndex: 'apiKey',
      key: 'apiKey',
      width: 320,
      render: (apiKey: string) => (
        <Space>
          <code style={{ fontSize: 12, color: '#1890ff', wordBreak: 'break-all' }}>
            {apiKey && apiKey.length >= 16 
              ? `${apiKey.slice(0, 8)}****${apiKey.slice(-8)}` 
              : (apiKey || '-')}
          </code>
          {apiKey && (
            <Tooltip title="复制完整 API Key">
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={() => copyApiKey(apiKey)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record: Project) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="text"
            icon={<KeyOutlined />}
            onClick={() => handleRegenerateApiKey(record.id)}
            title="重新生成 API Key"
          >
            重置 Key
          </Button>
          <Popconfirm
            title="确定删除该项目吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="text" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Layout>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>项目管理</h1>
          <p>管理您的监控项目和 API Key</p>
        </div>
        <Space>
          <Button
            type="default"
            icon={<ReloadOutlined />}
            onClick={fetchProjects}
            loading={loading}
          >
            刷新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            创建项目
          </Button>
        </Space>
      </div>

      <Card>
        <Table
          dataSource={projects}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          bordered={false}
          emptyText={
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'rgba(0,0,0,0.45)' }}>暂无项目</p>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} style={{ marginTop: 16 }}>
                创建第一个项目
              </Button>
            </div>
          }
        />
      </Card>

      <Modal
        title={editingProject ? '编辑项目' : '创建新项目'}
        open={visible}
        onCancel={() => setVisible(false)}
        onOk={handleSave}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="项目名称"
            rules={[{ required: true, message: '请输入项目名称' }]}
          >
            <Input placeholder="例如：我的电商项目" />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}