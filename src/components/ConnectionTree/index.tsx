import { useEffect, useState, useRef, useCallback } from 'react';
import { Tree, message, Spin, Empty, Button, Tooltip } from 'antd';
import {
  DatabaseOutlined,
  TableOutlined,
  FolderOutlined,
  FileOutlined,
  ReloadOutlined,
  LoadingOutlined,
  PlusOutlined,
  DisconnectOutlined,
  LinkOutlined,
  CloudServerOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  StarOutlined,
  SettingOutlined,
  SearchOutlined,
  SyncOutlined,
  CloseOutlined
} from '@ant-design/icons';
import type { DataNode, TreeProps } from 'antd/es/tree';
import ConnectionService, { ConnectionResponse } from '../../services/connectionService';
import ContextMenu, { ContextMenuItem } from '../ContextMenu';
import TableDesigner from '../TableDesigner';
import './style.css';
import ConnectionManager from '../../utils/connectionManager';

// 树节点接口
interface TreeNodeInterface extends DataNode {
  connectionId?: number;
  databaseName?: string;
  tableName?: string;
  nodeType?: 'connection' | 'database' | 'tableFolder' | 'viewFolder' | 'functionFolder' | 'eventFolder' | 'table' | 'view' | 'function' | 'event';
  isConnected?: boolean;
  children?: TreeNodeInterface[];
}

export interface ConnectionTreeProps {
  connections: ConnectionResponse[];
  onSelectConnection?: (connection: ConnectionResponse) => void;
  onSelectDatabase?: (database: string, connectionId: string) => void;
  onSelectTable?: (table: string, database: string, connectionId: string) => void;
  onAddConnection?: () => void;
  currentConnection?: any;
  currentDatabase?: string | null;
  currentTable?: string | null;
  onConnectionChange?: () => void;
  onShowTableDesigner?: (info: { connectionId: number; databaseName: string; databaseType: string }) => void;
}

// 定义表单数据的接口
interface CreateDatabaseFormData {
  databaseName: string;
  charset?: string;
  collation?: string;
  sqlPreview?: string;
}

const ConnectionTree: React.FC<ConnectionTreeProps> = ({
  onSelectConnection,
  onSelectDatabase,
  onSelectTable,
  onAddConnection,
  currentConnection,
  currentDatabase,
  currentTable,
  onConnectionChange,
  onShowTableDesigner
}) => {
  // 状态管理
  const [treeData, setTreeData] = useState<TreeNodeInterface[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [connectingIds, setConnectingIds] = useState<number[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<React.Key[]>([]);
  
  // 缓存
  const [connections, setConnections] = useState<ConnectionResponse[]>([]);
  
  // 请求锁，避免重复请求
  const requestLock = useRef<Record<string, boolean>>({});

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    node: TreeNodeInterface | null;
    items: ContextMenuItem[];
  }>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
    items: []
  });

  // 初始化连接数据
  useEffect(() => {
    loadConnections();
  }, []);

  // 使用props同步树节点的选中状态
  useEffect(() => {
    if (currentConnection && currentDatabase) {
      // 构建数据库节点的key
      const dbKey = `conn-${currentConnection.id}-db-${currentDatabase}`;
      const tablesFolder = `conn-${currentConnection.id}-db-${currentDatabase}-tables`;
      
      // 如果还有选中的表，则构建表节点的key
      if (currentTable) {
        const tableKey = `conn-${currentConnection.id}-db-${currentDatabase}-table-${currentTable}`;
        setSelectedKeys([tableKey]);
        
        // 确保表所在的文件夹节点和数据库节点都是展开的
        setExpandedKeys(prev => {
          const newKeys = [...prev];
          if (!newKeys.includes(dbKey)) newKeys.push(dbKey);
          if (!newKeys.includes(tablesFolder)) newKeys.push(tablesFolder);
          return newKeys;
        });
      } else {
        // 只选择了数据库，则设置数据库节点为选中状态
        setSelectedKeys([dbKey]);
        
        // 确保数据库节点是展开的，并且表文件夹也是展开的
        setExpandedKeys(prev => {
          const newKeys = [...prev];
          if (!newKeys.includes(dbKey)) newKeys.push(dbKey);
          // 尝试自动展开表文件夹
          if (!newKeys.includes(tablesFolder)) newKeys.push(tablesFolder);
          return newKeys;
        });
      }
    }
  }, [currentConnection, currentDatabase, currentTable]);

  // 加载连接列表
  const loadConnections = async () => {
    // 防止重复请求
    if (requestLock.current['connections']) {
      console.log('连接列表正在加载中，跳过重复请求');
      return;
    }
    
    requestLock.current['connections'] = true;
    setLoading(true);
    
    try {
      console.log('加载连接列表...');
      const connectionList = await ConnectionService.getConnections();
      console.log(`获取到 ${connectionList.length} 个连接`);
      setConnections(connectionList);
      
      // 构建连接节点
      const connectionNodes: TreeNodeInterface[] = connectionList.map(conn => {
        const isConnected = ConnectionService.isConnected(conn.id);
        return {
          key: `conn-${conn.id}`,
          title: conn.name,
          icon: <CloudServerOutlined style={{ color: isConnected ? '#52c41a' : undefined }} />,
          isLeaf: false,
          connectionId: conn.id,
          isConnected,
          nodeType: 'connection',
          className: 'connection-node'
        };
      });
      
      setTreeData(connectionNodes);
    } catch (error) {
      console.error('加载连接列表失败:', error);
      message.error('加载连接列表失败');
    } finally {
      setLoading(false);
      requestLock.current['connections'] = false;
    }
  };

  // 连接数据库
  const connectToDatabase = async (connectionId: number) => {
    const lockKey = `connect-${connectionId}`;
    if (requestLock.current[lockKey]) {
      console.log(`连接 ${connectionId} 正在连接中，跳过重复请求`);
      return;
    }
    
    requestLock.current[lockKey] = true;
    setConnectingIds(prev => [...prev, connectionId]);
    
    try {
      console.log(`连接数据库 ${connectionId}...`);
      const result = await ConnectionService.openConnection(connectionId);
      
      if (result.success) {
        // 保存到全局连接管理器
        ConnectionManager.setActiveConnectionId(connectionId);
        
        // 查找连接对象以保存更多信息
        const connection = connections.find(c => c.id === connectionId);
        if (connection) {
          ConnectionManager.saveConnectionInfo({
            id: connection.id,
            name: connection.name,
            type: connection.type,
            host: connection.host,
            port: connection.port
          });
        }
        
        message.success('连接成功');
        
        // 加载数据库列表
        const databases = await loadDatabases(connectionId);
        
        // 更新连接节点状态和数据库列表
        setTreeData(prevData => 
          prevData.map(node => {
            if (node.connectionId === connectionId) {
              return {
                ...node,
                isConnected: true,
                icon: <CloudServerOutlined style={{ color: '#52c41a' }} />,
                children: databases
              };
            }
            return node;
          })
        );
        
        // 自动展开连接节点
        setExpandedKeys(prev => {
          const connKey = `conn-${connectionId}`;
          if (!prev.includes(connKey)) {
            return [...prev, connKey];
          }
          return prev;
        });
        
        return true;
      } else {
        message.error(`连接失败: ${result.message}`);
        return false;
      }
    } catch (error) {
      console.error('连接数据库失败:', error);
      message.error('连接数据库失败');
      return false;
    } finally {
      setConnectingIds(prev => prev.filter(id => id !== connectionId));
      requestLock.current[lockKey] = false;
    }
  };

  // 断开数据库连接
  const disconnectDatabase = async (connectionId: number) => {
    const lockKey = `disconnect-${connectionId}`;
    if (requestLock.current[lockKey]) {
      return;
    }
    
    requestLock.current[lockKey] = true;
    
    try {
      console.log(`断开数据库 ${connectionId} 连接...`);
      const result = await ConnectionService.closeConnection(connectionId);
      
      if (result) {
        // 如果断开的是当前活动连接，清除全局存储
        const activeId = ConnectionManager.getActiveConnectionId();
        if (activeId && parseInt(activeId) === connectionId) {
          ConnectionManager.clearConnectionInfo(connectionId);
        }
        
      message.success('已断开连接');
      
      // 更新连接节点状态
      setTreeData(prevData => {
        function updateNode(nodes: TreeNodeInterface[]): TreeNodeInterface[] {
          return nodes.map(node => {
            if (node.connectionId === connectionId) {
              const newNode = {
                ...node,
                isConnected: false,
                icon: <CloudServerOutlined />,
                children: undefined // 移除子节点
              };
              return newNode;
            }
            if (node.children) {
              return {
                ...node,
                children: updateNode(node.children)
              };
            }
            return node;
          });
        }
        
        return updateNode(prevData);
      });
      
      // 移除对应的展开键
      setExpandedKeys(prevKeys => 
        prevKeys.filter(key => !key.toString().startsWith(`conn-${connectionId}`))
      );
      
        // 如果有回调，通知外部
        if (onConnectionChange) {
          onConnectionChange();
        }
      } else {
        message.error('断开连接失败');
      }
    } catch (error) {
      console.error('断开连接失败:', error);
      message.error('断开连接失败');
    } finally {
      requestLock.current[lockKey] = false;
    }
  };

  // 加载数据库列表
  const loadDatabases = async (connectionId: number): Promise<TreeNodeInterface[]> => {
    const lockKey = `databases-${connectionId}`;
    if (requestLock.current[lockKey]) {
      console.log(`正在加载数据库列表，跳过重复请求`);
      return [];
    }
    
    requestLock.current[lockKey] = true;
    
    try {
      console.log(`加载连接 ${connectionId} 的数据库列表...`);
      const databases = await ConnectionService.getDatabases(connectionId);
      console.log(`获取到 ${databases.length} 个数据库`);
      
      return databases.map((dbName, index) => ({
        key: `conn-${connectionId}-db-${dbName}`,
        title: dbName,
        icon: <DatabaseOutlined />,
        isLeaf: false,
        connectionId,
        databaseName: dbName,
        nodeType: 'database',
        className: 'database-node'
      }));
    } catch (error) {
      console.error('加载数据库列表失败:', error);
      message.error('加载数据库列表失败');
      return [];
    } finally {
      requestLock.current[lockKey] = false;
    }
  };

  // 加载数据库对象（表、视图、函数、事件）
  const loadDatabaseObjects = async (connectionId: number, databaseName: string): Promise<TreeNodeInterface[]> => {
    const lockKey = `db-objects-${connectionId}-${databaseName}`;
    if (requestLock.current[lockKey]) {
      console.log(`正在加载数据库对象，跳过重复请求`);
      return [];
    }
    
    requestLock.current[lockKey] = true;
    
    try {
      console.log(`加载数据库 ${databaseName} 的对象列表...`);
      
      // 并行加载所有类型的对象
      const [tables, views, functions, events] = await Promise.all([
        loadTablesForDatabase(connectionId, databaseName),
        loadViewsForDatabase(connectionId, databaseName),
        loadFunctionsForDatabase(connectionId, databaseName),
        loadEventsForDatabase(connectionId, databaseName)
      ]);
      
      const objects: TreeNodeInterface[] = [];
      
      // 添加表文件夹
      objects.push({
        key: `conn-${connectionId}-db-${databaseName}-tables`,
        title: '表',
        icon: <FolderOutlined style={{ color: '#52c41a' }} />,
        isLeaf: false,
        connectionId,
        databaseName,
        nodeType: 'tableFolder',
        className: 'table-folder-node',
        children: tables
      });
      
      // 添加视图文件夹
        objects.push({
          key: `conn-${connectionId}-db-${databaseName}-views`,
          title: '视图',
          icon: <FolderOutlined style={{ color: '#722ed1' }} />,
          isLeaf: false,
          connectionId,
          databaseName,
          nodeType: 'viewFolder',
          className: 'view-folder-node',
          children: views
        });
      
      // 添加函数文件夹
        objects.push({
          key: `conn-${connectionId}-db-${databaseName}-functions`,
          title: '函数',
          icon: <FolderOutlined style={{ color: '#1890ff' }} />,
          isLeaf: false,
          connectionId,
          databaseName,
          nodeType: 'functionFolder',
          className: 'function-folder-node',
          children: functions
        });
      
      // 添加事件文件夹
        objects.push({
          key: `conn-${connectionId}-db-${databaseName}-events`,
          title: '事件',
          icon: <FolderOutlined style={{ color: '#fa8c16' }} />,
          isLeaf: false,
          connectionId,
          databaseName,
          nodeType: 'eventFolder',
          className: 'event-folder-node',
          children: events
        });
      
      return objects;
    } catch (error) {
      console.error('加载数据库对象失败:', error);
      message.error('加载数据库对象失败');
      return [];
    } finally {
      requestLock.current[lockKey] = false;
    }
  };

  // 加载表列表
  const loadTablesForDatabase = async (connectionId: number, databaseName: string): Promise<TreeNodeInterface[]> => {
    try {
      console.log(`加载数据库 ${databaseName} 的表...`);
      const tables = await ConnectionService.getTables(connectionId, databaseName);
      console.log(`获取到 ${tables.length} 个表`);
      
      // 如果没有表，仍然返回一个空数组，让表文件夹可以显示
      if (tables.length === 0) {
        console.log(`数据库 ${databaseName} 没有表`);
      }
      
      return tables.map((tableName, index) => ({
        key: `conn-${connectionId}-db-${databaseName}-table-${tableName}`,
        title: tableName,
        icon: <TableOutlined />,
        isLeaf: true,
        connectionId,
        databaseName,
        tableName,
        nodeType: 'table',
        className: 'table-node'
      }));
    } catch (error) {
      console.error('加载表列表失败:', error);
      return [];
    }
  };

  // 加载视图列表
  const loadViewsForDatabase = async (connectionId: number, databaseName: string): Promise<TreeNodeInterface[]> => {
    try {
      console.log(`加载数据库 ${databaseName} 的视图...`);
      const views = await ConnectionService.getViews(connectionId, databaseName);
      console.log(`获取到 ${views.length} 个视图`);
      
      return views.map((viewName, index) => ({
        key: `conn-${connectionId}-db-${databaseName}-view-${viewName}`,
        title: viewName,
        icon: <FileOutlined style={{ color: '#722ed1' }} />,
        isLeaf: true,
        connectionId,
        databaseName,
        tableName: viewName,
        nodeType: 'view',
        className: 'view-node'
      }));
    } catch (error) {
      console.error('加载视图列表失败:', error);
      return [];
    }
  };

  // 加载函数列表
  const loadFunctionsForDatabase = async (connectionId: number, databaseName: string): Promise<TreeNodeInterface[]> => {
    try {
      console.log(`加载数据库 ${databaseName} 的函数...`);
      const functions = await ConnectionService.getFunctions(connectionId, databaseName);
      console.log(`获取到 ${functions.length} 个函数`);
      
      return functions.map((functionName, index) => ({
        key: `conn-${connectionId}-db-${databaseName}-function-${functionName}`,
        title: functionName,
        icon: <FileOutlined style={{ color: '#1890ff' }} />,
        isLeaf: true,
        connectionId,
        databaseName,
        tableName: functionName,
        nodeType: 'function',
        className: 'function-node'
      }));
    } catch (error) {
      console.error('加载函数列表失败:', error);
      return [];
    }
  };

  // 加载事件列表
  const loadEventsForDatabase = async (connectionId: number, databaseName: string): Promise<TreeNodeInterface[]> => {
    try {
      console.log(`加载数据库 ${databaseName} 的事件...`);
      const events = await ConnectionService.getEvents(connectionId, databaseName);
      console.log(`获取到 ${events.length} 个事件`);
      
      return events.map((eventName, index) => ({
        key: `conn-${connectionId}-db-${databaseName}-event-${eventName}`,
        title: eventName,
        icon: <FileOutlined style={{ color: '#fa8c16' }} />,
        isLeaf: true,
        connectionId,
        databaseName,
        tableName: eventName,
        nodeType: 'event',
        className: 'event-node'
      }));
    } catch (error) {
      console.error('加载事件列表失败:', error);
      return [];
    }
  };

  // 处理节点加载数据
  const onLoadData = (node: TreeNodeInterface): Promise<void> => {
    return new Promise<void>(async (resolve) => {
      const { key, connectionId, databaseName, nodeType, children } = node;
      
      // 如果节点已有子节点，不需要再加载
      if (children && children.length > 0) {
        console.log(`节点 ${key} 已有子节点，跳过加载`);
        resolve();
        return;
      }
      
      // 连接节点加载数据库列表
      if (nodeType === 'connection' && connectionId) {
        // 检查连接状态 - 确保从服务获取最新状态
        const isConnected = ConnectionService.isConnected(connectionId);
        
        if (!isConnected) {
          // 如果未连接，尝试连接
              const connected = await connectToDatabase(connectionId);
          if (!connected) {
              resolve();
            return;
          }
        }
        
        // 已连接，加载数据库列表
          const databases = await loadDatabases(connectionId);
          
          // 更新树节点
          setTreeData(prevData => {
            return prevData.map(item => {
              if (item.key === key) {
                return {
                  ...item,
                  children: databases,
                  isConnected: true,
                  icon: <CloudServerOutlined style={{ color: '#52c41a' }} />
                };
              }
              return item;
            });
          });
          
          resolve();
        return;
      }
      
      // 数据库节点加载表、视图等对象
      if (nodeType === 'database' && connectionId && databaseName) {
        const objects = await loadDatabaseObjects(connectionId, databaseName);
        
        // 更新树节点
        setTreeData(prev => {
          // 递归更新节点
          const updateNode = (nodes: TreeNodeInterface[]): TreeNodeInterface[] => {
            return nodes.map(node => {
              if (node.key === key) {
                return {
                  ...node,
                  children: objects
                };
              }
              if (node.children) {
                return {
                  ...node,
                  children: updateNode(node.children)
                };
              }
              return node;
            });
          };
          
          return updateNode(prev);
        });
        
        resolve();
        return;
      }
      
      resolve();
    });
  };

  // 处理节点展开事件
  const onExpand = (expandedKeys: React.Key[], info: any) => {
    setExpandedKeys(expandedKeys);
  };

  // 优化选择数据库方法
  const selectDatabase = useCallback((dbName: string, connId: number) => {
    console.log(`内部选择数据库: ${dbName}, 连接ID: ${connId}`);
    if (onSelectDatabase) {
      onSelectDatabase(dbName, connId.toString());
    }
  }, [onSelectDatabase]);

  // 优化选择表方法
  const selectTable = useCallback((tableName: string, dbName: string, connId: number) => {
    console.log(`内部选择表: ${tableName}, 数据库: ${dbName}, 连接ID: ${connId}`);
    if (onSelectTable) {
      onSelectTable(tableName, dbName, connId.toString());
    }
  }, [onSelectTable]);

  // 添加事件监听
  useEffect(() => {
    const handleRefresh = () => {
      console.log('ConnectionTree: 收到刷新事件');
      loadConnections();
    };
    
    window.addEventListener('refreshConnectionTree', handleRefresh);
    
    return () => {
      window.removeEventListener('refreshConnectionTree', handleRefresh);
    };
  }, []);

  // 处理节点选择事件
  const onSelect = (selectedKeys: React.Key[], info: any) => {
    const key = selectedKeys[0]?.toString();
    if (!key) return;
    
    console.log('选中节点:', key, '节点类型:', info.node.nodeType);
    setSelectedKeys(selectedKeys);
    
    const { connectionId, databaseName, tableName, nodeType, isConnected } = info.node;
    
    if (!connectionId) {
      console.log('节点没有连接ID，跳过处理');
      return;
    }
    
    const connection = connections.find(c => c.id === connectionId);
    if (!connection) {
      console.log('找不到对应的连接对象，跳过处理');
      return;
    }
    
    switch (nodeType) {
      case 'connection':
        if (!isConnected) {
          connectToDatabase(connectionId);
        }
        if (onSelectConnection) {
          onSelectConnection(connection);
        }
        break;
      
      case 'database':
        if (databaseName && onSelectDatabase) {
          onSelectDatabase(databaseName, connectionId.toString());
        }
        break;
      
      case 'table':
      case 'view':
        if (databaseName && tableName && onSelectTable) {
          // 直接调用回调，不刷新树结构
            onSelectTable(tableName, databaseName, connectionId.toString());
        }
        break;
      
      case 'tableFolder':
      case 'viewFolder':
      case 'functionFolder':
      case 'eventFolder':
        // 只展开节点，不触发其他操作
        if (!expandedKeys.includes(key)) {
          setExpandedKeys(prev => [...prev, key]);
        }
        break;
    }
  };

  // 刷新连接和节点
  const handleRefresh = async () => {
    try {
      // 显示加载状态
      setLoading(true);
      
    // 清除所有请求锁
    requestLock.current = {};
    
      // 关闭所有已打开的连接
      const currentConnections = treeData.filter(node => node.isConnected && node.connectionId);
      for (const conn of currentConnections) {
        if (conn.connectionId) {
          await ConnectionService.closeConnection(conn.connectionId);
        }
      }
      
      // 清空当前树状态
    setTreeData([]);
    setExpandedKeys([]);
      setSelectedKeys([]);
      
      // 重新加载连接列表
      await loadConnections();
      
      message.success('刷新成功');
    } catch (error) {
      console.error('刷新失败:', error);
      message.error('刷新失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加连接
  const handleAddConnection = () => {
    if (onAddConnection) {
      onAddConnection();
    }
  };

  // 渲染节点右侧的操作按钮
  const renderNodeActions = (node: TreeNodeInterface) => {
    if (node.nodeType === 'connection') {
      const connectionId = node.connectionId;
      if (!connectionId) return null;
      
      const isConnected = node.isConnected;
      const isConnecting = connectingIds.includes(connectionId);
      
      if (isConnecting) {
        return <LoadingOutlined className="node-action-icon" />;
      }
      
      if (isConnected) {
        return (
          <Tooltip title="断开连接">
            <DisconnectOutlined 
              className="node-action-icon" 
              onClick={(e) => {
                e.stopPropagation();
                disconnectDatabase(connectionId);
              }}
            />
          </Tooltip>
        );
      } else {
        return (
          <Tooltip title="连接数据库">
            <LinkOutlined 
              className="node-action-icon" 
              onClick={(e) => {
                e.stopPropagation();
                connectToDatabase(connectionId);
              }}
            />
          </Tooltip>
        );
      }
    }
    return null;
  };

  // 表文件夹节点的右键菜单项
  const getTableFolderMenuItems = (connectionId: number, databaseName: string, databaseType: string) => [
    {
      key: 'refreshTables',
      label: '刷新',
      icon: <ReloadOutlined />,
      onClick: () => handleRefreshTables(connectionId, databaseName)
    },
    {
      key: 'createTable',
      label: '新建表',
      icon: <PlusOutlined />,
      onClick: () => {
        if (onShowTableDesigner) {
          onShowTableDesigner({
            connectionId,
            databaseName,
            databaseType
          });
        }
      }
    }
  ];

  // 处理右键菜单
  const handleContextMenu = (event: React.MouseEvent, node: TreeNodeInterface) => {
    event.preventDefault();
    event.stopPropagation();
    
    // 根据节点类型构建菜单项
    let menuItems: ContextMenuItem[] = [];
    
    if (node.nodeType === 'tableFolder' && node.connectionId && node.databaseName) {
      // 找到连接对象
      const conn = connections.find(c => c.id === node.connectionId);
      const dbType = conn?.type || 'mysql';
      
      // 获取表文件夹菜单项
      menuItems = getTableFolderMenuItems(node.connectionId, node.databaseName, dbType);
    }
    // 可以添加其他节点类型的菜单项...
    
    // 设置上下文菜单
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      node,
      items: menuItems
    });
  };

  // 关闭右键菜单
  const closeContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  // 添加到树组件的右键点击处理
  const onRightClick = (info: any) => {
    const { event, node } = info;
    handleContextMenu(event, node);
  };

  // 刷新表列表
  const handleRefreshTables = async (connectionId: number, databaseName: string) => {
    try {
      setLoading(true);
      const tables = await loadTablesForDatabase(connectionId, databaseName);
      
                      // 更新树节点
                      setTreeData(prevData => {
                        const updateNode = (nodes: TreeNodeInterface[]): TreeNodeInterface[] => {
                          return nodes.map(n => {
            if (n.connectionId === connectionId && 
                n.databaseName === databaseName && 
                n.nodeType === 'tableFolder') {
                              return {
                                ...n,
                children: tables
                              };
                            }
                            if (n.children) {
                              return {
                                ...n,
                                children: updateNode(n.children)
                              };
                            }
                            return n;
                          });
                        };
                        return updateNode(prevData);
                      });
      
      message.success(`已刷新数据库 ${databaseName} 的表列表`);
    } catch (error: any) {
      console.error('刷新表列表失败:', error);
      message.error(`刷新表列表失败: ${error?.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

  // 自定义节点渲染
  const titleRender = (nodeData: TreeNodeInterface): React.ReactNode => {
    const node = nodeData as TreeNodeInterface;
    const { title, nodeType, isConnected } = node;
    
    return (
      <div 
        className="tree-node-title"
        onContextMenu={(e) => handleContextMenu(e, node)}
      >
        <div className={`${nodeType}-node-content`}>
          <span>{typeof title === 'function' ? title(nodeData) : title}</span>
        </div>
        {renderNodeActions(node)}
      </div>
    );
  };

  // 将树组件渲染抽取为一个函数来解决类型问题
  const renderTree = () => {
    return (
      <Tree
        showIcon
        showLine={{ showLeafIcon: false }}
        className="database-tree"
        treeData={treeData}
        expandedKeys={expandedKeys}
        selectedKeys={selectedKeys}
        loadData={onLoadData}
        titleRender={titleRender}
        onExpand={onExpand}
        onSelect={onSelect}
        onRightClick={onRightClick}
      />
    );
  };

  // 监听连接变化
  useEffect(() => {
    if (onConnectionChange) {
      // 重新加载连接列表
      loadConnections();
    }
  }, [onConnectionChange]);

  if (loading) {
    return (
      <div className="tree-loading">
        <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} />} />
        <span className="loading-text">加载连接中...</span>
      </div>
    );
  }

  return (
    <div className="connection-tree-container">
      {loading ? (
        <div className="tree-loading">
          <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} />} />
          <span className="loading-text">加载连接中...</span>
        </div>
      ) : treeData.length > 0 ? (
    <div className="connection-tree">
          {renderTree()}
          
          {/* 右键菜单 */}
          <ContextMenu
            visible={contextMenu.visible}
            x={contextMenu.x}
            y={contextMenu.y}
            items={contextMenu.items}
            onClose={closeContextMenu}
          />
        </div>
      ) : (
        <div className="empty-connections">
          <Empty description="没有连接" />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddConnection}
            className="add-connection-button"
          >
            添加连接
          </Button>
        </div>
      )}
    </div>
  );
};

export default ConnectionTree; 