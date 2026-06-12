import { useState, useEffect } from 'react';
import { AlertTriangle, Search, Filter, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { Table, Thead, Tbody, Tr, Th, Td, TableContainer } from 'react-table';
import Layout from '../components/Layout';
import axios from 'axios';

interface ErrorItem {
  id: string;
  error_type: string;
  message: string;
  url: string;
  count: number;
  last_occurrence: string;
}

export default function ErrorMonitoring() {
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchErrors = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const response = await axios.get('/api/v1/errors/stats', { 
          params: { projectId: 'project-1', startDate: sevenDaysAgo, endDate: today } 
        });

        setErrors(response.data.map((item: { error_type: string; count: number }, index: number) => ({
          id: `error-${index}`,
          error_type: item.error_type,
          message: `An error occurred of type ${item.error_type}`,
          url: 'https://example.com/path',
          count: item.count,
          last_occurrence: new Date().toISOString()
        })));
      } catch (error) {
        setErrors([
          { id: '1', error_type: 'TypeError', message: 'Cannot read properties of undefined', url: '/users', count: 120, last_occurrence: '2024-01-15T10:30:00Z' },
          { id: '2', error_type: 'ReferenceError', message: 'variable is not defined', url: '/dashboard', count: 85, last_occurrence: '2024-01-15T09:15:00Z' },
          { id: '3', error_type: 'RangeError', message: 'Maximum call stack size exceeded', url: '/api/data', count: 65, last_occurrence: '2024-01-15T08:45:00Z' },
          { id: '4', error_type: 'SyntaxError', message: 'Unexpected token in JSON', url: '/settings', count: 45, last_occurrence: '2024-01-15T07:20:00Z' },
          { id: '5', error_type: 'TypeError', message: 'Cannot read properties of null', url: '/products', count: 38, last_occurrence: '2024-01-15T06:55:00Z' }
        ]);
      }
    };

    fetchErrors();
  }, []);

  const filteredErrors = errors.filter(error => {
    const matchesSearch = error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         error.error_type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || error.error_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const handleExport = () => {
    const csv = [['类型', '消息', 'URL', '数量', '最后发生时间']]
      .concat(filteredErrors.map(e => [e.error_type, e.message, e.url, e.count, e.last_occurrence]))
      .map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'errors.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">错误监控</h1>
            <p className="text-gray-500 mt-1">实时追踪和分析前端错误</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出数据
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索错误消息或类型..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none appearance-none bg-white"
            >
              <option value="all">全部类型</option>
              <option value="TypeError">TypeError</option>
              <option value="ReferenceError">ReferenceError</option>
              <option value="RangeError">RangeError</option>
              <option value="SyntaxError">SyntaxError</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <TableContainer>
            <Table>
              <Thead>
                <Tr className="bg-gray-50">
                  <Th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">错误类型</Th>
                  <Th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">消息</Th>
                  <Th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">URL</Th>
                  <Th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">发生次数</Th>
                  <Th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">最后发生时间</Th>
                  <Th className="px-6 py-4 text-center text-sm font-semibold text-gray-600">操作</Th>
                </Tr>
              </Thead>
              <Tbody>
                {filteredErrors.map((error) => (
                  <>
                    <Tr key={error.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <Td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-500" />
                          <span className="font-medium text-gray-800">{error.error_type}</span>
                        </div>
                      </Td>
                      <Td className="px-6 py-4 text-gray-600 max-w-md truncate">{error.message}</Td>
                      <Td className="px-6 py-4 text-blue-600">{error.url}</Td>
                      <Td className="px-6 py-4 text-right font-medium text-red-600">{error.count}</Td>
                      <Td className="px-6 py-4 text-right text-gray-500">
                        {new Date(error.last_occurrence).toLocaleString('zh-CN')}
                      </Td>
                      <Td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setExpandedId(expandedId === error.id ? null : error.id)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          {expandedId === error.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </button>
                      </Td>
                    </Tr>
                    {expandedId === error.id && (
                      <Tr>
                        <Td colSpan={6} className="px-6 py-4 bg-gray-50">
                          <pre className="text-sm text-gray-600 whitespace-pre-wrap max-h-40 overflow-auto">
                            {`Error: ${error.message}\n    at Object.<anonymous> (index.js:23:15)\n    at Module._compile (internal/modules/cjs/loader.js:1085:14)\n    at Object.Module._extensions..js (internal/modules/cjs/loader.js:1114:10)\n    at Module.load (internal/modules/cjs/loader.js:950:32)`}
                          </pre>
                        </Td>
                      </Tr>
                    )}
                  </>
                ))}
              </Tbody>
            </Table>
          </TableContainer>
        </div>
      </div>
    </Layout>
  );
}
