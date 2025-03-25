import { useState } from 'react';
import { Table, Tabs, Empty, Spin, Typography, Space, Button } from 'antd';
import { FileExcelOutlined, CopyOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';
import './style.css';

const { Title, Text } = Typography;

// 自定义空数据组件
const NoDataComponent = () => (
  <div className="no-data-container">
    <div className="no-data-icon">
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 15V45M15 30H45" stroke="#CCCCCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <rect x="10" y="10" width="40" height="40" rx="5" stroke="#CCCCCC" strokeWidth="2"/>
      </svg>
    </div>
    <div className="no-data-text">暂无数据</div>
  </div>
);

// 模拟查询结果数据
const mockQueryResult = {
  success: true,
  message: '查询成功',
  duration: 0.015,
  affectedRows: 0,
  columns: [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '年龄', dataIndex: 'age', key: 'age' },
    { title: '邮箱', dataIndex: 'email', key: 'email' },
    { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
  ],
  data: Array(20).fill(0).map((_, i) => ({
    key: i,
    id: i + 1,
    name: `用户 ${i + 1}`,
    age: Math.floor(Math.random() * 50) + 18,
    email: `user${i + 1}@example.com`,
    createdAt: new Date().toISOString(),
  })),
};

const ResultPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('result');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(mockQueryResult);

  const handleExport = () => {
    // 实现导出功能
  };

  const handleCopy = () => {
    // 实现复制数据功能
  };

  const items: TabsProps['items'] = [
    {
      key: 'result',
      label: '结果',
      children: loading ? (
        <div className="result-loading">
          <Spin tip="执行查询中..." />
        </div>
      ) : result.data.length > 0 ? (
        <div className="result-content">
          <div className="result-header">
            <Space direction="vertical" size={0}>
              <Text type="secondary">
                查询耗时: {result.duration}s | 影响行数: {result.affectedRows} | 返回行数: {result.data.length}
              </Text>
            </Space>
            <Space>
              <Button icon={<FileExcelOutlined />} onClick={handleExport}>
                导出
              </Button>
              <Button icon={<CopyOutlined />} onClick={handleCopy}>
                复制
              </Button>
            </Space>
          </div>
          <Table 
            columns={result.columns} 
            dataSource={result.data} 
            pagination={{ pageSize: 50 }}
            size="small"
            scroll={{ x: 'max-content', y: 'calc(100vh - 350px)' }}
          />
        </div>
      ) : (
        <NoDataComponent />
      ),
    },
    {
      key: 'message',
      label: '消息',
      children: (
        <div className="message-tab">
          <pre>
            {result.success 
              ? `查询成功。\n耗时: ${result.duration}s\n影响行数: ${result.affectedRows}`
              : `查询失败。\n${result.message}`}
          </pre>
        </div>
      ),
    },
  ];

  const onTabChange = (key: string) => {
    setActiveTab(key);
  };

  return (
    <div className="result-panel">
      <Tabs activeKey={activeTab} items={items} onChange={onTabChange} />
    </div>
  );
};

export default ResultPanel; 