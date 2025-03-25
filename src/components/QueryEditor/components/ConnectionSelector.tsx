import React, { useState, useEffect } from 'react';
import { Select, Button, Tooltip, Space, Typography, Tag, Spin } from 'antd';
import { DatabaseOutlined, ReloadOutlined, PlusOutlined, DatabaseFilled } from '@ant-design/icons';
import { getApi } from '../../../utils/api';

const { Option } = Select;
const { Text } = Typography;

interface Connection {
  id: number;
  name: string;
  type: string;
  database?: string;
  host: string;
  port: number;
  username: string;
  status?: 'connected' | 'disconnected' | 'error';
}

interface ConnectionSelectorProps {
  connections: Connection[];
  selectedConnection?: number;
  selectedDatabase?: string;
  onConnectionChange: (connectionId: number) => void;
  onDatabaseChange: (database: string) => void;
  onAddConnection?: () => void;
  onRefreshConnections?: () => void;
  isLoading?: boolean;
}

const ConnectionSelector: React.FC<ConnectionSelectorProps> = ({
  connections,
  selectedConnection,
  selectedDatabase,
  onConnectionChange,
  onDatabaseChange,
  onAddConnection,
  onRefreshConnections,
  isLoading = false,
}) => {
  const [currentConnection, setCurrentConnection] = useState<number | undefined>(selectedConnection);
  const [currentDatabase, setCurrentDatabase] = useState<string | undefined>(selectedDatabase);
  const [databaseList, setDatabaseList] = useState<string[]>([]);
  const [loadingDatabases, setLoadingDatabases] = useState<boolean>(false);

  // 当外部传入的selectedConnection改变时更新本地状态
  useEffect(() => {
    if (selectedConnection !== currentConnection) {
      setCurrentConnection(selectedConnection);
    }
  }, [selectedConnection]);

  // 当外部传入的selectedDatabase改变时更新本地状态
  useEffect(() => {
    if (selectedDatabase !== currentDatabase) {
      setCurrentDatabase(selectedDatabase);
    }
  }, [selectedDatabase]);

  // 当连接变化时，获取该连接下的数据库列表
  useEffect(() => {
    if (currentConnection) {
      fetchDatabases(currentConnection);
    }
  }, [currentConnection]);

  // 获取连接下的数据库列表
  const fetchDatabases = async (connectionId: number) => {
    setLoadingDatabases(true);
    try {
      const api = getApi();
      const response = await api.get(`/connections/${connectionId}/databases`);
      
      if (response.data && response.data.success) {
        const databases = response.data.data || [];
        setDatabaseList(databases);
        
        // 如果没有选择数据库或当前选择的数据库不在新的列表中，自动选择第一个
        if (!currentDatabase || !databases.includes(currentDatabase)) {
          if (databases.length > 0) {
            setCurrentDatabase(databases[0]);
            onDatabaseChange(databases[0]);
          } else {
            setCurrentDatabase(undefined);
          }
        }
      } else {
        console.error('获取数据库列表失败:', response.data?.message || '未知错误');
        setDatabaseList([]);
      }
    } catch (error) {
      console.error('获取数据库列表出错:', error);
      setDatabaseList([]);
    } finally {
      setLoadingDatabases(false);
    }
  };

  // 处理连接变更
  const handleConnectionChange = (value: number) => {
    setCurrentConnection(value);
    onConnectionChange(value);
    // 连接变化时清空当前数据库选择，由useEffect中获取数据库列表后再设置
    setCurrentDatabase(undefined);
  };

  // 处理数据库变更
  const handleDatabaseChange = (value: string) => {
    setCurrentDatabase(value);
    onDatabaseChange(value);
  };

  // 获取连接类型图标
  const getConnectionIcon = (type: string) => {
    // 根据不同的数据库类型显示不同颜色
    const colorMap: Record<string, string> = {
      mysql: '#4479A1',
      postgresql: '#336791',
      mongodb: '#4DB33D',
      sqlserver: '#CC2927',
      oracle: '#F80000',
      sqlite: '#0F80CC',
    };

    return (
      <DatabaseOutlined style={{ color: colorMap[type.toLowerCase()] || '#1890ff' }} />
    );
  };

  // 获取连接状态标签
  const getStatusTag = (status?: string) => {
    if (!status) return null;
    
    const statusConfig: Record<string, { color: string; text: string }> = {
      connected: { color: 'success', text: '已连接' },
      disconnected: { color: 'default', text: '未连接' },
      error: { color: 'error', text: '错误' }
    };
    
    const config = statusConfig[status] || statusConfig.disconnected;
    
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  // 处理刷新数据库列表
  const handleRefreshDatabases = () => {
    if (currentConnection) {
      fetchDatabases(currentConnection);
    }
  };

  return (
    <div className="connection-selector">
      <Space>
        <Text type="secondary">数据库连接:</Text>
        <Select 
          placeholder="选择数据库连接"
          style={{ width: 240 }}
          value={currentConnection}
          onChange={handleConnectionChange}
          loading={isLoading}
          disabled={isLoading}
        >
          {connections.map(conn => (
            <Option key={conn.id} value={conn.id}>
              <Space>
                {getConnectionIcon(conn.type)}
                <span>{conn.name}</span>
                {getStatusTag(conn.status)}
              </Space>
            </Option>
          ))}
        </Select>
        
        <Text type="secondary">数据库:</Text>
        <Select
          placeholder="选择数据库"
          style={{ width: 180 }}
          value={currentDatabase}
          onChange={handleDatabaseChange}
          disabled={!currentConnection || loadingDatabases}
          notFoundContent={loadingDatabases ? <Spin size="small" /> : "无可用数据库"}
          showSearch
          optionFilterProp="children"
        >
          {databaseList.map(db => (
            <Option key={db} value={db}>
              <Space>
                <DatabaseFilled style={{ color: '#1890ff' }} />
                <span>{db}</span>
              </Space>
            </Option>
          ))}
        </Select>
        
        <Tooltip title="刷新数据库列表">
          <Button 
            icon={<ReloadOutlined />}
            onClick={handleRefreshDatabases}
            loading={loadingDatabases}
            disabled={!currentConnection}
          />
        </Tooltip>
        
        {onRefreshConnections && (
          <Tooltip title="刷新连接">
            <Button 
              icon={<ReloadOutlined />}
              onClick={onRefreshConnections}
              loading={isLoading}
            />
          </Tooltip>
        )}
        
        {onAddConnection && (
          <Tooltip title="添加新连接">
            <Button 
              icon={<PlusOutlined />}
              onClick={onAddConnection}
            />
          </Tooltip>
        )}
      </Space>
    </div>
  );
};

export default ConnectionSelector; 