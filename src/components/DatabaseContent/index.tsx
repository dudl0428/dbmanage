import { useState, useEffect, useCallback, useRef } from 'react';
import { Table, Tabs, Empty, Spin, message, Button, List, Alert, Tooltip, Modal, Form, Input, Select, Switch, Space, Popconfirm } from 'antd';
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
import './style.css';

interface DatabaseContentProps {
  connection?: any;
  database?: string | null;
  table?: string | null;
  onSelectTable?: (tableName: string, database: string, connectionId: string) => void;
  onDataChange?: (hasChanges: boolean) => void;
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
          {inputType === 'select' ? (
            <Select size="small" autoFocus>
              <Select.Option value="YES">YES</Select.Option>
              <Select.Option value="NO">NO</Select.Option>
            </Select>
          ) : (
          <Input 
            size="small" 
            autoFocus 
            onPressEnter={() => onSave && record && onSave(record)}
            onKeyDown={handleEscape}
              onClick={(e) => e.stopPropagation()}
          />
          )}
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
  loading: boolean;
}> = ({ tableName, onRefresh, onExport, onFilter, loading }) => {
    return (
    <div className="navicat-toolbar" style={{ display: 'flex', visibility: 'visible', opacity: 1, zIndex: 999 }}>
      <div className="toolbar-left">
        <div className="table-title">{tableName}</div>
        {loading && <Spin size="small" />}
        </div>
      <div className="toolbar-right">
        <Button 
          type="text" 
          icon={<ReloadOutlined />} 
          onClick={onRefresh}
          title="刷新"
        />
        <Button 
          type="text" 
          icon={<ExportOutlined />} 
          onClick={onExport}
          title="导出"
        />
        <Button 
          type="text" 
          icon={<FilterOutlined />} 
          onClick={onFilter}
          title="筛选"
        />
      </div>
    </div>
  );
};

const DatabaseContent: React.FC<DatabaseContentProps> = ({
  connection,
  database,
  table,
  onSelectTable,
  onDataChange
}) => {
  const [tableList, setTableList] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tableLoading, setTableLoading] = useState<boolean>(false);
  const [tableData, setTableData] = useState<Record<string, any>[]>([]);
  const [tableColumns, setTableColumns] = useState<any[]>([]);
  const [tableStructure, setTableStructure] = useState<TableColumn[]>([]);
  const [activeTab, setActiveTab] = useState<string>('data');
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

  const [selectedRow, setSelectedRow] = useState<any>(null);
  
  // 添加分页相关状态
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(1000);
  const [total, setTotal] = useState<number>(0);
  
  // 添加状态管理新行
  const [newRows, setNewRows] = useState<Record<string, any>[]>([]);
  const [isAddingRows, setIsAddingRows] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  
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

  // 处理表项双击事件 - 双击选择表并加载数据
  const handleTableItemDoubleClick = useCallback((tableName: string) => {
    console.log('双击表项:', tableName);
    if (connection && database && onSelectTable) {
      const connId = getEffectiveConnectionId(connection);
      onSelectTable(tableName, database, connId.toString());
      // 双击时默认展示数据标签页
      setActiveTab('data');
    }
  }, [connection, database, onSelectTable, getEffectiveConnectionId, setActiveTab]);

  // 加载表结构信息
  const loadTableStructure = useCallback(async (tableName: string) => {
    if (!database) return;
    
    try {
      setLoading(true);
      
      // 获取有效的连接ID
      const connectionId = getEffectiveConnectionId(connection);
      
      if (connectionId <= 0) {
        throw new Error('无效的连接ID');
      }
      
      console.log(`加载表 ${tableName} 的结构信息，使用连接ID: ${connectionId}...`);
      
      // 调用真实API获取表结构
      const schemaData = await ConnectionService.getTableSchema(
        connectionId, 
        database, 
        tableName
      );
      
      // 转换API返回的数据为组件需要的结构
      const structureData: TableColumn[] = schemaData.map((column: any) => ({
        name: column.columnName || column.name,
        type: column.dataType || column.type,
        nullable: column.isNullable === 'YES' || column.nullable === true,
        key: column.columnKey || column.key || '',
        default: column.columnDefault || column.default,
        extra: column.extra || '',
        isEditing: false,
        isNew: false
      }));
      
      setTableStructure(structureData);
    } catch (err: any) {
      console.error('加载表结构失败:', err);
      message.error(`加载表结构失败: ${err.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  }, [connection, database, getEffectiveConnectionId]);

  // 加载数据库表 - 使用加强版连接ID处理
  useEffect(() => {
    if (!database) {
      setTableList([]);
      setError(null);
      return;
    }

    const loadDatabaseTables = async () => {
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
    };

    loadDatabaseTables();
  }, [connection, database, getEffectiveConnectionId]);

  // 加载表数据
  const loadTableData = useCallback(async () => {
    if (!connection || !database || !table) {
      setTableData([]);
      setTableColumns([]);
      return;
    }

    setTableLoading(true);

    try {
      // 获取表格结构
      const columnsData = await ConnectionService.getTableSchema(connection.id, database, table);
      
      // 构建表格列 - 根据类型优化列宽
      const columns = columnsData.map((col: any) => {
        const colName = col.columnName || col.name;
        const colType = (col.dataType || col.type || '').toLowerCase();
        
        // 根据字段类型设定合适的列宽
        let width = 150; // 默认宽度
        
        if (colType.includes('int') || colType.includes('tinyint') || colType.includes('smallint')) {
          width = 100;
        } else if (colType.includes('bigint') || colType.includes('float') || colType.includes('double') || colType.includes('decimal')) {
          width = 120;
        } else if (colType.includes('date') || colType.includes('time')) {
          width = 120;
        } else if (colType.includes('char') && colType.match(/\(\d+\)/)) {
          const matches = colType.match(/\((\d+)\)/);
          const charLength = matches ? parseInt(matches[1]) : 0;
          if (charLength < 10) width = 100;
          else if (charLength < 30) width = 150;
          else width = 200;
        } else if (colType.includes('text') || colType.includes('blob')) {
          width = 250;
        }

        return {
          title: colName,
          dataIndex: colName,
          key: colName,
          width: width,
          ellipsis: true,
          render: (text: any) => {
            if (text === null || text === undefined) {
              return <span className="null-value">(NULL)</span>;
            }
            
            // 根据数据类型进行格式化显示
            if (typeof text === 'boolean' || colType.includes('bool')) {
              return <span className="boolean-value">{String(text)}</span>;
            }
            
            if (colType.includes('int') || colType.includes('float') || colType.includes('double') || colType.includes('decimal')) {
              return <span className="number-value">{text}</span>;
            }
            
            if (colType.includes('date') || colType.includes('time')) {
              return <span className="date-value">{text}</span>;
            }
            
            if (typeof text === 'object') {
              return <span className="object-value">{JSON.stringify(text)}</span>;
            }
            
            // 文本类型根据长度截断显示
            if (typeof text === 'string' && text.length > 100) {
              return <span className="text-value" title={text}>{text.substring(0, 100)}...</span>;
            }
            
            return <span className="text-value" title={text}>{text}</span>;
          }
        };
      });

      // 对列进行排序，将ID相关列排在最前面
      const sortedColumns = [...columns].sort((a, b) => {
        const aTitle = (a.title || '').toString().toLowerCase();
        const bTitle = (b.title || '').toString().toLowerCase();
        
        // ID相关字段优先
        const isIdA = aTitle === 'id' || aTitle.endsWith('_id') || aTitle.endsWith('id');
        const isIdB = bTitle === 'id' || bTitle.endsWith('_id') || bTitle.endsWith('id');
        
        if (isIdA && !isIdB) return -1;
        if (!isIdA && isIdB) return 1;
        
        // 如果都是ID字段或都不是ID字段，保持原有顺序
        return 0;
      });

      setTableColumns(sortedColumns);

      // 首先获取表的总记录数
      try {
        const countSql = `SELECT COUNT(*) as total FROM \`${database}\`.\`${table}\``;
        console.log(`执行统计SQL: ${countSql}`);
        
        const countResult = await ConnectionService.executeQuery(
          connection.id,
        database,
          countSql
        );
        
        let totalCount = 0;
        if (countResult && countResult.success) {
          if (countResult.data && countResult.data.length > 0) {
            // 找到返回结果中的total字段
            const totalField = Object.keys(countResult.data[0]).find(key => 
              key === 'total' || key.toLowerCase().includes('count')
            );
            
            if (totalField) {
              totalCount = parseInt(countResult.data[0][totalField]);
              console.log(`表 ${table} 总记录数: ${totalCount}`);
            }
          } else if (countResult.rows && countResult.rows.length > 0) {
            // 某些数据库API可能使用rows字段
            const totalField = Object.keys(countResult.rows[0]).find(key => 
              key === 'total' || key.toLowerCase().includes('count')
            );
            
            if (totalField) {
              totalCount = parseInt(countResult.rows[0][totalField]);
            }
          }
        }
        
        // 更新总记录数状态
        setTotal(totalCount || 0);
      } catch (countError) {
        console.error('获取总记录数失败:', countError);
        // 发生错误时不中断主流程
      }

      // 获取表格数据（带分页）
      // 确保分页参数为有效数值
      const offset = Math.max(0, (currentPage - 1) * pageSize);
      const limit = Math.max(1, pageSize);
      
      const dataSql = `SELECT * FROM \`${database}\`.\`${table}\` LIMIT ${offset}, ${limit}`;
      console.log(`执行数据查询SQL: ${dataSql}`);
      
      const result = await ConnectionService.executeQuery(
        connection.id,
        database,
        dataSql
      );
      
      // 处理数据结果
      let rows: any[] = [];
      if (result && result.success) {
        if (Array.isArray(result.data)) {
          rows = result.data;
        } else if (Array.isArray(result.rows)) {
          rows = result.rows;
        } else if (Array.isArray(result.results)) {
          rows = result.results;
        } else if (Array.isArray(result.recordset)) {
          rows = result.recordset;
        } else if (Array.isArray(result)) {
          rows = result;
        }
      }
      
      console.log(`获取到 ${rows.length} 条数据记录, 当前页 ${currentPage}, 每页 ${pageSize}, 总记录数 ${total}`);
      
      setTableData(rows.map((item: any, index: number) => ({
        ...item,
        key: index,
      })));
    } catch (error: any) {
      message.error(`加载表数据失败: ${error.message}`);
      console.error('加载表数据错误:', error);
    } finally {
      setTableLoading(false);
    }
  }, [connection, database, table, currentPage, pageSize]);

  // 加载表数据和结构
  useEffect(() => {
    if (!connection || !database || !table) {
      setTableData([]);
      setTableColumns([]);
      setTableStructure([]);
      return;
    }

    // 加载表结构
    loadTableStructure(table);
    
    // 加载表数据
    loadTableData();
  }, [connection, database, table, loadTableStructure, loadTableData]);

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

  // 判断一行是否正在编辑
  const isEditing = (record: any) => {
    // 检查行的键是否与当前正在编辑的键匹配
    return record.key === editingKey || (record.isNewRow && editingKey === '');
  };
  
  // 开始编辑一行
  const edit = (record: any) => {
    // 如果是新行模式，不允许编辑其他行
    if (isAddingRows && !record.isNewRow) {
      message.warning('请先完成新行添加或取消添加');
      return;
    }
    
    const fieldsValue: Record<string, any> = {};
    
    // 准备表单字段初始值
    tableColumns.forEach(column => {
      const dataIndex = column.dataIndex;
      if (dataIndex && typeof dataIndex === 'string') {
        fieldsValue[dataIndex] = record[dataIndex];
      }
    });
    
    editForm.setFieldsValue(fieldsValue);
    setEditingKey(record.key);
  };
  
  // 重写表格列渲染，添加编辑引导标记
  const createEditableColumns = () => {
    // 构建可编辑列定义
    const columns = tableColumns.map((col, colIndex) => {
      const dataIndex = col.dataIndex;
      if (!dataIndex) return col;
      
      // 原始列配置
      const columnConfig = {
        ...col,
        onCell: (record: any) => ({
          record,
          dataIndex: dataIndex,
          title: col.title,
          editing: isEditing(record),
          inputType: getInputTypeForColumn(col),
          onSave: save,
          onCancel: cancel,
          onEdit: edit,
          isEditingKey: editingKey !== '',
          getRowKey: () => record.key,
        }),
        render: (text: any, record: any) => {
          // 如果是新行，添加编辑提示
          if (record.isNewRow && !isEditing(record) && colIndex === 0) {
            return (
              <div style={{ position: 'relative' }}>
                <div style={{ 
                  position: 'absolute', 
                  top: '-18px', 
                  left: '0', 
                  color: '#1890ff', 
                  fontSize: '12px',
                  whiteSpace: 'nowrap'
                }}>
                  双击单元格开始编辑
                </div>
                {text === null || text === undefined ? <span className="null-value">(NULL)</span> : text}
              </div>
            );
          }
          
          // 如果是新行且正在编辑中，显示"点击此处输入"提示
          if (record.isNewRow && isEditing(record) && text === null) {
            return <span style={{ color: '#bfbfbf', fontStyle: 'italic' }}>点击此处输入...</span>;
          }
          
          // 使用原始渲染方法
          if (col.render) {
            return col.render(text, record);
          }
          
          // 默认渲染
          if (text === null || text === undefined) {
            return <span className="null-value">(NULL)</span>;
          }
          return text;
        }
      };
      
      return columnConfig;
    });
    
    return columns;
  };
  
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
  const safeAddNewRow = () => {
    try {
      // 首先跳转到最后一页
      const lastPage = Math.max(1, Math.ceil(total / pageSize));
      if (currentPage !== lastPage) {
        setCurrentPage(lastPage);
        // 设置一个标记，表示需要在数据加载后添加新行
        setTimeout(() => {
          loadTableData().then(() => {
            addNewEmptyRow();
          });
        }, 0);
        return;
      }
      
      addNewEmptyRow();
    } catch (err) {
      console.error('添加新行失败:', err);
      message.error('添加新行失败');
    }
  };

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
  const saveAllNewRows = async () => {
    try {
      if (newRows.length === 0) {
        message.info('没有需要保存的新行');
        return;
      }
      
      // 验证当前正在编辑的行
      if (editingKey) {
        await editForm.validateFields();
        // 更新当前编辑的行数据
        const currentValues = editForm.getFieldsValue();
        const editingIndex = newRows.findIndex(row => row.key === editingKey);
        if (editingIndex > -1) {
          const updatedNewRows = [...newRows];
          updatedNewRows[editingIndex] = { 
            ...updatedNewRows[editingIndex], 
            ...currentValues,
            key: updatedNewRows[editingIndex].key
          };
          setNewRows(updatedNewRows);
        }
      }
      
      setLoading(true);
      
      // 获取有效的连接ID
      const connectionId = getEffectiveConnectionId(connection);
      
      if (connectionId <= 0) {
        throw new Error('无效的连接ID');
      }
      
      // 提取真实数据（不包含React组件的key和isNewRow标记）
      const rowsToSave = newRows.map(row => {
        const cleanRow: Record<string, any> = {};
        for (const key in row) {
          if (key !== 'key' && key !== 'isNewRow') {
            cleanRow[key] = row[key];
          }
        }
        return cleanRow;
      });
      
      // 数据类型校验
      const validationErrors = validateRowsDataTypes(rowsToSave);
      if (validationErrors.length > 0) {
        // 显示验证错误
        Modal.error({
          title: '数据类型验证失败',
          content: (
            <div>
              <p>以下数据类型不匹配：</p>
              <ul>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
              <p>请修正数据后再保存。</p>
            </div>
          ),
        });
        return;
      }
      
      // 由于没有批量插入API，我们逐个插入记录
      let successCount = 0;
      
      for (const row of rowsToSave) {
        try {
          // 调用插入API
          await ConnectionService.insertTableData(
            connectionId,
            database!,
            table!,
            row
          );
          successCount++;
        } catch (error: any) {
          console.error('保存行失败:', error, row);
          message.error(`第 ${successCount + 1} 行保存失败: ${error.message || '未知错误'}`);
          // 继续保存其他行
        }
      }
      
      // 成功保存后清除状态
      setNewRows([]);
      setIsAddingRows(false);
      setHasUnsavedChanges(false);
      setEditingKey('');
      
      // 通知父组件数据已保存
      if (onDataChange) {
        onDataChange(false);
      }
      
      // 重新加载数据
      loadTableData();
      
      message.success(`成功保存了 ${successCount} 条新记录`);
    } catch (error: any) {
      console.error('保存新行失败:', error);
      message.error(`保存失败: ${error.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };
  
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
  const cancelAllNewRows = () => {
    // 移除所有新行
    const filteredData = tableData.filter(row => !newRows.some(newRow => newRow.key === row.key));
    setTableData(filteredData);
    setNewRows([]);
    setIsAddingRows(false);
    setHasUnsavedChanges(false);
    setEditingKey('');
    
    // 通知父组件数据变更已取消
    if (onDataChange) {
      onDataChange(false);
    }
    
    message.info('已取消添加');
  };
  
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
      await loadTableStructure(table!);
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
  const handleDeleteData = async (record: any) => {
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
      
      // 构建删除条件
      const condition: Record<string, any> = {};
      
      // 获取表结构中的主键信息
      const primaryKeyColumns = tableStructure.filter(col => col.key === 'PRI').map(col => col.name);
      
      if (primaryKeyColumns.length > 0) {
        // 如果有主键，使用主键作为条件
        primaryKeyColumns.forEach(columnName => {
          condition[columnName] = record[columnName];
        });
      } else {
        // 如果没有主键，使用所有字段作为条件
        for (const key in editingRow) {
          condition[key] = editingRow[key];
        }
      }
      
      // 调用删除API
      await ConnectionService.deleteTableData(
        connectionId,
        database,
        table,
        condition
      );
      
      // 重新加载数据
      loadTableData();
      
    } catch (err: any) {
      console.error('删除数据失败:', err);
      message.error(`删除数据失败: ${err.message || '未知错误'}`);
    } finally {
      setLoading(false);
    }
  };

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
        loadTableData();
        
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
  const handleRowClick = (record: any) => {
    setSelectedRowKeys([record.key]);
    setSelectedRow(record);
  };

  // 更新页面切换处理函数，确保分页正常工作
  const handlePageChange = (page: number) => {
    console.log(`切换到页码: ${page}, 当前页: ${currentPage}, 总页数: ${Math.ceil(total/pageSize)}`);
    
    if (page !== currentPage) {
      setCurrentPage(page);
      // 切换页面后立即加载数据
      setTimeout(() => {
      loadTableData();
      }, 0);
    }
  };

  // 渲染数据库的表列表
    return (
      <div className="database-content">
        <div className="content-header">
          <div className="table-info">
          <DatabaseOutlined />
          <span className="table-name">{table || database}</span>
          </div>
          <div className="content-actions">
            <Tooltip title="刷新">
              <ReloadOutlined className="refresh-icon" onClick={() => {
              if (table) {
                loadTableData();
              } else {
                setLoading(true);
              }
              }} />
            </Tooltip>
          </div>
        </div>
        
      {!table ? (
        // 如果没有选择表，显示表列表
      <div className="tables-container">
        {loading ? (
          <div className="table-loading">
            <Spin tip="加载表列表中..." />
          </div>
        ) : error ? (
          <Alert type="error" message={error} />
        ) : tableList.length === 0 ? (
            <NoDataComponent description="没有找到表" table={null} />
        ) : (
          <Table
            dataSource={tableList}
            rowKey="name"
            bordered
            size="small"
            className="table-list"
            pagination={false}
            scroll={{ x: 800 }}
            columns={[
              {
                title: '名称',
                dataIndex: 'name',
                key: 'name',
                width: 280,
                ellipsis: true,
                render: (text) => (
                  <div className="table-name-cell">
                    <TableOutlined style={{ marginRight: 8 }} />
                    <span title={text}>{text}</span>
                  </div>
                ),
              },
              {
                title: '行',
                dataIndex: 'rows',
                key: 'rows',
                width: 80,
                render: () => '-',
              },
              {
                title: '大小',
                dataIndex: 'size',
                key: 'size',
                width: 100,
                render: () => '16 KB',
              },
              {
                title: '引擎',
                dataIndex: 'engine',
                key: 'engine',
                width: 120,
                render: () => 'InnoDB',
              },
              {
                title: '排序规则',
                dataIndex: 'collation',
                key: 'collation',
                width: 180,
                ellipsis: true,
                render: () => 'utf8mb4_general_ci',
              }
            ]}
            onRow={(record) => ({
              onClick: () => handleTableItemClick(record.name),
              onDoubleClick: () => handleTableItemDoubleClick(record.name),
              className: 'table-row'
            })}
          />
        )}
      </div>
      ) : (
        // 如果选择了表，显示表数据
        <div className="data-view-container" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <TableToolbar 
            tableName={table}
            onRefresh={loadTableData}
            onExport={() => message.info('导出功能开发中')}
            onFilter={() => message.info('筛选功能开发中')}
            loading={tableLoading}
          />
          
          <div className="table-content" style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            {tableLoading ? (
              <div className="table-loading">
                <Spin tip="加载数据中..." />
        </div>
            ) : error ? (
              <Alert type="error" message={error} />
            ) : tableData.length === 0 ? (
              <NoDataComponent description="表中没有数据" table={table} />
            ) : (
              <Form form={editForm} component={false}>
                <Table
                  className="navicat-table data-table"
                  components={{
                    body: {
                      cell: EditableCell,
                    },
                  }}
                  columns={[
                    // 移除行号列，使用自定义的可编辑列
                    ...createEditableColumns()
                  ]}
                  dataSource={tableData}
                  loading={tableLoading}
                  size="small"
                  bordered
                  pagination={false}
                  scroll={{ x: tableColumns.length * 150, y: 'calc(100vh - 220px)' }}
                  rowClassName={(record) => (
                    record.isNewRow 
                      ? 'new-row' 
                      : selectedRowKeys.includes(record.key) 
                        ? 'selected-row' 
                        : ''
                  )}
                  onRow={(record) => ({
                    onClick: () => {
                      if (!isAddingRows || record.isNewRow) {
                        handleRowClick(record);
                      }
                    },
                    onDoubleClick: () => {
                      if (!isAddingRows || record.isNewRow) {
                        edit(record);
                      }
                    }
                  })}
                  rowKey="key"
                  rowSelection={{
                    type: 'checkbox',
                    selectedRowKeys: selectedRowKeys,
                    onChange: (selected) => {
                      // 添加行模式下不允许选择非新行
                      if (isAddingRows) {
                        const filteredSelection = selected.filter(key => 
                          newRows.some(row => row.key === key)
                        );
                        setSelectedRowKeys(filteredSelection);
                      } else {
                        setSelectedRowKeys(selected);
                      }
                    },
                    getCheckboxProps: (record) => ({
                      disabled: isAddingRows && !record.isNewRow
                    })
                  }}
                />
              </Form>
            )}
          </div>
        </div>
      )}
      
      <div className="status-bar" style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        zIndex: 1000,
        backgroundColor: '#f0f0f0',
        borderTop: '1px solid #d9d9d9',
        height: 'auto',
        minHeight: '40px',
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        {/* 第一行：SQL语句显示 */}
        {table && (
          <div style={{ marginBottom: '8px', display: 'flex', alignItems: 'center' }}>
            <div className="sql-display" style={{ flex: 1 }}>
              SELECT * FROM `{database}`.`{table}` LIMIT {(currentPage - 1) * pageSize},{pageSize}
            </div>
            {total > tableData.length && (
              <div style={{ 
                marginLeft: '10px', 
                padding: '2px 8px', 
                backgroundColor: '#fffbe6', 
                border: '1px solid #ffe58f', 
                borderRadius: '2px', 
                fontSize: '12px',
                color: '#d48806'
              }}>
                <span>滚动查看更多数据</span>
              </div>
            )}
          </div>
        )}
        
        {/* 第二行：操作按钮和信息显示 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="status-left" style={{ display: 'flex', alignItems: 'center' }}>
            {!table ? (
              tableList.length > 0 ? `${tableList.length} 个对象` : '0 个对象'
            ) : (
              <>
                {/* 操作按钮 */}
                <div style={{ display: 'flex', marginRight: '15px' }}>
                  <Button 
                    icon={<PlusOutlined />} 
                    size="small"
                    onClick={safeAddNewRow}
                    disabled={tableLoading}
                    title="添加"
                    style={{ marginRight: '4px' }}
                  />
                  <Button 
                    icon={<EditOutlined />} 
                    size="small"
                    onClick={() => selectedRowKeys.length > 0 && edit(tableData.find(item => item.key === selectedRowKeys[0]))}
                    disabled={tableLoading || selectedRowKeys.length === 0 || isAddingRows}
                    title="编辑"
                    style={{ marginRight: '4px' }}
                  />
                  <Button 
                    icon={<DeleteOutlined />} 
                    size="small"
                    onClick={() => selectedRowKeys.length > 0 && handleDeleteData(tableData.find(item => item.key === selectedRowKeys[0]))}
                    disabled={tableLoading || selectedRowKeys.length === 0 || isAddingRows}
                    title="删除"
                    style={{ marginRight: '4px' }}
                  />
                  <Button 
                    icon={<ReloadOutlined />} 
                    size="small"
                    onClick={loadTableData}
                    disabled={tableLoading || isAddingRows}
                    title="刷新"
                    style={{ marginRight: '4px' }}
                  />
                  
                  {/* 添加保存和取消按钮 */}
                  {isAddingRows && (
                    <>
                      <Button 
                        type="primary"
                        icon={<SaveOutlined />} 
                        size="small"
                        onClick={saveAllNewRows}
                        disabled={tableLoading || newRows.length === 0}
                        title="保存所有新行"
                        style={{ marginRight: '4px', background: '#52c41a', borderColor: '#52c41a' }}
                      >
                        保存
                      </Button>
                      <Button 
                        danger
                        icon={<CloseCircleOutlined />} 
                        size="small"
                        onClick={cancelAllNewRows}
                        disabled={tableLoading || newRows.length === 0}
                        title="取消"
                        style={{ marginRight: '4px' }}
                      >
                        取消
                      </Button>
                    </>
                  )}
                </div>
                
                {/* 当前选择和总记录数 */}
                <div className="total-records">
                  <InfoCircleOutlined className="info-icon" />
                  {tableData.length > 0 
                    ? `显示 ${(currentPage - 1) * pageSize + 1} 至 ${Math.min(currentPage * pageSize, total)} 行，共 ${total} 行` 
                    : '0 条记录'} 
                </div>
                
                {/* 分页控件 */}
                {tableData.length > 0 && total > 0 && (
                  <div className="pagination-controls">
                    <span style={{ marginRight: '5px' }}>页码:</span>
                    <Button 
                      icon={<DoubleLeftOutlined />}
                      size="small" 
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(1)}
                      title="第一页"
                    />
                    <Button 
                      icon={<LeftOutlined />}
                      size="small" 
                      disabled={currentPage <= 1}
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      title="上一页"
                    />
                    <Input 
                      size="small"
                      value={currentPage}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        if (!isNaN(value) && value > 0) {
                          setCurrentPage(value);
                        }
                      }}
                      onPressEnter={(e) => {
                        const value = parseInt((e.target as HTMLInputElement).value);
                        if (!isNaN(value) && value > 0 && value <= Math.ceil(total/pageSize)) {
                          handlePageChange(value);
                        } else {
                          message.warning(`请输入1至${Math.ceil(total/pageSize)}之间的页码`);
                        }
                      }}
                    />
                    <span style={{ margin: '0 5px' }}>/ {Math.ceil(total/pageSize)}</span>
                    <Button 
                      icon={<RightOutlined />}
                      size="small" 
                      disabled={currentPage >= Math.ceil(total/pageSize)}
                      onClick={() => handlePageChange(Math.min(Math.ceil(total/pageSize), currentPage + 1))}
                      title="下一页"
                    />
                    <Button 
                      icon={<DoubleRightOutlined />}
                      size="small" 
                      disabled={currentPage >= Math.ceil(total/pageSize)}
                      onClick={() => handlePageChange(Math.ceil(total/pageSize))}
                      title="最后一页"
                    />
                    
                    <div className="page-size-selector">
                      <span>每页:</span>
                      <Select
                        size="small"
                        value={pageSize}
                        onChange={(value) => {
                          setPageSize(value);
                          setCurrentPage(1); // 重置到第一页
                          setTimeout(() => {
                            loadTableData();
                          }, 0);
                        }}
                      >
                        <Select.Option value={10}>10</Select.Option>
                        <Select.Option value={50}>50</Select.Option>
                        <Select.Option value={100}>100</Select.Option>
                        <Select.Option value={200}>200</Select.Option>
                        <Select.Option value={500}>500</Select.Option>
                        <Select.Option value={1000}>1000</Select.Option>
                        <Select.Option value={5000}>5000</Select.Option>
                        <Select.Option value={10000}>10000</Select.Option>
                        <Select.Option value={50000}>50000</Select.Option>
                        <Select.Option value={100000}>100000</Select.Option>
                      </Select>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
        <div className="status-right">
            <span>InnoDB</span>
            <span>utf8mb4_general_ci</span>
        </div>
      </div>
      </div>

      {/* 添加一个底部占位空间，防止内容被固定元素遮挡 */}
      <div style={{ height: table ? '80px' : '40px' }}></div>
    </div>
  );
};

export default DatabaseContent; 