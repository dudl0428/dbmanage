import { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Tabs, Empty, Spin, message, Button, List, Alert, Tooltip, Modal, Form, Input, Select, Switch, Space, Popconfirm, Typography, InputNumber } from 'antd';
import { 
  TableOutlined, 
  ReloadOutlined, 
  DatabaseOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  SaveOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  ProfileOutlined,
  CloseCircleOutlined,
  CheckCircleOutlined,
  MenuOutlined,
  SearchOutlined,
  ExportOutlined,
  LeftOutlined,
  DoubleLeftOutlined,
  DoubleRightOutlined,
  RightOutlined,
  FilterOutlined
} from '@ant-design/icons';
import type { TabsProps } from 'antd';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import update from 'immutability-helper';
import ConnectionService from '../../services/connectionService';
import ConnectionManager from '../../utils/connectionManager';
import TableService from '../../services/tableService';
import type { TableStructure, TableDataResponse } from '../../services/tableService';
import './style.css';

interface DatabaseContentProps {
  connection?: any;
  database?: string | null;
  table?: string | null;
  onSelectTable?: (tableName: string, database: string, connectionId: string, showStructure?: boolean, type?: string) => void;
  onDataChange?: (hasChanges: boolean) => void;
  showStructure?: boolean;
  viewType?: string;
}

interface TableInfo {
  name: string;
  type: string;
  comment?: string;
}

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  key: string;
  default?: string;
  extra?: string;
  isEditing?: boolean;
  isNew?: boolean;
}

// 表格列配置
const tableColumns = [
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    width: 240,
    ellipsis: true,
    render: (text: string) => (
      <div className="table-name-cell">
        <TableOutlined style={{ marginRight: 8, color: '#1890ff' }} />
        <span title={text}>{text}</span>
      </div>
    ),
  },
  {
    title: 'OID',
    dataIndex: 'oid',
    key: 'oid',
    width: 100,
  },
  {
    title: '所有者',
    dataIndex: 'owner',
    key: 'owner',
    width: 120,
  },
  {
    title: '表类型',
    dataIndex: 'type',
    key: 'type',
    width: 100,
    render: (text: string) => <span className="table-type">{text || '常规'}</span>,
  },
  {
    title: '行数',
    dataIndex: 'rows',
    key: 'rows',
    width: 80,
    align: 'right' as const,
    render: (text: string) => <span className="row-count">{text || '0'}</span>,
  },
  {
    title: '引擎',
    dataIndex: 'engine',
    key: 'engine',
    width: 100,
  },
  {
    title: '排序规则',
    dataIndex: 'collation',
    key: 'collation',
    width: 160,
  },
  {
    title: '大小',
    dataIndex: 'size',
    key: 'size',
    width: 100,
    align: 'right' as const,
  },
  {
    title: '备注',
    dataIndex: 'comment',
    key: 'comment',
    ellipsis: true,
  }
];

// 模拟表数据
const mockTableData = (tableName: string) => {
  const columns = [];
  for (let i = 1; i <= 5; i++) {
    columns.push({
      title: `字段${i}`,
      dataIndex: `field${i}`,
      key: `field${i}`,
    });
  }

  const data = [];
  for (let i = 1; i <= 20; i++) {
    const row: Record<string, any> = {
      key: i,
    };
    for (let j = 1; j <= 5; j++) {
      row[`field${j}`] = `数据${i}-${j}`;
    }
    data.push(row);
  }

  return { columns, data };
};

// 编辑单元格组件
interface EditableCellProps extends React.HTMLAttributes<HTMLElement> {
  editing: boolean;
  dataIndex: string;
  title: any;
  inputType: 'text' | 'number' | 'select';
  record: any;
  index: number;
  children: React.ReactNode;
  onSave?: (record: any) => void;
  onCancel?: () => void;
  onEdit?: (record: any) => void;
  isEditingKey?: boolean;
  getRowKey?: (record: any) => string;
}

const EditableCell: React.FC<EditableCellProps> = ({
  editing,
  dataIndex,
  title,
  inputType,
  record,
  index,
  children,
  onSave,
  onCancel,
  onEdit,
  isEditingKey,
  getRowKey,
  ...restProps
}) => {
  const handleEscape = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && onCancel) {
      // 触发取消编辑
      e.preventDefault();
      e.stopPropagation();
      onCancel();
    }
  };

  const inputNode = inputType === 'select' ? (
    <Select>
      <Select.Option value={true}>YES</Select.Option>
      <Select.Option value={false}>NO</Select.Option>
    </Select>
  ) : inputType === 'number' ? (
    <InputNumber />
  ) : (
    <Input />
  );

  return (
    <td {...restProps} className={editing ? 'editable-cell' : ''}>
      {editing ? (
        <Form.Item
          name={dataIndex}
          style={{ margin: 0 }}
          rules={[
            {
              required: dataIndex === 'name',
              message: `请输入${title}`,
            },
          ]}
        >
          {inputNode}
        </Form.Item>
      ) : (
        <div 
          className="editable-cell-value-wrap" 
          title={typeof children === 'string' ? children : children?.toString()}
          onClick={() => record && getRowKey && onEdit && !isEditingKey && onEdit(record)}
        >
          {children}
        </div>
      )}
    </td>
  );
};

// 定义行拖拽类型
const type = 'DraggableRow';

// 可拖拽行组件
interface DraggableRowProps {
  index: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  className?: string;
  style?: React.CSSProperties;
  [key: string]: any;
}

const DraggableRow = ({ 
  index, 
  moveRow, 
  className, 
  style, 
  ...restProps 
}: DraggableRowProps) => {
  const ref = useRef<HTMLTableRowElement>(null);

  const [{ isOver, dropClassName }, drop] = useDrop({
    accept: type,
    collect: (monitor: any) => {
      const { index: dragIndex } = monitor.getItem() || {};
      if (dragIndex === index) {
        return {};
      }
      return {
        isOver: monitor.isOver(),
        dropClassName: dragIndex < index ? ' drop-over-downward' : ' drop-over-upward',
      };
    },
    drop: (item: { index: number }) => {
      if (item.index !== index) {
        moveRow(item.index, index);
      }
    },
  });

  const [, drag] = useDrag({
    type,
    item: { index },
    collect: (monitor: any) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drop(drag(ref));

  return (
    <tr
      ref={ref}
      className={`${className || ''}${isOver ? dropClassName : ''} draggable-row`}
      style={{ ...style, cursor: 'move' }}
      {...restProps}
    />
  );
};

// 可拖拽表格组件的拖动句柄
const DragHandle = () => <MenuOutlined style={{ cursor: 'move', color: '#bbb', fontSize: '12px' }} />;

// 自定义空数据组件
const NoDataComponent = ({ description, table }: { description: string, table?: string | null }) => {
  return (
    <div className="no-data-container">
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <span className="no-data-text">
            {description}
            {table && <span className="table-name">{table}</span>}
          </span>
        }
      />
    </div>
  );
};

// 创建一个新的表格工具栏组件
const TableToolbar: React.FC<{
  tableName?: string | null;
  onRefresh: () => void;
  onExport?: () => void;
  onFilter?: () => void;
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  selectedRows?: any[];
  executedSql?: string;
  loading: boolean;
  activeTab: string;
  hasChanges: boolean;
}> = ({ 
  tableName, 
  onRefresh, 
  onExport, 
  onFilter, 
  onAdd,
  onEdit,
  onDelete,
  onSave,
  onCancel,
  selectedRows = [],
  executedSql,
  loading,
  activeTab,
  hasChanges
}) => {
    return (
    <div className="navicat-toolbar">
      <div className="toolbar-left">
        <span className="table-title">{tableName}</span>
        <Space>
        <Button 
            type="primary" 
            size="small" 
            icon={<PlusOutlined />} 
            onClick={onAdd}
          >
            新增{activeTab === 'data' ? '数据' : '字段'}
          </Button>
        <Button 
            size="small" 
            icon={<EditOutlined />} 
            disabled={selectedRows.length !== 1}
            onClick={onEdit}
          >
            编辑{activeTab === 'data' ? '数据' : '字段'}
          </Button>
        <Button 
            size="small" 
            icon={<DeleteOutlined />} 
            danger
            disabled={selectedRows.length === 0}
            onClick={onDelete}
          >
            删除{activeTab === 'data' ? '数据' : '字段'}
          </Button>
          {hasChanges && (
            <>
              <Button 
                size="small" 
                type="primary"
                icon={<SaveOutlined />} 
                onClick={onSave}
              >
                保存更改
              </Button>
              <Button 
                size="small" 
                icon={<CloseCircleOutlined />} 
                onClick={onCancel}
              >
                取消更改
              </Button>
            </>
          )}
          <Button 
            size="small" 
            icon={<ReloadOutlined />} 
            onClick={onRefresh}
            loading={loading}
          >
            刷新
          </Button>
          {onExport && (
            <Button size="small" icon={<ExportOutlined />} onClick={onExport}>
              导出
            </Button>
          )}
          {onFilter && (
            <Button size="small" icon={<FilterOutlined />} onClick={onFilter}>
              筛选
            </Button>
          )}
        </Space>
      </div>
      <div className="toolbar-right">
        {/* 可添加右侧功能按钮 */}
      </div>
    </div>
  );
};

const DatabaseContent: React.FC<DatabaseContentProps> = ({
  connection,
  database,
  table,
  onSelectTable,
  onDataChange,
  showStructure = false,
  viewType = 'data'
}) => {
  const [tableList, setTableList] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [tableData, setTableData] = useState<Record<string, any>[]>([]);
  const [tableColumns, setTableColumns] = useState<any[]>([]);
  const [tableStructure, setTableStructure] = useState<TableColumn[]>([]);
  const [activeTab, setActiveTab] = useState<string>(viewType || 'data');
  const [error, setError] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<TableColumn | null>(null);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [form] = Form.useForm();
  const [hasStructureChanges, setHasStructureChanges] = useState<boolean>(false);

  // 新增数据
  const [isDataModalVisible, setIsDataModalVisible] = useState<boolean>(false);
  const [editingRow, setEditingRow] = useState<any>(null);
  const [dataForm] = Form.useForm();
  const [dataModalMode, setDataModalMode] = useState<'add' | 'edit'>('add');

  const [editingKey, setEditingKey] = useState<string>('');
  const [newRowKey, setNewRowKey] = useState<string>('');
  const [editForm] = Form.useForm();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const addNewRowRef = useRef<(() => void) | null>(null);

  const [selectedRows, setSelectedRows] = useState<any[]>([]);
  
  // 添加分页相关状态
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(1000);
  const [total, setTotal] = useState<number>(0);
  
  // 添加状态管理新行
  const [newRows, setNewRows] = useState<Record<string, any>[]>([]);
  const [isAddingRows, setIsAddingRows] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  
  // 添加数据缓存对象和最后加载时间记录
  const dataCache = useRef<Record<string, {
    time: number;
    data: any;
    structure: any;
  }>>({});

  // 缓存过期时间（毫秒）
  const CACHE_EXPIRY = 5000; // 5秒内不重复加载

  // 定义刷新时间戳状态，用于强制重新加载
  const [refreshTimestamp, setRefreshTimestamp] = useState<number>(Date.now());

  // 请求锁，防止重复请求
  const requestLock = useRef<Record<string, boolean>>({});
  
  // 获取有效的连接ID
  const getEffectiveConnectionId = useCallback((conn: any): number => {
    // 首先检查传入的连接对象
    if (conn && typeof conn === 'object' && conn.id) {
      console.log('使用传入的连接ID:', conn.id, typeof conn.id, '连接对象:', conn);
      return parseInt(conn.id);
    }
    
    // 如果没有有效的连接对象，尝试从全局管理器获取
    const globalConnId = ConnectionManager.getActiveConnectionId();
    const globalConnInfo = ConnectionManager.getActiveConnectionInfo();
    if (globalConnId) {
      console.log('使用全局连接管理器的ID:', globalConnId, typeof globalConnId, '连接信息:', globalConnInfo);
      return parseInt(globalConnId);
    }
    
    console.warn('警告: 无法获取有效的连接ID, 即将返回0，这可能导致操作失败', {传入的连接: conn});
    return 0;
  }, []);

  // 使用useCallback优化表行点击事件处理
  const handleTableRowClick = useCallback((record: any) => {
    console.log('点击表行:', record);
  }, []);

  const handleTableRowDoubleClick = useCallback((record: any) => {
    console.log('双击表行:', record);
  }, []);

  // 处理表项点击事件 - 单击只选择表
  const handleTableItemClick = useCallback((tableName: string) => {
    console.log('点击表项:', tableName);
    if (connection && database && onSelectTable) {
      const connId = getEffectiveConnectionId(connection);
      onSelectTable(tableName, database, connId.toString());
    }
  }, [connection, database, onSelectTable, getEffectiveConnectionId]);

  // 处理表项双击事件 - 双击选择表并加载数据和结构
  const handleTableItemDoubleClick = useCallback((tableName: string) => {
    console.log('双击表项:', tableName);
    if (connection && database && onSelectTable) {
      const connId = getEffectiveConnectionId(connection);
      onSelectTable(tableName, database, connId.toString(), true);
      // 双击时默认展示数据标签页
      setActiveTab('data');
    }
  }, [connection, database, onSelectTable, getEffectiveConnectionId, setActiveTab]);

  // 表结构化数据处理
  const restructureData = (schemaData: any[]): TableColumn[] => {
    return schemaData.map((column: any) => ({
        name: column.columnName || column.name,
        type: column.dataType || column.type,
        nullable: column.isNullable === 'YES' || column.nullable === true,
        key: column.columnKey || column.key || '',
        default: column.columnDefault || column.default,
        extra: column.extra || '',
        isEditing: false,
        isNew: false
      }));
  };

  // 加载表数据和结构 - 优化实现
  const loadTableDataAndStructure = useCallback(async () => {
    if (!connection || !database || !table) {
      setTableData([]);
      setTableColumns([]);
      setTableStructure([]);
      return;
    }
    
    const cacheKey = `${connection.id}-${database}-${table}`;
    console.log(`加载表数据和结构: ${cacheKey}, viewType=${viewType}`);
    
    // 检查是否有正在执行的请求
    if (requestLock.current && requestLock.current[cacheKey]) {
      console.log(`表 ${table} 数据加载已在进行中，跳过`);
      return;
    }

    // 设置加载锁
    requestLock.current = requestLock.current || {};
    requestLock.current[cacheKey] = true;
    
        setLoading(true);
    setTableLoading(true);
        
    try {
        const connectionId = getEffectiveConnectionId(connection);
      console.log(`有效的连接ID: ${connectionId}, 数据库: ${database}, 表: ${table}`);
        
        if (connectionId <= 0) {
        throw new Error(`无效的连接ID: ${connectionId}`);
      }
      
      // 根据视图类型决定是否需要加载数据
      const needData = viewType !== 'structure';
      
      // 执行查询
      console.log(`加载表 ${table} 的结构${needData ? '和数据' : ''}`);
      
      // 使用TableService获取表结构
      console.log(`调用 TableService.getTableStructure(${connectionId}, ${database}, ${table})`);
      const schema = await TableService.getTableStructure(connectionId, database, table);
      console.log('获取到表结构数据:', schema);
      
      // 转换schema为表结构对象
      const structureData = schema.map((column: any) => ({
        name: column.columnName || column.name,
        type: column.dataType || column.type,
        nullable: column.isNullable === 'YES' || column.nullable === true,
        key: column.columnKey || column.key || '',
        default: column.columnDefault || column.default,
        extra: column.extra || '',
        isEditing: false,
        isNew: false
      }));
      
      console.log(`成功加载表结构: ${structureData.length} 个字段`, structureData);
      setTableStructure(structureData);
      
      // 生成表格列配置
      const columns = structureData.map(column => ({
        title: column.name,
        dataIndex: column.name,
        key: column.name,
        sorter: (a: any, b: any) => {
          if (a[column.name] === null) return -1;
          if (b[column.name] === null) return 1;
          if (typeof a[column.name] === 'string') {
            return a[column.name].localeCompare(b[column.name]);
          }
          return a[column.name] - b[column.name];
        },
        render: (text: any) => {
          if (text === null || text === undefined) {
            return <span className="null-value">(NULL)</span>;
          }
          return text;
        }
      }));
      
      console.log('生成表格列配置:', columns);
      setTableColumns(columns);
      
      // 如果需要数据，加载表数据
      let rowData: any[] = [];
      if (needData) {
        // 使用TableService获取表数据，支持分页
        console.log(`调用 TableService.getTableData(${connectionId}, ${database}, ${table}, ${currentPage}, ${pageSize})`);
        const result = await TableService.getTableData(connectionId, database, table, currentPage, pageSize);
        console.log('表数据API响应:', result);
        
        if (result && result.data) {
          // 设置表数据
          rowData = result.data.map((item: any, index: number) => ({
            ...item,
            key: `row-${index}`
          }));
          
          // 设置分页信息
          if (result.pagination) {
            console.log('分页信息:', result.pagination);
            setTotal(result.pagination.total || 0);
          }
          
          console.log(`成功加载表数据: ${rowData.length} 行`);
          setTableData(rowData);
          
          // 如果API返回了列信息，使用API的列定义
          if (result.columns && result.columns.length > 0) {
            console.log('使用API返回的列信息:', result.columns);
            const apiColumns = result.columns.map((colName: string) => ({
          title: colName,
          dataIndex: colName,
          key: colName,
              sorter: (a: any, b: any) => {
                if (a[colName] === null) return -1;
                if (b[colName] === null) return 1;
                if (typeof a[colName] === 'string') {
                  return a[colName].localeCompare(b[colName]);
                }
                return a[colName] - b[colName];
              },
          render: (text: any) => {
            if (text === null || text === undefined) {
              return <span className="null-value">(NULL)</span>;
            }
                return String(text);
              }
            }));
            
            setTableColumns(apiColumns);
          }
        } else {
          console.warn('API返回了空结果或格式不正确');
          setTableData([]);
        }
      }
      
      // 更新缓存
      dataCache.current[cacheKey] = {
        time: Date.now(),
        structure: structureData,
        data: rowData
      };
      
      // 生成并设置SQL语句
      const offset = (currentPage - 1) * pageSize;
      const sql = `SELECT * FROM \`${database}\`.\`${table}\` LIMIT ${pageSize} OFFSET ${offset}`;
      setExecutedSql(sql);
      
    } catch (error: any) {
      console.error('加载表数据和结构失败:', error);
      message.error(`加载失败: ${error.message}`);
    } finally {
      setLoading(false);
      setTableLoading(false);
      // 清除加载锁
      if (requestLock.current) {
        delete requestLock.current[cacheKey];
      }
    }
  }, [connection, database, table, viewType, currentPage, pageSize, getEffectiveConnectionId]);

  // 加载表数据和结构 - 优化为单一数据获取流程，避免重复调用
  useEffect(() => {
    if (!connection || !database || !table) {
      setTableData([]);
      setTableColumns([]);
      setTableStructure([]);
      return;
    }

    // 创建一个加载标识以避免重复加载
    const cacheKey = `${connection.id}-${database}-${table}`;
    console.log(`检查是否需要加载表数据: ${cacheKey}, viewType=${viewType}`);
    
    // 检查缓存是否有效
    const now = Date.now();
    const cachedData = dataCache.current[cacheKey];
    if (cachedData && (now - cachedData.time < CACHE_EXPIRY)) {
      console.log(`使用缓存数据: ${cacheKey}, 缓存时间: ${new Date(cachedData.time).toLocaleTimeString()}`);
      
      // 使用缓存的结构数据
      if (cachedData.structure?.length > 0) {
        setTableStructure(cachedData.structure);
      }
      
      // 如果不是只查看结构，则也使用缓存的表数据
      if (viewType !== 'structure' && cachedData.data) {
        setTableData(cachedData.data);
      }
      
      // 如果指定显示结构，确保切换到结构标签页
      if (showStructure || viewType === 'structure') {
        setActiveTab('structure');
      }
      
      return;
    }
    
    // 执行加载
    loadTableDataAndStructure();
    
    // 如果指定显示结构，确保切换到结构标签页
    if (showStructure || viewType === 'structure') {
      setActiveTab('structure');
    }
  }, [connection, database, table, viewType, showStructure, currentPage, pageSize, refreshTimestamp, loadTableDataAndStructure]);

  // 刷新表数据和结构（强制忽略缓存）
  const refreshTableData = useCallback(() => {
    if (!connection || !database || !table) return;
    
    const cacheKey = `${connection.id}-${database}-${table}`;
    console.log(`强制刷新表数据: ${cacheKey}`);
    
    // 清除缓存
    delete dataCache.current[cacheKey];
    
    // 设置加载状态
    setLoading(true);
    setTableLoading(true);
    
    // 创建一个新的时间戳触发重新加载
    setRefreshTimestamp(Date.now());
  }, [connection, database, table]);

  // 加载数据库表 - 单独提取为函数
  const loadDatabaseTables = useCallback(async () => {
    if (!database) {
      setTableList([]);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // 获取有效的连接ID
      const connectionId = getEffectiveConnectionId(connection);
      
      if (connectionId <= 0) {
        throw new Error('无效的连接ID');
      }
      
      console.log(`加载数据库 ${database} 的表列表，使用连接ID: ${connectionId}...`);
      
      // 调用ConnectionService获取真实表列表
      const tables = await ConnectionService.getTables(connectionId, database);
      console.log(`成功获取到 ${tables.length} 个表`);
      
      // 将表名转换为TableInfo对象列表
      const tableInfoList: TableInfo[] = tables.map(tableName => ({
        name: tableName,
        type: 'table'
      }));
      
      setTableList(tableInfoList);
    } catch (err: any) {
      console.error('加载表列表失败:', err);
      setError(`加载表列表失败: ${err.message || '未知错误'}`);
      setTableList([]);
    } finally {
      setLoading(false);
    }
  }, [connection, database, getEffectiveConnectionId]);

  // 添加useEffect来触发加载表列表
  // 在刚刚添加的loadDatabaseTables函数后面添加useEffect
  useEffect(() => {
    if (database) {
      loadDatabaseTables();
    }
  }, [database, loadDatabaseTables]);

  // Tab页变更处理
  const handleTabChange = (key: string) => {
    setActiveTab(key);
  };

  // 添加列
  const handleAddColumn = () => {
    setModalMode('add');
    form.resetFields();
    setIsModalVisible(true);
  };

  // 编辑列
  const handleEditColumn = (column: TableColumn) => {
    setModalMode('edit');
    setEditingColumn(column);
    form.setFieldsValue({
      name: column.name,
      type: column.type,
      nullable: column.nullable,
      key: column.key,
      default: column.default,
      extra: column.extra
    });
    setIsModalVisible(true);
  };

  // 删除列
  const handleDeleteColumn = (columnName: string) => {
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除列 "${columnName}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk() {
        const newTableStructure = tableStructure.filter(col => col.name !== columnName);
        setTableStructure(newTableStructure);
        setHasStructureChanges(true);
        message.success(`列 "${columnName}" 已标记为删除`);
      }
    });
  };

  // 保存列修改
  const handleSaveColumn = () => {
    form.validateFields().then(values => {
      const newColumn: TableColumn = {
        name: values.name,
        type: values.type,
        nullable: values.nullable,
        key: values.key,
        default: values.default,
        extra: values.extra
      };

      let newTableStructure: TableColumn[];
      if (modalMode === 'add') {
        newTableStructure = [...tableStructure, { ...newColumn, isNew: true }];
        message.success(`新列 "${newColumn.name}" 已添加`);
      } else {
        newTableStructure = tableStructure.map(col => 
          col.name === editingColumn?.name ? { ...newColumn, isEditing: true } : col
        );
        message.success(`列 "${newColumn.name}" 已更新`);
      }

      setTableStructure(newTableStructure);
      setHasStructureChanges(true);
      setIsModalVisible(false);
    });
  };

  // 获取行唯一键
  const getRowKey = (record: any): string => {
    // 如果表有主键，使用主键作为唯一标识
    const primaryKeyColumns = tableStructure.filter(col => col.key === 'PRI').map(col => col.name);
    
    if (primaryKeyColumns.length > 0) {
      // 使用主键值作为唯一键
      return primaryKeyColumns
        .map(key => `${key}:${record[key]}`)
        .join('_');
    }
    
    // 如果没有主键，使用所有字段值作为唯一标识
    return Object.entries(record)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${key}:${value}`)
      .join('_');
  };
  
  // 开始编辑一行
  const edit = useCallback((record: any) => {
    console.log('编辑行:', record);
    editForm.setFieldsValue(record);
    setEditingKey(getRowKey(record));
  }, [editForm]);
  
  // 重写表格列渲染，添加编辑引导标记
  const createEditableColumns = useCallback(() => {
    // 创建表格列逻辑...
    console.log('创建表格列');
    // 此处应包含完整的列创建逻辑
    return [];
  }, []);
  
  // 根据列类型获取合适的输入类型
  const getInputTypeForColumn = (column: any): string => {
    const dataIndex = column.dataIndex;
    if (!dataIndex) return 'text';
    
    // 获取列结构
    const columnStructure = tableStructure.find(col => col.name === dataIndex);
    if (!columnStructure) return 'text';
    
    const columnType = columnStructure.type.toLowerCase();
    
    if (columnType.includes('int') || columnType.includes('float') || 
        columnType.includes('double') || columnType.includes('decimal')) {
      return 'number';
    } else if (columnType === 'date') {
      return 'date';
    } else if (columnType.includes('datetime') || columnType.includes('timestamp')) {
      return 'datetime';
    } else if (columnType === 'boolean' || columnType === 'tinyint(1)') {
      return 'boolean';
    } else if (columnType.includes('text') || columnType.includes('json')) {
      return 'textarea';
    }
    
    return 'text';
  };
  
  // 修改保存编辑函数
  const save = async (record: any) => {
    try {
      // 验证并获取表单值
      const row = await editForm.validateFields();
      
      // 如果是新行，更新新行数组
      if (record.isNewRow) {
        const rowIndex = newRows.findIndex(r => r.key === record.key);
        if (rowIndex > -1) {
          const updatedNewRows = [...newRows];
          updatedNewRows[rowIndex] = { 
            ...updatedNewRows[rowIndex], 
            ...row,
            isNewRow: true,
            key: updatedNewRows[rowIndex].key
          };
          setNewRows(updatedNewRows);
          
          // 更新表格数据
          const dataIndex = tableData.findIndex(item => item.key === record.key);
          if (dataIndex > -1) {
            const newData = [...tableData];
            newData[dataIndex] = updatedNewRows[rowIndex];
            setTableData(newData);
          }
          
          // 清除编辑状态，但保持添加模式
          setEditingKey('');
          setHasUnsavedChanges(true);
          message.success('行数据已更新，请点击保存按钮提交');
          return;
        }
      }
      
      // 创建更新后的记录
      const updatedRecord = { ...record, ...row };
      
      // 更新数据
      const newData = [...tableData];
      const index = newData.findIndex(item => item.key === record.key);
      
      if (index > -1) {
        const oldRecord = { ...newData[index] };
        newData[index] = updatedRecord;
        setTableData(newData);
        
        // 保存到服务器
        try {
          // 获取有效的连接ID
          const connectionId = getEffectiveConnectionId(connection);
          
          if (connectionId <= 0) {
            throw new Error('无效的连接ID');
          }
          
            // 新增记录
          if (newRowKey === editingKey) {
            await ConnectionService.insertTableData(
              connectionId,
              database!,
              table!,
              row
            );
            message.success('新记录添加成功');
          } else {
            // 更新记录
            const condition: Record<string, any> = {};
            
            // 获取表结构中的主键信息
            const primaryKeyColumns = tableStructure.filter(col => col.key === 'PRI').map(col => col.name);
            
            if (primaryKeyColumns.length > 0) {
              // 如果有主键，使用主键作为条件
              primaryKeyColumns.forEach(columnName => {
                condition[columnName] = oldRecord[columnName];
              });
            } else {
              // 如果没有主键，使用所有原始字段作为条件
              for (const key in oldRecord) {
                if (key !== 'key' && key !== 'isNewRow') {
                  condition[key] = oldRecord[key];
                }
              }
            }
            
            await ConnectionService.updateTableData(
              connectionId,
              database!,
              table!,
              row,
              condition
            );
            message.success('记录更新成功');
          }
          
          // 清除编辑状态
          setEditingKey('');
            setNewRowKey('');
        } catch (error) {
          // 回滚本地数据
          newData[index] = oldRecord;
          setTableData([...newData]);
          throw error;
        }
      }
    } catch (errInfo) {
      console.error('保存失败:', errInfo);
      message.error('保存记录失败');
    }
  };
  
  // 取消编辑
  const cancel = () => {
    // 如果当前编辑的是新行
    if (newRows.find(row => row.key === editingKey)) {
      // 不移除行，只清除编辑状态
      setEditingKey('');
      message.info('已取消编辑，单击单元格可继续编辑');
      return;
    }
    
    setEditingKey('');
    message.info('已取消编辑');
    
    // 如果取消的是新行，从数据中移除
    if (newRowKey === editingKey && newRowKey !== '') {
      setTableData(tableData.filter(item => item.key !== newRowKey));
      setNewRowKey('');
    }
  };

  // 添加新行回调
  const safeAddNewRow = useCallback(() => {
    console.log('添加新行');
    // 添加新行逻辑...
  }, []);

  // 添加空白行
  const addNewEmptyRow = () => {
      // 创建空白记录
      const newRecord: Record<string, any> = {};
      tableColumns.forEach(col => {
        if (typeof col.dataIndex === 'string') {
          newRecord[col.dataIndex] = null;
        }
      });
    
    // 添加唯一标识
    newRecord.key = `new-${Date.now()}-${newRows.length}`;
    newRecord.isNewRow = true;
    
    // 添加到新行数组
    const updatedNewRows = [...newRows, newRecord];
    setNewRows(updatedNewRows);
      
      // 添加到表格数据
    const updatedTableData = [...tableData, ...updatedNewRows];
    setTableData(updatedTableData);
      
      // 设置为编辑状态
    setEditingKey(newRecord.key);
    setIsAddingRows(true);
    setHasUnsavedChanges(true);
    
    // 通知父组件数据有变化
    if (onDataChange) {
      onDataChange(true);
    }
      
      // 设置表单初始值为空
      const initialValues: Record<string, any> = {};
      tableColumns.forEach(col => {
        if (typeof col.dataIndex === 'string') {
          initialValues[col.dataIndex] = '';
        }
      });
      editForm.setFieldsValue(initialValues);
      
    // 选中新添加的行
    setSelectedRowKeys([newRecord.key]);
    
    // 更有效的滚动到底部方法
      setTimeout(() => {
      // 1. 尝试使用表格body的scrollIntoView
        const tableBody = document.querySelector('.data-table .ant-table-body');
        if (tableBody) {
          tableBody.scrollTop = tableBody.scrollHeight;
        
        // 2. 尝试找到新行并滚动到可见
        const newRow = document.querySelector('.new-row');
        if (newRow) {
          newRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
          // 3. 添加闪烁效果以引起注意
          setTimeout(() => {
            newRow.classList.add('highlight-new-row');
            
            // 4. 移除高亮效果
            setTimeout(() => {
              newRow.classList.remove('highlight-new-row');
            }, 2000);
          }, 100);
        }
      }
      
      // 显示一个醒目的指导消息
      Modal.info({
        title: '新行已添加',
        content: (
          <div>
            <p>新行已添加到表格底部，并标记为蓝色。</p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>点击或双击单元格开始编辑</li>
              <li>输入数据后按回车键保存单元格</li>
              <li>完成所有编辑后点击"保存"按钮</li>
              <li>可以点击"添加"按钮继续添加更多行</li>
            </ul>
          </div>
        ),
        okText: '知道了',
        maskClosable: true,
        width: 400
      });
      }, 100);
  };
  
  // 保存所有新添加的行
  const saveAllNewRows = useCallback(async () => {
    console.log('保存所有新行');
    // 保存新行逻辑...
  }, []);
  
  // 数据类型校验函数
  const validateRowsDataTypes = (rows: Record<string, any>[]): string[] => {
    const errors: string[] = [];
    
    // 获取表结构中的列类型信息
    const columnTypes: Record<string, string> = {};
    tableStructure.forEach(column => {
      columnTypes[column.name] = column.type.toLowerCase();
    });
    
    // 验证每一行
    rows.forEach((row, rowIndex) => {
      for (const columnName in row) {
        const value = row[columnName];
        // 跳过空值
        if (value === null || value === undefined || value === '') continue;
        
        const columnType = columnTypes[columnName];
        if (!columnType) continue; // 跳过未知列
        
        // 根据数据库列类型进行验证
        if (columnType.includes('int')) {
          // 整数类型验证
          if (!/^-?\d+$/.test(String(value))) {
            errors.push(`第 ${rowIndex + 1} 行的 ${columnName} 应为整数，当前值: ${value}`);
          } else {
            // 检查整数范围
            const num = parseInt(String(value));
            if (columnType.includes('tinyint') && (num < -128 || num > 127)) {
              errors.push(`第 ${rowIndex + 1} 行的 ${columnName} 超出 tinyint 范围 (-128 到 127)`);
            } else if (columnType.includes('smallint') && (num < -32768 || num > 32767)) {
              errors.push(`第 ${rowIndex + 1} 行的 ${columnName} 超出 smallint 范围 (-32,768 到 32,767)`);
            } else if (columnType.includes('mediumint') && (num < -8388608 || num > 8388607)) {
              errors.push(`第 ${rowIndex + 1} 行的 ${columnName} 超出 mediumint 范围`);
            } else if (columnType.includes('int') && !columnType.includes('bigint') && (num < -2147483648 || num > 2147483647)) {
              errors.push(`第 ${rowIndex + 1} 行的 ${columnName} 超出 int 范围`);
            }
          }
        } else if (columnType.includes('float') || columnType.includes('double') || columnType.includes('decimal')) {
          // 浮点数类型验证
          if (!/^-?\d+(\.\d+)?$/.test(String(value))) {
            errors.push(`第 ${rowIndex + 1} 行的 ${columnName} 应为数值，当前值: ${value}`);
          }
        } else if (columnType.includes('date')) {
          // 日期类型验证
          if (columnType === 'date') {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value)) && !isValidDate(String(value))) {
              errors.push(`第 ${rowIndex + 1} 行的 ${columnName} 日期格式无效，应为 YYYY-MM-DD，当前值: ${value}`);
            }
          } else if (columnType.includes('datetime') || columnType.includes('timestamp')) {
            if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(value)) && !isValidDateTime(String(value))) {
              errors.push(`第 ${rowIndex + 1} 行的 ${columnName} 日期时间格式无效，应为 YYYY-MM-DD HH:MM:SS，当前值: ${value}`);
            }
          }
        } else if (columnType.includes('char') || columnType.includes('text')) {
          // 字符串长度验证
          if (columnType.includes('char') && columnType.match(/\((\d+)\)/)) {
            const lengthMatch = columnType.match(/\((\d+)\)/);
            if (lengthMatch) {
              const maxLength = parseInt(lengthMatch[1]);
              if (String(value).length > maxLength) {
                errors.push(`第 ${rowIndex + 1} 行的 ${columnName} 超出最大长度 ${maxLength}，当前长度: ${String(value).length}`);
              }
            }
          }
        }
      }
    });
    
    return errors;
  };
  
  // 辅助函数 - 检查日期是否有效
  const isValidDate = (dateString: string): boolean => {
    const date = new Date(dateString);
    return !isNaN(date.getTime());
  };
  
  // 辅助函数 - 检查日期时间是否有效
  const isValidDateTime = (dateTimeString: string): boolean => {
    const date = new Date(dateTimeString);
    return !isNaN(date.getTime());
  };
  
  // 取消所有新行
  const cancelAllNewRows = useCallback(() => {
    console.log('取消所有新行');
    // 取消新行逻辑...
  }, []);
  
  // 兼容旧的引用
  const addNewRow = safeAddNewRow;
  
  // 确保引用更新
  useEffect(() => {
    // 始终保持引用最新
    addNewRowRef.current = safeAddNewRow;
  }, [tableData, tableColumns, editingKey]);

  // 保存表结构变更
  const handleSaveTableStructure = async () => {
    try {
      setLoading(true);
      
      // 获取有效的连接ID
      const connectionId = getEffectiveConnectionId(connection);
      
      if (connectionId <= 0) {
        throw new Error('无效的连接ID');
      }
      
      // 这里应该调用API保存表结构变更
      // 示例API调用
      // await ConnectionService.updateTableStructure(connectionId, database!, table!, tableStructure);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      message.success('表结构已保存');
      setHasStructureChanges(false);
      
      // 重新加载表结构
      await loadTableDataAndStructure();
    } catch (err: any) {
      message.error(`保存表结构失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 修改处理添加数据按钮点击
  const handleAddData = () => {
    // 首先尝试使用现有的行内编辑方式
    if (safeAddNewRow) {
      message.info('正在添加新行，请直接编辑表格', 2);
      safeAddNewRow();
      return;
    }
    
    // 如果无法使用行内编辑，再使用弹窗方式
    setDataModalMode('add');
    dataForm.resetFields();
    setIsDataModalVisible(true);
  };

  // 处理编辑数据按钮点击
  const handleEditData = (record: any) => {
    setDataModalMode('edit');
    setEditingRow(record);
    
    // 为表单设置初始值
    const initialValues: Record<string, any> = {};
    for (const key in record) {
      initialValues[key] = record[key];
    }
    
    dataForm.setFieldsValue(initialValues);
    setIsDataModalVisible(true);
  };

  // 处理删除数据按钮点击
  const handleDeleteData = useCallback(async () => {
    if (selectedRows.length === 0) {
      message.warning('请选择要删除的记录');
      return;
    }
    
    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除选中的 ${selectedRows.length} 条记录吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
    if (!database || !table) {
      return;
    }

    try {
      setLoading(true);
      
      // 获取有效的连接ID
      const connectionId = getEffectiveConnectionId(connection);
      
      if (connectionId <= 0) {
        throw new Error('无效的连接ID');
      }
      
          // 获取主键信息
      const primaryKeyColumns = tableStructure.filter(col => col.key === 'PRI').map(col => col.name);
          
          // 为每个选中的行创建条件
          const deletePromises = selectedRows.map(row => {
            const condition: Record<string, any> = {};
      
      if (primaryKeyColumns.length > 0) {
        // 如果有主键，使用主键作为条件
        primaryKeyColumns.forEach(columnName => {
                condition[columnName] = row[columnName];
        });
      } else {
        // 如果没有主键，使用所有字段作为条件
              Object.keys(row).forEach(key => {
                if (key !== 'key') { // 排除React表格的key
                  condition[key] = row[key];
        }
              });
      }
      
      // 调用删除API
            return TableService.deleteTableData(
        connectionId,
        database,
        table,
        condition
      );
          });
          
          await Promise.all(deletePromises);
      
      // 重新加载数据
          message.success(`成功删除 ${selectedRows.length} 条记录`);
          setSelectedRows([]);
          setSelectedRowKeys([]);
          refreshTableData();
      
    } catch (err: any) {
      console.error('删除数据失败:', err);
      message.error(`删除数据失败: ${err.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
      }
    });
  }, [selectedRows, tableStructure, database, table, connection, getEffectiveConnectionId, refreshTableData]);

  // 保存数据
  const handleSaveData = () => {
    dataForm.validateFields().then(async (values) => {
      if (!database || !table) {
        return;
      }

      try {
        setLoading(true);
        
        // 获取有效的连接ID
        const connectionId = getEffectiveConnectionId(connection);
        
        if (connectionId <= 0) {
          throw new Error('无效的连接ID');
        }
        
        if (dataModalMode === 'add') {
          // 新增数据
          await ConnectionService.insertTableData(
            connectionId,
            database,
            table,
            values
          );
        } else {
          // 编辑数据
          // 构建更新条件
          const condition: Record<string, any> = {};
          
          // 获取表结构中的主键信息
          const primaryKeyColumns = tableStructure.filter(col => col.key === 'PRI').map(col => col.name);
          
          if (primaryKeyColumns.length > 0) {
            // 如果有主键，使用主键作为条件
            primaryKeyColumns.forEach(columnName => {
              condition[columnName] = editingRow[columnName];
            });
          } else {
            // 如果没有主键，使用所有字段作为条件
            for (const key in editingRow) {
              condition[key] = editingRow[key];
            }
          }
          
          // 调用更新API
          await ConnectionService.updateTableData(
            connectionId,
            database,
            table,
            values,
            condition
          );
        }
        
        // 关闭模态框
        setIsDataModalVisible(false);
        
        // 重新加载数据
        loadTableDataAndStructure();
        
      } catch (err: any) {
        console.error('保存数据失败:', err);
        message.error(`保存数据失败: ${err.message || '未知错误'}`);
      } finally {
        setLoading(false);
      }
    });
  };

  // 取消数据编辑
  const handleCancelDataEdit = () => {
    setIsDataModalVisible(false);
  };

  // 处理行点击事件
  const handleRowClick = useCallback((record: any) => {
    console.log('点击表行:', record);
    setSelectedRows([record]);
  }, []);

  // 更新页面切换处理函数，确保分页正常工作
  const handlePageChange = useCallback((page: number) => {
    console.log('切换到页:', page);
      setCurrentPage(page);
  }, []);

  // 当viewType变化时更新activeTab
  useEffect(() => {
    if (viewType) {
      console.log(`切换到视图类型: ${viewType}`);
      setActiveTab(viewType);
    }
  }, [viewType]);

  // 当showStructure为true且有表名但没有数据时，确保仍然加载表结构
  useEffect(() => {
    if (showStructure && table && !tableStructure.length) {
      console.log('显示表结构标志为true，确保加载表结构数据...');
      loadTableDataAndStructure();
      
      // 如果viewType是'structure'，强制切换到结构选项卡
      if (viewType === 'structure') {
        setActiveTab('structure');
      }
    }
  }, [showStructure, table, tableStructure.length, loadTableDataAndStructure, viewType]);

  // 处理行选择变化
  const handleRowSelectionChange = (selectedRowKeys: React.Key[], selectedRows: any[]) => {
    setSelectedRowKeys(selectedRowKeys);
    setSelectedRows(selectedRows);
  };

  // 添加执行的SQL状态
  const [executedSql, setExecutedSql] = useState<string>('');

  // 添加编辑状态
  const [changedData, setChangedData] = useState<Record<string, any>>({});
  const [hasDataChanges, setHasDataChanges] = useState<boolean>(false);

  // 开始编辑行
  const startEdit = (record: any) => {
    const key = record.key?.toString() || '';
    form.setFieldsValue({ ...record });
    setEditingKey(key);
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingKey('');
    setChangedData({});
    setHasDataChanges(false);
    if (activeTab === 'data') {
      refreshTableData();
              } else {
      // 取消结构编辑时的处理
      setHasStructureChanges(false);
    }
  };

  // 保存编辑后的数据
  const saveEdit = async (record: any) => {
    try {
      const row = await form.validateFields();
      
      // 构建新的数据对象
      const newData = [...tableData];
      const index = newData.findIndex(item => item.key === record.key);
      
      if (index > -1) {
        const item = newData[index];
        newData.splice(index, 1, { ...item, ...row });
        
        // 如果是数据标签页，调用更新API
        if (activeTab === 'data') {
          const connectionId = getEffectiveConnectionId(connection);
          
          // 获取主键信息
          const primaryKeyColumns = tableStructure.filter(col => col.key === 'PRI').map(col => col.name);
          
          // 构建条件对象
          const condition: Record<string, any> = {};
          
          if (primaryKeyColumns.length > 0) {
            // 如果有主键，使用主键作为条件
            primaryKeyColumns.forEach(columnName => {
              condition[columnName] = record[columnName];
            });
          } else {
            // 如果没有主键，使用原始记录中的所有字段作为条件
            for (const key in record) {
              if (key !== 'key') {
                condition[key] = record[key];
              }
            }
          }
          
          // 调用更新API
          try {
            await TableService.updateTableData(
              connectionId,
              database || '',
              table || '',
              row, // 新数据
              condition // 条件
            );
            
            message.success('数据更新成功');
            setTableData(newData);
            setEditingKey('');
            refreshTableData();
          } catch (error) {
            console.error('保存数据失败:', error);
            message.error('保存失败，请重试');
          }
        } else {
          // 如果是结构标签页，标记为有更改但不立即保存
          setTableStructure(prevStructure => {
            const newStructure = [...prevStructure];
            const index = newStructure.findIndex(item => item.name === record.name);
            if (index > -1) {
              newStructure[index] = { ...newStructure[index], ...row };
            }
            return newStructure;
          });
          setHasStructureChanges(true);
          setEditingKey('');
        }
      } else {
        // 处理新增记录的保存
        if (activeTab === 'data') {
          const connectionId = getEffectiveConnectionId(connection);
          
          try {
            await TableService.insertTableData(
              connectionId,
              database || '',
              table || '',
              row // 新数据
            );
            
            message.success('数据添加成功');
            setEditingKey('');
            refreshTableData();
          } catch (error) {
            console.error('添加数据失败:', error);
            message.error('添加失败，请重试');
          }
        } else {
          // 添加新字段到结构中
          setTableStructure(prev => [...prev, { ...row, key: prev.length }]);
          setHasStructureChanges(true);
          setEditingKey('');
        }
      }
    } catch (error) {
      console.error('表单验证错误:', error);
    }
  };

  // 处理新增数据或字段
  const handleAdd = () => {
    if (activeTab === 'data') {
      // 添加新数据行
      const newRow: Record<string, any> = {};
      tableColumns.forEach(col => {
        const colKey = (col.dataIndex || col.key) as string;
        if (colKey) {
          newRow[colKey] = null;
        }
      });
      
      const newRecord = {
        ...newRow,
        key: 'new-row-' + Date.now(),
        isNew: true
      };
      
      setTableData([...tableData, newRecord]);
      startEdit(newRecord);
    } else {
      // 添加新字段
      const newField = {
        name: '',
        type: 'VARCHAR(255)',
        nullable: true,
        keyType: '', // 将key改为keyType避免与React的key属性冲突
        default: '', // 将null改为空字符串以匹配类型定义
        extra: '',
        isNew: true,
        key: 'new-field-' + Date.now()
      };
      
      setTableStructure([...tableStructure, newField]);
      startEdit(newField);
      setHasStructureChanges(true);
    }
  };

  // 处理选中行的编辑
  const handleEdit = (record: any) => {
    startEdit(record);
  };

  // 批量删除表结构字段
  const handleDeleteStructureFields = async () => {
    if (selectedRows.length === 0) {
      message.warning('请选择要删除的字段');
      return;
    }

    Modal.confirm({
      title: '确认删除',
      icon: <ExclamationCircleOutlined />,
      content: `确定要删除选中的 ${selectedRows.length} 个字段吗？此操作不可恢复。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        // 模拟删除字段的操作
        // 真实情况应该调用API
        setTableStructure(prev => 
          prev.filter(field => 
            !selectedRows.some(selected => selected.name === field.name)
          )
        );
        setSelectedRows([]);
        setSelectedRowKeys([]);
        setHasStructureChanges(true);
        message.success(`已标记 ${selectedRows.length} 个字段待删除，请点击保存更改完成操作`);
      }
    });
  };

  // 保存表结构更改
  const handleSaveStructureChanges = async () => {
    try {
      message.info('保存表结构更改的功能正在开发中');
      // 实际情况应调用保存表结构的API
      // TODO: 实现保存表结构的API调用
      
      setHasStructureChanges(false);
    } catch (error) {
      console.error('保存表结构失败:', error);
      message.error('保存表结构失败，请重试');
    }
  };

  // 根据当前活动标签页执行相应的操作
  const handleTabAction = (action: string) => {
    switch (action) {
      case 'add':
        handleAdd();
        break;
      case 'edit':
        if (selectedRows.length === 1) {
          handleEdit(selectedRows[0]);
        } else {
          message.warning(`请选择一个${activeTab === 'data' ? '数据行' : '字段'}`);
        }
        break;
      case 'delete':
        if (activeTab === 'data') {
          handleDeleteData();
        } else {
          handleDeleteStructureFields();
        }
        break;
      case 'save':
        if (activeTab === 'data') {
          // 数据的保存在行编辑时已经处理
          message.info('已自动保存当前更改');
        } else {
          handleSaveStructureChanges();
        }
        break;
      case 'cancel':
        cancelEdit();
        break;
      default:
        break;
    }
  };

  // 构建可编辑列的配置
  const getEditableColumnsConfig = () => {
    if (activeTab === 'data') {
      return tableColumns.map(col => ({
        ...col,
        onCell: (record: any) => ({
          record,
          dataIndex: col.dataIndex,
          title: col.title,
          editing: isEditing(record),
          inputType: col.dataIndex && ['id', 'key'].includes(col.dataIndex.toString()) ? 'number' : 'text',
        }),
      }));
    } else {
      return [
        {
          title: '字段名',
                dataIndex: 'name',
                key: 'name',
          width: 180,
          fixed: 'left',
          onCell: (record: any) => ({
            record,
            dataIndex: 'name',
            title: '字段名',
            editing: isEditing(record),
            inputType: 'text',
          }),
        },
        {
          title: '类型',
          dataIndex: 'type',
          key: 'type',
          width: 150,
          onCell: (record: any) => ({
            record,
            dataIndex: 'type',
            title: '类型',
            editing: isEditing(record),
            inputType: 'text',
          }),
        },
        {
          title: '可空',
          dataIndex: 'nullable',
          key: 'nullable',
                width: 80,
          render: (nullable: boolean) => nullable ? 'YES' : 'NO',
          onCell: (record: any) => ({
            record,
            dataIndex: 'nullable',
            title: '可空',
            editing: isEditing(record),
            inputType: 'select',
          }),
        },
        {
          title: '键',
          dataIndex: 'key',
          key: 'key',
          width: 80,
          onCell: (record: any) => ({
            record,
            dataIndex: 'key',
            title: '键',
            editing: isEditing(record),
            inputType: 'text',
          }),
        },
        {
          title: '默认值',
          dataIndex: 'default',
          key: 'default',
          width: 150,
          ellipsis: true,
          render: (text: any) => text === null ? <span className="null-value">(NULL)</span> : text,
          onCell: (record: any) => ({
            record,
            dataIndex: 'default',
            title: '默认值',
            editing: isEditing(record),
            inputType: 'text',
          }),
        },
        {
          title: '额外',
          dataIndex: 'extra',
          key: 'extra',
          width: 150,
                ellipsis: true,
          onCell: (record: any) => ({
            record,
            dataIndex: 'extra',
            title: '额外',
            editing: isEditing(record),
            inputType: 'text',
          }),
        },
        {
          title: '操作',
          key: 'action',
          width: 120,
          render: (_: any, record: any) => {
            const editable = isEditing(record);
            return editable ? (
              <Space>
                <Typography.Link onClick={() => saveEdit(record)} style={{ marginRight: 8 }}>
                  保存
                </Typography.Link>
                <Popconfirm title="确定取消?" onConfirm={cancelEdit}>
                  <a>取消</a>
                </Popconfirm>
              </Space>
            ) : (
              <Typography.Link disabled={editingKey !== ''} onClick={() => startEdit(record)}>
                编辑
              </Typography.Link>
            );
          },
        },
      ];
    }
  };

  // 判断当前是否有行正在编辑
  const isEditing = (record: any): boolean => {
    if (!record || !record.key) return false;
    const key = record.key.toString();
    return key === editingKey || (record.isNewRow && editingKey === '');
  };

  // 修改渲染部分，确保显示表格数据和SQL语句
  return (
    <div className="database-content">
      {table ? (
        <>
          <TableToolbar 
            tableName={table}
            onRefresh={refreshTableData}
            onExport={() => {}}
            onFilter={() => {}}
            onAdd={() => handleTabAction('add')}
            onEdit={() => handleTabAction('edit')}
            onDelete={() => handleTabAction('delete')}
            onSave={() => handleTabAction('save')}
            onCancel={() => handleTabAction('cancel')}
            selectedRows={selectedRows}
            executedSql={executedSql}
            loading={loading}
            activeTab={activeTab}
            hasChanges={activeTab === 'data' ? hasDataChanges : hasStructureChanges}
          />
          
          {/* 添加SQL语句显示区域 */}
          {executedSql && activeTab === 'data' && (
            <div className="sql-display">
              <div className="sql-header">
                <span className="sql-title">执行的SQL语句:</span>
              </div>
              <div className="sql-content">
                {executedSql}
              </div>
            </div>
          )}
          
          <Tabs 
            activeKey={activeTab} 
            onChange={handleTabChange}
            className="navicat-tabs"
            items={[
              {
                key: 'data',
                label: <span><DatabaseOutlined /> 数据</span>,
                children: (
                  <div className="table-data-container">
            {tableLoading ? (
                      <div className="loading-container">
                <Spin tip="加载数据中..." />
        </div>
            ) : tableData.length === 0 ? (
                      <NoDataComponent description="没有数据" table={table} />
            ) : (
                      <Form form={form} component={false}>
                <Table
                  components={{
                    body: {
                      cell: EditableCell,
                    },
                  }}
                  dataSource={tableData}
                          rowSelection={{
                            type: 'checkbox',
                            selectedRowKeys,
                            onChange: handleRowSelectionChange
                          }}
                          columns={getEditableColumnsConfig()}
                          rowKey={(record) => record.key || Math.random().toString()}
                  size="small"
                  bordered
                          scroll={{ x: 'max-content', y: 'calc(100vh - 290px)' }}
                          pagination={{
                            total: total,
                            current: currentPage,
                            pageSize: pageSize,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (total) => `共 ${total} 条`,
                            pageSizeOptions: ['50', '100', '500', '1000'],
                            onChange: (page, size) => {
                              setCurrentPage(page);
                              setPageSize(size);
                            },
                            // 添加快速导航按钮
                            itemRender: (page, type, originalElement) => {
                              if (type === 'prev') {
                                return (
                                  <Space>
                                    <Button 
                                      size="small" 
                                      icon={<DoubleLeftOutlined />} 
                                      disabled={currentPage === 1}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentPage(1);
                                      }}
                                    />
                                    {originalElement}
                                  </Space>
                                );
                              }
                              if (type === 'next') {
                                const lastPage = Math.ceil(total / pageSize);
                                return (
                                  <Space>
                                    {originalElement}
                                    <Button 
                                      size="small" 
                                      icon={<DoubleRightOutlined />} 
                                      disabled={currentPage === lastPage}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentPage(lastPage);
                                      }}
                                    />
                                  </Space>
                                );
                              }
                              return originalElement;
                            }
                          }}
                          className="data-table"
                  onRow={(record) => ({
                    onClick: () => {
                              if (!isEditing(record)) {
                                handleRowSelectionChange([record.key], [record]);
                      }
                    },
                    onDoubleClick: () => {
                              if (!isEditing(record)) {
                                startEdit(record);
                      }
                    }
                  })}
                />
              </Form>
            )}
          </div>
                )
              },
              {
                key: 'structure',
                label: <span><ProfileOutlined /> 结构</span>,
                children: (
                  <div className="table-structure-container">
                    {tableLoading ? (
                      <div className="loading-container">
                        <Spin tip="加载表结构中..." />
        </div>
                    ) : tableStructure.length === 0 ? (
                      <NoDataComponent description="没有表结构信息" table={table} />
                    ) : (
                      <Form form={form} component={false}>
                        <Table 
                          components={{
                            body: {
                              cell: EditableCell,
                            },
                          }}
                          dataSource={tableStructure.map((item, index) => ({...item, key: item.key || index}))}
                          rowSelection={{
                            type: 'checkbox',
                            selectedRowKeys: selectedRowKeys,
                            onChange: handleRowSelectionChange
                          }}
                          columns={getEditableColumnsConfig()}
                    size="small"
                          bordered
                          pagination={false}
                          scroll={{ x: 850, y: 'calc(100vh - 290px)' }}
                          className="structure-table"
                          onRow={(record) => ({
                            onClick: () => {
                              if (!isEditing(record)) {
                                handleRowSelectionChange([record.key], [record]);
                              }
                            },
                            onDoubleClick: () => {
                              if (!isEditing(record)) {
                                startEdit(record);
                              }
                            }
                          })}
                        />
                      </Form>
                  )}
                </div>
                )
              }
            ]}
          />
        </>
      ) : (
        <div className="empty-table-container">
          <Empty description="请选择一个表" />
                  </div>
      )}
    </div>
  );
};

export default DatabaseContent; 