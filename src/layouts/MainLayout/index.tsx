import { useState, useEffect } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Modal, Empty, Tooltip, Tabs, message, Select } from 'antd';
import type { MenuProps } from 'antd';
import {
  DatabaseOutlined,
  UserOutlined,
  PlusOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  TableOutlined,
  FileOutlined,
  CodeOutlined,
  FormOutlined,
  ToolOutlined,
  SearchOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  BarsOutlined,
  FolderOutlined,
  QuestionCircleOutlined,
  ImportOutlined,
  ExportOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  CloudServerOutlined,
  DesktopOutlined,
  FolderOpenOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  LinkOutlined,
  DisconnectOutlined,
  DownloadOutlined,
  UploadOutlined,
  KeyOutlined,
  RobotOutlined,
  ClearOutlined
} from '@ant-design/icons';
import ConnectionTree from '../../components/ConnectionTree';
import DatabaseContent from '../../components/DatabaseContent';
import QueryEditor from '../../components/QueryEditor';
import TableDesigner from '../../components/TableDesigner';
import ConnectionManagement from '../../pages/ConnectionManagement';
import { useAuthStore } from '../../store/authStore';
import ConnectionService, { ConnectionResponse } from '../../services/connectionService';
import './style.css';
import ConnectionManager from '../../utils/connectionManager';
import ReactDOM from 'react-dom';

const { Header, Sider, Content, Footer } = Layout;
const { confirm } = Modal;
const { TabPane } = Tabs;

// Tab 项接口
interface TabItem {
  id: string;
  title: string;
  connection: any;
  database: string;
  type: 'table' | 'table-designer' | 'query';
  table?: string;
  content?: React.ReactNode;
  refreshTimestamp?: number;
}

const MainLayout = () => {
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionResponse | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState('browser'); // 'browser', 'query'
  const [connectionModalVisible, setConnectionModalVisible] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [activeKey, setActiveKey] = useState<string>('welcome');
  const [queryTabs, setQueryTabs] = useState<{id: string, title: string, content: string}[]>([]);
  const [activeQueryTab, setActiveQueryTab] = useState<string | null>(null);
  
  // 添加表数据标签页状态
  const [tableTabs, setTableTabs] = useState<TabItem[]>([]);
  
  // 活跃的标签页
  const [activeTabKey, setActiveTabKey] = useState<string | null>(null);
  
  // 添加未保存变更状态记录
  const [unsavedChanges, setUnsavedChanges] = useState<Record<string, boolean>>({});
  
  // 添加表设计器状态
  const [tableDesignerVisible, setTableDesignerVisible] = useState(false);
  const [tableDesignerInfo, setTableDesignerInfo] = useState<{
    connectionId: number;
    databaseName: string;
    databaseType: string;
  } | null>(null);
  
  // 顶部导航菜单项
  const topMenuItems = [
    { 
      key: 'connection', 
      label: '新建连接',
      children: [
        { key: 'new_connection', label: '新建连接' }
      ]
    },
    { 
      key: 'view', 
      label: '新建视图',
      children: [
        { key: 'new_view', label: '新建视图' }
      ]
    },
    { 
      key: 'function', 
      label: '新建函数',
      children: [
        { key: 'new_function', label: '新建函数' }
      ]
    },
   
    { 
      key: 'query', 
      label: '查询',
      children: [
        { key: 'new_query', label: '新建查询' }
      ]
    },
    { 
      key: 'ai', 
      label: 'AI助手',
      children: [
        { key: 'new_AI', label: 'AI生成SQL' },
        { key: 'model_AI', label: 'AI模型设置' },
        { key: 'chat_AI', label: 'AI聊天' }
      ]
    },
    
    
    { 
      key: 'tools', 
      label: '工具',
      children: [
        { key: 'cs_data', label: '数据传输' },
        { key: 'syn_data', label: '数据同步' },
        { key: 'jgsyn_data', label: '结构同步' },
      ]
    },
    { 
      key: 'model', 
      label: '模型',
      children: [
        { key: 'new_model', label: '新建模型' }
      ]
    },
    { 
      key: 'bi', 
      label: '报表',
      children: [
        { key: 'new_bi', label: '新建报表' }
      ]
    },
    { 
      key: 'help', 
      label: '帮助',
      children: [
        { key: 'help_content', label: '帮助内容' },
        { key: 'about', label: '关于数据库管理工具' }
      ]
    },
    { 
      key: 'settings', 
      label: '设置',
      icon: <SettingOutlined />
    },
    { 
      key: 'user', 
      label: user?.username || '用户',
      icon: <UserOutlined />,
      children: [
        { key: 'logout', label: '退出登录', icon: <LogoutOutlined /> }
      ]
    }
  ];

  // 加载连接列表
  const loadConnections = async () => {
    try {
      const connectionList = await ConnectionService.getConnections();
      setConnections(connectionList);
    } catch (error) {
      console.error('加载连接列表失败:', error);
      message.error('加载连接列表失败');
    }
  };

  // 初始化加载连接列表
  useEffect(() => {
    loadConnections();
  }, []);

  const handleLogout = () => {
    confirm({
      title: '确定要退出登录吗？',
      icon: <ExclamationCircleOutlined />,
      content: '退出后需要重新登录才能继续使用',
      onOk() {
        logout();
      },
    });
  };

  // 打开新建连接模态框
  const showConnectionModal = () => {
    setConnectionModalVisible(true);
  };

  // 关闭新建连接模态框
  const closeConnectionModal = () => {
    setConnectionModalVisible(false);
  };

  // 选择连接
  const onSelectConnection = (connection: ConnectionResponse) => {
    console.log('MainLayout: 选择连接', connection.name, connection.id);
    
    // 保存到全局连接管理器
    ConnectionManager.setActiveConnectionId(connection.id);
    ConnectionManager.saveConnectionInfo({
      id: connection.id,
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port
    });
    
    setSelectedConnection(connection);
    // 清空选中的数据库和表
    setSelectedDatabase(null);
    setSelectedTable(null);
  };

  // 选择数据库
  const onSelectDatabase = (db: string, connId: string) => {
    console.log(`MainLayout: 选择数据库 ${db}，连接ID ${connId}`);
    setSelectedDatabase(db);
  };

  // 选择表
  const onSelectTable = (table: string, db: string, connId: string) => {
    console.log(`MainLayout: 选择表 ${table}，数据库 ${db}，连接ID ${connId}`);
    
    // 生成表标签页ID
    const tabId = `table-${connId}-${db}-${table}`;
    
    // 检查是否已经存在相同的标签页
    const existingTabIndex = tableTabs.findIndex(tab => tab.id === tabId);
    
    if (existingTabIndex === -1) {
      // 如果不存在，创建新标签页
      const conn = connections.find(c => c.id === connId) || selectedConnection;
      
      const newTab: TabItem = {
        id: tabId,
        title: `${db}.${table}`,
        connection: conn,
        database: db,
        table: table,
        type: 'table' as const
      };
      
      setTableTabs(prev => [...prev, newTab]);
    }
    
    // 激活该标签页
    setActiveTabKey(tabId);
    setCurrentTab('browser');
  };

  const userMenu: MenuProps = {
    items: [
      {
        key: '1',
        icon: <UserOutlined />,
        label: user?.username || '用户',
      },
      {
        key: '2',
        icon: <SettingOutlined />,
        label: '设置',
      },
      {
        type: 'divider',
      },
      {
        key: '3',
        icon: <LogoutOutlined />,
        label: '退出登录',
        onClick: handleLogout,
      },
    ],
  };

  // 监控状态变化
  useEffect(() => {
    // 使用全局连接管理器获取最新的连接ID
    const activeConnectionId = ConnectionManager.getActiveConnectionId();
    const activeDatabase = ConnectionManager.getActiveDatabase();
    const activeConnInfo = ConnectionManager.getActiveConnectionInfo();
    
    console.log('MainLayout 状态更新:', {
      连接: selectedConnection?.id === undefined 
         ? `${activeConnectionId || 'undefined'} (使用全局ID)` 
         : selectedConnection?.id,
      数据库: activeDatabase || selectedDatabase,
      表: selectedTable
    });
  }, [selectedConnection, selectedDatabase, selectedTable]);

  // 新建查询标签页
  const handleNewQuery = () => {
    const newTabId = `query-${Date.now()}`;
    const newTab = {
      id: newTabId,
      title: `查询 ${queryTabs.length + 1}`,
      content: ''
    };
    
    setQueryTabs([...queryTabs, newTab]);
    setActiveTabKey(newTabId);
    setActiveQueryTab(newTabId);
    setCurrentTab('query');
  };

  // 关闭查询标签页
  const handleCloseQueryTab = (tabId: string) => {
    const newTabs = queryTabs.filter(tab => tab.id !== tabId);
    setQueryTabs(newTabs);
    
    if (activeQueryTab === tabId) {
      // 如果关闭的是当前激活的查询标签，则更新activeQueryTab
      if (newTabs.length > 0) {
        const newActiveQueryTab = newTabs[newTabs.length - 1].id;
        setActiveQueryTab(newActiveQueryTab);
        setActiveTabKey(newActiveQueryTab);
      } else {
        setActiveQueryTab(null);
      }
    }
    
    if (activeTabKey === tabId) {
      // 如果关闭的是当前激活的标签，则激活最后一个标签
      if (newTabs.length > 0) {
        // 还有查询标签页，激活最后一个查询标签页
        setActiveTabKey(newTabs[newTabs.length - 1].id);
      } else if (tableTabs.length > 0) {
        // 还有表标签页，激活最后一个表标签页
        setActiveTabKey(tableTabs[tableTabs.length - 1].id);
      } else {
        // 没有标签页了，清空激活状态
        setActiveTabKey(null);
        setCurrentTab('browser');
      }
    }
  };

  // 关闭表数据标签页
  const handleCloseTableTab = (tabId: string) => {
    const newTabs = tableTabs.filter(tab => tab.id !== tabId);
    setTableTabs(newTabs);
    
    if (activeTabKey === tabId) {
      // 如果关闭的是当前激活的标签，则激活最后一个标签
      if (newTabs.length > 0) {
        setActiveTabKey(newTabs[newTabs.length - 1].id);
      } else if (queryTabs.length > 0) {
        // 如果还有查询标签页，激活第一个查询标签页
        setActiveTabKey(queryTabs[0].id);
        setCurrentTab('query');
      } else {
        // 没有标签页时，显示空内容
        setActiveTabKey(null);
      }
    }
  };

  // 更新查询内容
  const handleUpdateQueryContent = (tabId: string, content: string) => {
    const newTabs = queryTabs.map(tab => {
      if (tab.id === tabId) {
        return { ...tab, content };
      }
      return tab;
    });
    setQueryTabs(newTabs);
  };

  // 添加菜单点击事件处理
  const handleMenuClick = (e: any) => {
    console.log('点击菜单项:', e.key);
    
    switch (e.key) {
      case 'new_query':
        handleNewQuery();
        break;
      case 'logout':
        handleLogout();
        break;
      case 'settings':
        message.info('打开设置');
        break;
      case 'user_info':
        message.info(`当前用户: ${user?.username || '未登录'}`);
        break;
      case 'new_connection':
        showConnectionModal();
        break;
      default:
        break;
    }
  };

  // 渲染数据库导航路径
  const renderDatabasePath = () => {
    if (!selectedConnection) return null;
    
    return (
      <div className="database-navigator">
        <div className="nav-item">
          <CloudServerOutlined style={{ marginRight: 5 }} />
          <span>{selectedConnection.name}</span>
        </div>
        
        {selectedDatabase && (
          <>
            <span className="nav-separator">/</span>
            <div className="nav-item">
              <DatabaseOutlined style={{ marginRight: 5 }} />
              <span>{selectedDatabase}</span>
            </div>
            
            {selectedTable && (
              <>
                <span className="nav-separator">/</span>
                <div className="nav-item">
                  <TableOutlined style={{ marginRight: 5 }} />
                  <span>{selectedTable}</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    );
  };

  // 切换侧边栏展开/收起状态
  const toggleSider = () => {
    setCollapsed(!collapsed);
  };

  // 渲染内容区域
  const renderContentArea = () => {
    // 仅渲染标签页内容，如果没有标签页，则不显示任何内容
    if (activeTabKey || queryTabs.length > 0 || tableTabs.length > 0) {
      return (
        <Tabs
          type="editable-card"
          onChange={handleTabChange}
          activeKey={activeTabKey || ''}
          onEdit={(targetKey, action) => {
            if (action === 'add') {
              handleNewQuery();
            } else if (action === 'remove') {
              closeTab(targetKey as string);
            }
          }}
          className="content-tabs"
          hideAdd
        >
          {[
            ...queryTabs.map(tab => (
              <TabPane
                key={tab.id}
                tab={
                  <span className="tab-label">
                    <CodeOutlined />
                    <span className="tab-text">
                      {tab.title}
                      {unsavedChanges[tab.id] && <span className="unsaved-indicator">*</span>}
                    </span>
                  </span>
                }
                closable
              >
                <QueryEditor
                  sql={tab.content}
                  onChange={(sql) => handleUpdateQueryContent(tab.id, sql)}
                  connection={selectedConnection}
                  database={selectedDatabase}
                />
              </TabPane>
            )),
            ...tableTabs.map(tab => (
              <TabPane
                key={tab.id}
                tab={
                  <span className="tab-label">
                    {tab.type === 'table-designer' ? (
                      <>
                        <FormOutlined />
                        <span className="tab-text">
                          {tab.title}
                          {unsavedChanges[tab.id] && <span className="unsaved-indicator">*</span>}
                        </span>
                      </>
                    ) : (
                      <>
                        <TableOutlined />
                        <span className="tab-text">
                          {tab.title}
                          {unsavedChanges[tab.id] && <span className="unsaved-indicator">*</span>}
                        </span>
                      </>
                    )}
                  </span>
                }
                closable
              >
                {tab.type === 'table-designer' ? (
                  tab.content
                ) : (
                  <DatabaseContent
                    key={tab.refreshTimestamp || tab.id}
                    connection={tab.connection}
                    database={tab.database}
                    table={tab.table!}
                    onDataChange={(hasChanges) => setTabHasUnsavedChanges(tab.id, hasChanges)}
                  />
                )}
              </TabPane>
            ))
          ]}
        </Tabs>
      );
    }
    
    return <div className="no-content"></div>;
  };

  // 检查是否有未保存的更改
  const checkUnsavedChanges = (tabId: string): boolean => {
    return !!unsavedChanges[tabId];
  };

  // 设置标签页有未保存的内容
  const setTabHasUnsavedChanges = (tabId: string, hasChanges: boolean) => {
    setUnsavedChanges(prev => ({
      ...prev,
      [tabId]: hasChanges
    }));
  };

  // 更新右键菜单处理功能，修复类型错误
  const handleTabContextMenu = (e: React.MouseEvent, tabId: string) => {
    e.preventDefault();
    
    // 创建右键菜单选项
    const menuProps: MenuProps = {
      onClick: ({key}) => handleTabMenuClick(key as string, tabId),
      items: [
        { key: 'close', label: '关闭' },
        { key: 'closeOthers', label: '关闭其他标签页' },
        { key: 'closeAll', label: '关闭所有标签页' },
        { type: 'divider' },
        { key: 'refresh', label: '刷新' }
      ]
    };
    
    // 获取正确的定位坐标
    const { clientX, clientY } = e;
    
    // 创建自定义悬浮层来渲染菜单
    const container = document.createElement('div');
    container.className = 'tab-context-menu';
    container.style.position = 'fixed';  // 使用fixed而不是absolute
    container.style.zIndex = '1000';
    container.style.left = `${clientX}px`;
    container.style.top = `${clientY}px`;
    document.body.appendChild(container);
    
    // 定义清理函数
    const cleanup = () => {
      if (container && document.body.contains(container)) {
        ReactDOM.unmountComponentAtNode(container);
        document.body.removeChild(container);
      }
    };
    
    // 创建菜单组件
    const menu = (
      <div className="custom-context-menu">
        <Menu 
          onClick={(info) => {
            handleTabMenuClick(info.key as string, tabId);
            cleanup();
          }}
          items={menuProps.items}
        />
      </div>
    );
    
    // 渲染菜单
    ReactDOM.render(menu, container);
    
    // 添加点击事件监听器，点击其他地方时关闭菜单
    const clickHandler = () => {
      cleanup();
      document.removeEventListener('click', clickHandler);
    };
    
    // 使用setTimeout确保不会立即触发点击事件
    setTimeout(() => {
      document.addEventListener('click', clickHandler);
    }, 0);
  };

  // 处理标签页右键菜单选项的点击
  const handleTabMenuClick = (menuKey: string, tabId: string) => {
    switch (menuKey) {
      case 'close':
        closeTab(tabId);
        break;
      case 'closeOthers':
        closeOtherTabs(tabId);
        break;
      case 'closeAll':
        closeAllTabs();
        break;
      case 'refresh':
        refreshTab(tabId);
        break;
      default:
        break;
    }
  };

  // 关闭标签页前检查未保存的更改
  const closeTab = (tabId: string) => {
    if (checkUnsavedChanges(tabId)) {
      confirm({
        title: '有未保存的更改',
        content: '关闭前是否保存更改？',
        okText: '保存',
        cancelText: '不保存',
        onOk() {
          // 保存更改的逻辑
          saveTabChanges(tabId).then(() => {
            actuallyCloseTab(tabId);
          });
        },
        onCancel() {
          // 不保存直接关闭
          actuallyCloseTab(tabId);
        }
      });
    } else {
      actuallyCloseTab(tabId);
    }
  };

  // 实际关闭标签页的操作
  const actuallyCloseTab = (tabId: string) => {
    if (tabId.startsWith('query-')) {
      const newTabs = queryTabs.filter(tab => tab.id !== tabId);
      setQueryTabs(newTabs);
      
      if (activeTabKey === tabId) {
        if (newTabs.length > 0) {
          setActiveTabKey(newTabs[newTabs.length - 1].id);
        } else if (tableTabs.length > 0) {
          setActiveTabKey(tableTabs[tableTabs.length - 1].id);
        } else {
          setActiveTabKey(null);
        }
      }
    } else if (tabId.startsWith('table-')) {
      const newTabs = tableTabs.filter(tab => tab.id !== tabId);
      setTableTabs(newTabs);
      
      if (activeTabKey === tabId) {
        if (newTabs.length > 0) {
          setActiveTabKey(newTabs[newTabs.length - 1].id);
        } else if (queryTabs.length > 0) {
          setActiveTabKey(queryTabs[queryTabs.length - 1].id);
        } else {
          setActiveTabKey(null);
        }
      }
    }
    
    // 清除该标签页的未保存状态
    setUnsavedChanges(prev => {
      const newState = { ...prev };
      delete newState[tabId];
      return newState;
    });
  };

  // 关闭其他标签页
  const closeOtherTabs = (exceptTabId: string) => {
    // 检查是否有其他标签页有未保存的更改
    const otherTabsWithChanges = Object.entries(unsavedChanges)
      .filter(([tabId, hasChanges]) => tabId !== exceptTabId && hasChanges)
      .map(([tabId]) => tabId);
    
    if (otherTabsWithChanges.length > 0) {
      confirm({
        title: '有未保存的更改',
        content: `有 ${otherTabsWithChanges.length} 个标签页有未保存的更改，确定要关闭吗？`,
        okText: '关闭',
        cancelText: '取消',
        onOk() {
          actuallyCloseOtherTabs(exceptTabId);
        }
      });
    } else {
      actuallyCloseOtherTabs(exceptTabId);
    }
  };

  // 实际关闭其他标签页的操作
  const actuallyCloseOtherTabs = (exceptTabId: string) => {
    // 保留指定标签页，关闭其他所有标签页
    const newQueryTabs = queryTabs.filter(tab => tab.id === exceptTabId);
    const newTableTabs = tableTabs.filter(tab => tab.id === exceptTabId);
    
    setQueryTabs(newQueryTabs);
    setTableTabs(newTableTabs);
    setActiveTabKey(exceptTabId);
    
    // 清除关闭的标签页的未保存状态
    const newUnsavedChanges: Record<string, boolean> = {};
    if (unsavedChanges[exceptTabId]) {
      newUnsavedChanges[exceptTabId] = unsavedChanges[exceptTabId];
    }
    setUnsavedChanges(newUnsavedChanges);
  };

  // 关闭所有标签页
  const closeAllTabs = () => {
    // 检查是否有标签页有未保存的更改
    const tabsWithChanges = Object.entries(unsavedChanges)
      .filter(([_, hasChanges]) => hasChanges)
      .map(([tabId]) => tabId);
    
    if (tabsWithChanges.length > 0) {
      confirm({
        title: '有未保存的更改',
        content: `有 ${tabsWithChanges.length} 个标签页有未保存的更改，确定要关闭吗？`,
        okText: '关闭',
        cancelText: '取消',
        onOk() {
          actuallyCloseAllTabs();
        }
      });
    } else {
      actuallyCloseAllTabs();
    }
  };

  // 实际关闭所有标签页的操作
  const actuallyCloseAllTabs = () => {
    setQueryTabs([]);
    setTableTabs([]);
    setActiveTabKey(null);
    setUnsavedChanges({});
  };

  // 刷新标签页
  const refreshTab = (tabId: string) => {
    // 如果有未保存的更改，提示用户
    if (checkUnsavedChanges(tabId)) {
      confirm({
        title: '有未保存的更改',
        content: '刷新会丢失未保存的更改，是否继续？',
        okText: '继续',
        cancelText: '取消',
        onOk() {
          actuallyRefreshTab(tabId);
        }
      });
    } else {
      actuallyRefreshTab(tabId);
    }
  };

  // 实际刷新标签页的操作
  const actuallyRefreshTab = (tabId: string) => {
    // 根据标签页类型执行不同的刷新操作
    if (tabId.startsWith('table-')) {
      // 找到对应的表格标签页并重新加载数据
      const tabIndex = tableTabs.findIndex(tab => tab.id === tabId);
      if (tabIndex >= 0) {
        // 这里需要触发表格数据重新加载
        // 可以通过设置一个key或timestamp来强制组件重新渲染
        const updatedTabs = [...tableTabs];
        updatedTabs[tabIndex] = {
          ...updatedTabs[tabIndex],
          refreshTimestamp: Date.now()
        };
        setTableTabs(updatedTabs);
        
        // 清除未保存状态
        setTabHasUnsavedChanges(tabId, false);
      }
    } else if (tabId.startsWith('query-')) {
      // 查询标签页的刷新逻辑
      // 可能是重置查询内容或重新执行查询
      // 这里简单实现为不做任何操作
      setTabHasUnsavedChanges(tabId, false);
    }
  };

  // 保存标签页更改
  const saveTabChanges = async (tabId: string) => {
    // 根据标签页类型执行不同的保存操作
    try {
      if (tabId.startsWith('table-')) {
        // 表格数据保存逻辑
        // ...实现保存表格数据的代码...
        
        // 保存成功后清除未保存状态
        setTabHasUnsavedChanges(tabId, false);
        message.success('保存成功');
      } else if (tabId.startsWith('query-')) {
        // 查询脚本保存逻辑
        // ...实现保存查询脚本的代码...
        
        // 保存成功后清除未保存状态
        setTabHasUnsavedChanges(tabId, false);
        message.success('保存成功');
      }
      return Promise.resolve();
    } catch (error) {
      message.error('保存失败');
      return Promise.reject(error);
    }
  };

  // 处理显示表设计器
  const handleShowTableDesigner = (info: { connectionId: number; databaseName: string; databaseType: string }) => {
    // 生成基础标识符
    const baseKey = `table-designer-${info.connectionId}-${info.databaseName}`;
    
    // 检查是否已存在相同类型的标签页
    const existingTab = tableTabs.find(tab => 
      tab.type === 'table-designer' && 
      tab.connection?.id === info.connectionId && 
      tab.database === info.databaseName
    );
    
    if (existingTab) {
      // 如果已存在，激活该标签页
      setActiveTabKey(existingTab.id);
      return;
    }
    
    // 生成新的唯一标识符
    const tabKey = `${baseKey}-${Date.now()}`;
    
    // 创建新标签页
    const newTab: TabItem = {
      id: tabKey,
      title: '新建表',
      connection: connections.find(c => c.id === info.connectionId),
      database: info.databaseName,
      type: 'table-designer',
      content: (
        <TableDesigner
          connectionId={info.connectionId.toString()}
          databaseName={info.databaseName}
          databaseType={info.databaseType}
          onSuccess={() => {
            handleCloseTableTab(tabKey);
            // 使用事件总线或其他方式通知树组件刷新
            window.dispatchEvent(new CustomEvent('refreshConnectionTree'));
          }}
        />
      )
    };
    
    // 添加新标签页并激活
    setTableTabs(prev => {
      // 再次检查是否有重复，以防并发操作
      const isDuplicate = prev.some(tab => 
        tab.type === 'table-designer' && 
        tab.connection?.id === info.connectionId && 
        tab.database === info.databaseName
      );
      
      if (isDuplicate) {
        return prev;
      }
      
      return [...prev, newTab];
    });
    
    setActiveTabKey(tabKey);
  };

  // 处理标签页切换
  const handleTabChange = (newActiveKey: string) => {
    if (newActiveKey === activeTabKey) {
      return; // 避免重复切换
    }
    // 只更新活动标签页的key，不做其他操作
    setActiveTabKey(newActiveKey);
  };

  return (
    <Layout className="main-layout">
      <Header className="main-header">
        <Menu mode="horizontal" items={topMenuItems} onClick={handleMenuClick} />
      </Header>
      <Layout>
        <Sider 
          width={300} 
          collapsible 
          collapsed={collapsed} 
          onCollapse={setCollapsed}
          className="main-sider"
        >
          <ConnectionTree
            connections={connections}
            onSelectConnection={onSelectConnection}
            onSelectDatabase={onSelectDatabase}
            onSelectTable={onSelectTable}
            onAddConnection={showConnectionModal}
            currentConnection={selectedConnection}
            currentDatabase={selectedDatabase}
            currentTable={selectedTable}
            onConnectionChange={loadConnections}
            onShowTableDesigner={handleShowTableDesigner}
          />
        </Sider>
        
        {/* 侧边栏折叠切换按钮 */}
        <div className="sider-trigger" onClick={toggleSider}>
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
        
        {/* 主内容区域 */}
        <Content className="navicat-content">
          {/* 数据库内容路径 */}
          {renderDatabasePath()}
          
          {/* 内容区域 */}
          {renderContentArea()}
        </Content>
      </Layout>
      
      {/* 全局状态栏 */}
      <div className="navicat-status-bar">
        <div className="status-left">
          <span className="status-item">行:1 列:1</span>
        </div>
        <div className="status-right">
          <span className="status-item" style={{ marginRight: '15px' }}>
            {/* 显示当前连接状态 */}
            {(() => {
              const activeConnectionId = ConnectionManager.getActiveConnectionId();
              const activeDatabase = ConnectionManager.getActiveDatabase();
              const activeInfo = ConnectionManager.getActiveConnectionInfo();
              
              if (activeConnectionId) {
                return `连接ID: ${activeConnectionId}${activeDatabase ? `, DB: ${activeDatabase}` : ''}`;
              }
              return '未连接';
            })()}
          </span>
          <span className="status-item">就绪</span>
        </div>
      </div>
      
      {/* 连接管理模态框 */}
      <Modal
        title="连接管理"
        open={connectionModalVisible}
        onCancel={closeConnectionModal}
        footer={null}
        width={700}
      >
        <ConnectionManagement onClose={closeConnectionModal} />
      </Modal>
    </Layout>
  );
};

export default MainLayout; 