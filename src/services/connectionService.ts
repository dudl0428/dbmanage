import axios from 'axios';
import { message } from 'antd';
import { getApi } from '../utils/api';
import { ApiResponse } from '@/types/api';

// 添加API基础URL - 修复为后端实际地址
const baseURL = 'http://localhost:8080';

// 定义接口
export interface ConnectionRequest {
  name: string;
  type: string;  // mysql, postgresql, oracle, sqlserver
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  parameters?: string;
  groupId?: number;
}

export interface ConnectionTestRequest {
  type: string;
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  parameters?: string;
}

// 连接状态类型
export type ConnectionStatus = 'connected' | 'disconnected' | 'error' | undefined;

// 连接响应定义
export interface ConnectionResponse {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  database?: string;
  username: string;
  password?: string;
  url?: string;
  parameters?: string;
  createdAt?: string;
  updatedAt?: string;
  lastConnected?: string;
  groupId?: number;
  groupName?: string;
  status?: ConnectionStatus;
}

export interface ConnectionResult {
  success: boolean;
  message?: string;
  data?: any;
}

// 保存当前已打开的连接状态
const connectedIds = new Set<number>();

// 获取连接列表
const getConnections = async (): Promise<ConnectionResponse[]> => {
  try {
    const api = getApi();
    const result = await api.get('/connections', {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    return result.data.data || [];
  } catch (error: any) {
    console.error('获取连接列表失败:', error);
    message.error(`获取连接列表失败: ${error.message}`);
    return [];
  }
};

// 创建新连接
const createConnection = async (connection: Omit<ConnectionResponse, 'id'>): Promise<ConnectionResponse> => {
  try {
    const api = getApi();
    const result = await api.post('/connections', connection, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      message.success('创建连接成功');
      return result.data.data;
    } else {
      message.error(result.data.message || '创建连接失败');
      throw new Error(result.data.message);
    }
  } catch (error) {
    console.error('创建连接失败:', error);
    message.error('创建连接失败');
    throw error;
  }
};

// 更新连接
const updateConnection = async (id: number, connection: Partial<ConnectionResponse>): Promise<ConnectionResponse> => {
  try {
    const api = getApi();
    const result = await api.put(`/connections/${id}`, connection, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      message.success('更新连接成功');
      return result.data.data;
    } else {
      message.error(result.data.message || '更新连接失败');
      throw new Error(result.data.message);
    }
  } catch (error) {
    console.error('更新连接失败:', error);
    message.error('更新连接失败');
    throw error;
  }
};

// 删除连接
const deleteConnection = async (id: number): Promise<boolean> => {
  try {
    const api = getApi();
    const result = await api.delete(`/connections/${id}`, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      message.success('删除连接成功');
      // 如果连接已打开，从集合中移除
      connectedIds.delete(id);
      return true;
    } else {
      message.error(result.data.message || '删除连接失败');
      return false;
    }
  } catch (error) {
    console.error('删除连接失败:', error);
    message.error('删除连接失败');
    return false;
  }
};

// 打开连接
const openConnection = async (id: number): Promise<ConnectionResult> => {
  try {
    const api = getApi();
    const response = await api.post(`/connections/${id}/open`, {}, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      // 如果连接成功，保存连接状态
      connectedIds.add(id);
      
      // 获取连接信息并保存到本地存储
      const connectionInfo = response.data.data;
      localStorage.setItem(`connection_${id}`, JSON.stringify({
        type: connectionInfo.type,
        host: connectionInfo.host,
        port: connectionInfo.port,
        database: connectionInfo.database,
        username: connectionInfo.username,
        lastConnected: new Date().toISOString()
      }));
      
      return { 
        success: true, 
        message: '连接成功',
        data: connectionInfo
      };
    } else {
      return { 
        success: false, 
        message: response.data.message || '连接失败，请检查数据库配置'
      };
    }
  } catch (error: any) {
    console.error('打开连接失败:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || '连接失败，请检查网络或数据库配置'
    };
  }
};

// 关闭连接
const closeConnection = async (id: number): Promise<boolean> => {
  try {
    const api = getApi();
    const response = await api.post(`/connections/${id}/close`, {}, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    // 如果关闭成功，移除连接状态
    if (response.data.success) {
      connectedIds.delete(id);
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('关闭连接失败:', error);
    return false;
  }
};

// 检查连接是否已经打开
const isConnected = (id: number): boolean => {
  return connectedIds.has(id);
};

// 设置连接状态（用于从其他组件更新状态）
const setConnectionStatus = (id: number, status: boolean): void => {
  if (status) {
    connectedIds.add(id);
  } else {
    connectedIds.delete(id);
  }
};

// 获取数据库列表
const getDatabases = async (connectionId: number): Promise<string[]> => {
  try {
    const api = getApi();
    const result = await api.get(`/connections/${connectionId}/databases`, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      return result.data.data || [];
    } else {
      message.error(result.data.message || '获取数据库列表失败');
      return [];
    }
  } catch (error) {
    console.error('获取数据库列表失败:', error);
    message.error('获取数据库列表失败');
    return [];
  }
};

// 获取表列表
const getTables = async (connectionId: number, database: string): Promise<string[]> => {
  try {
    const api = getApi();
    const result = await api.get(`/connections/${connectionId}/databases/${database}/tables`, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      return result.data.data || [];
    } else {
      console.warn(`从后端获取表列表失败: ${result.data.message}，使用模拟数据`);
      // 模拟数据 - 如果后端API不可用
      return [
        'users',
        'orders',
        'products',
        'customers',
        'is_app_comment',
        'is_app_upgrade',
        'js_biz_category',
        'js_cms_article',
        'js_cms_article_data',
        'js_cms_article_post',
        'js_cms_article_tag',
        'js_cms_category',
        'js_cms_comment',
        'js_cms_guestbook',
        'js_cms_report',
        'js_cms_site',
        'js_cms_tag',
        'js_cms_visit_log',
        'js_dbm_datasource',
        'js_dbm_modify_log',
        'js_dbm_table'
      ];
    }
  } catch (error) {
    console.error('获取表列表失败:', error);
    message.error('获取表列表失败，使用模拟数据');
    // 模拟数据 - 如果发生异常
    return [
      'users',
      'orders',
      'products',
      'customers',
      'is_app_comment',
      'is_app_upgrade',
      'js_biz_category',
      'js_cms_article',
      'js_cms_article_data',
      'js_cms_article_post',
      'js_cms_article_tag',
      'js_cms_category',
      'js_cms_comment',
      'js_cms_guestbook',
      'js_cms_report',
      'js_cms_site',
      'js_cms_tag',
      'js_cms_visit_log',
      'js_dbm_datasource',
      'js_dbm_modify_log',
      'js_dbm_table'
    ];
  }
};

// 获取视图列表
const getViews = async (connectionId: number, database: string): Promise<string[]> => {
  try {
    const api = getApi();
    const result = await api.get(`/connections/${connectionId}/databases/${database}/views`, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      return result.data.data || [];
    } else {
      message.error(result.data.message || '获取视图列表失败');
      return [];
    }
  } catch (error) {
    console.error('获取视图列表失败:', error);
    message.error('获取视图列表失败');
    return [];
  }
};

// 增强getTableSchema方法，修复API路径
export async function getTableSchema(connectionId: number, database: string, table: string): Promise<any[]> {
  try {
    console.log(`发送请求获取表结构 - 连接ID: ${connectionId}, 数据库: ${database}, 表: ${table}`);
    
    // 构建请求URL时确保参数被正确编码
    const encodedDb = encodeURIComponent(database);
    const encodedTable = encodeURIComponent(table);
    
    const url = `${baseURL}/api/connection/${connectionId}/schema/${encodedDb}/${encodedTable}`;
    console.log(`请求URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    console.log('表结构API响应:', response);
    
    if (response.status === 200) {
      // 检查响应格式并转换数据结构
      let schema = response.data;
      
      // 确保schema是数组
      if (!Array.isArray(schema)) {
        if (schema && schema.data && Array.isArray(schema.data)) {
          schema = schema.data;
        } else if (schema && schema.columns && Array.isArray(schema.columns)) {
          schema = schema.columns;
        } else {
          schema = [];
          console.warn('API返回的schema格式不是预期的数组:', schema);
        }
      }
      
      console.log(`处理后的表结构数据 (${schema.length} 个字段):`, schema);
      return schema;
    } else {
      throw new Error(`获取表结构失败: ${response.statusText}`);
    }
  } catch (error) {
    console.error('获取表结构出错:', error);
    // 返回一个默认的表结构，避免前端崩溃
    return [];
  }
}

// 获取默认表结构
const getDefaultTableSchema = () => {
  return [
    { columnName: 'id', dataType: 'int(11)', isNullable: 'NO', columnKey: 'PRI', columnDefault: null, extra: 'auto_increment' },
    { columnName: 'name', dataType: 'varchar(255)', isNullable: 'YES', columnKey: '', columnDefault: null, extra: '' },
    { columnName: 'description', dataType: 'text', isNullable: 'YES', columnKey: '', columnDefault: null, extra: '' },
    { columnName: 'created_at', dataType: 'datetime', isNullable: 'YES', columnKey: '', columnDefault: 'CURRENT_TIMESTAMP', extra: '' },
    { columnName: 'updated_at', dataType: 'datetime', isNullable: 'YES', columnKey: '', columnDefault: 'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', extra: '' }
  ];
};

// 增强executeQuery方法，修复API路径
export async function executeQuery(connectionId: number, database: string, sql: string): Promise<any> {
  try {
    console.log(`执行查询 - 连接ID: ${connectionId}, 数据库: ${database}, SQL: ${sql}`);
    
    const url = `${baseURL}/api/connection/${connectionId}/query`;
    console.log(`请求URL: ${url}`);
    
    const response = await axios.post(url, {
      database,
      sql
    }, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    console.log('执行查询API响应:', response);
    
    if (response.status === 200) {
      const result = response.data;
      
      // 转换返回的结果为标准格式
      let formattedResult: any = {
        success: true,
        message: '',
        data: []
      };
      
      // 处理各种可能的返回格式
      if (Array.isArray(result)) {
        // 直接是数组
        formattedResult.data = result;
      } else if (typeof result === 'object') {
        // 是对象，尝试找数据字段
        formattedResult.success = result.success !== false;
        formattedResult.message = result.message || '';
        
        if (Array.isArray(result.data)) {
          formattedResult.data = result.data;
        } else if (Array.isArray(result.rows)) {
          formattedResult.data = result.rows;
        } else if (Array.isArray(result.results)) {
          formattedResult.data = result.results;
        } else if (result.data && typeof result.data === 'object' && Array.isArray(result.data.rows)) {
          formattedResult.data = result.data.rows;
        }
      }
      
      // 确保表格数据的每一行都有唯一key
      if (formattedResult.data.length > 0) {
        formattedResult.data = formattedResult.data.map((row: any, idx: number) => {
          if (!row.key) {
            return { ...row, key: `row-${idx}` };
          }
          return row;
        });
      }
      
      console.log(`处理后的查询结果 (${formattedResult.data.length} 行):`, 
                  formattedResult.data.length > 0 ? formattedResult.data[0] : '无数据');
      
      return formattedResult;
    } else {
      throw new Error(`执行查询失败: ${response.statusText}`);
    }
  } catch (error) {
    console.error('执行查询出错:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : '执行查询时出错',
      data: []
    };
  }
}

// 获取函数列表
const getFunctions = async (connectionId: number, database: string): Promise<string[]> => {
  try {
    const api = getApi();
    const result = await api.get(`/connections/${connectionId}/databases/${database}/functions`, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      return result.data.data || [];
    } else {
      message.error(result.data.message || '获取函数列表失败');
      return [];
    }
  } catch (error) {
    console.error('获取函数列表失败:', error);
    message.error('获取函数列表失败');
    return [];
  }
};

// 获取事件列表
const getEvents = async (connectionId: number, database: string): Promise<string[]> => {
  try {
    const api = getApi();
    const result = await api.get(`/connections/${connectionId}/databases/${database}/events`, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      return result.data.data || [];
    } else {
      message.error(result.data.message || '获取事件列表失败');
      return [];
    }
  } catch (error) {
    console.error('获取事件列表失败:', error);
    message.error('获取事件列表失败');
    return [];
  }
};

// 获取完整数据库结构（用于AI自然语言转SQL）
const getCompleteSchema = async (connectionId: number, limit?: number): Promise<any> => {
  try {
    const api = getApi();
    let url = `/api/database/complete-schema?connectionId=${connectionId}`;
    if (limit) {
      url += `&limit=${limit}`;
    }
    const result = await api.get(url, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      return result.data.data || {};
    } else {
      message.error(result.data.message || '获取完整数据库结构失败');
      return {};
    }
  } catch (error) {
    console.error('获取完整数据库结构失败:', error);
    message.error('获取完整数据库结构失败');
    return {};
  }
};

// 获取数据库结构树
const getDatabaseSchema = async (connectionId?: number): Promise<any[]> => {
  try {
    const api = getApi();
    let url = '/api/database/schema';
    if (connectionId) {
      url += `?connectionId=${connectionId}`;
    }
    const result = await api.get(url, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      return result.data.data || [];
    } else {
      message.error(result.data.message || '获取数据库结构失败');
      return [];
    }
  } catch (error) {
    console.error('获取数据库结构失败:', error);
    message.error('获取数据库结构失败');
    return [];
  }
};

// 获取数据库对象结构
const getDatabaseObjects = async (connectionId: number, database: string): Promise<any> => {
  try {
    const api = getApi();
    const result = await api.get(`/api/database/schema/${connectionId}/${database}`, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      return result.data.data || {};
    } else {
      message.error(result.data.message || '获取数据库对象结构失败');
      return {};
    }
  } catch (error) {
    console.error('获取数据库对象结构失败:', error);
    message.error('获取数据库对象结构失败');
    return {};
  }
};

// 获取表详细结构
const getTableDetails = async (connectionId: number, database: string, table: string): Promise<any[]> => {
  try {
    const api = getApi();
    const result = await api.get(`/api/database/schema/${connectionId}/${database}/${table}`, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    if (result.data.success) {
      return result.data.data || [];
    } else {
      message.error(result.data.message || '获取表详细结构失败');
      return [];
    }
  } catch (error) {
    console.error('获取表详细结构失败:', error);
    message.error('获取表详细结构失败');
    return [];
  }
};

// 测试连接
const testConnection = async (connection: ConnectionTestRequest): Promise<ConnectionResult> => {
  try {
    const api = getApi();
    const response = await api.post('/connections/test', {
      type: connection.type,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      password: connection.password,
      parameters: connection.parameters
    }, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      return { success: true, message: '连接测试成功' };
    } else {
      return { success: false, message: response.data.message || '连接测试失败' };
    }
  } catch (error: any) {
    console.error('连接测试失败:', error);
    return { 
      success: false, 
      message: error.response?.data?.message || '连接测试失败，请检查网络或数据库配置' 
    };
  }
};

// 新增表数据
const insertTableData = async (connectionId: number, database: string, table: string, data: any): Promise<any> => {
  try {
    const api = getApi();
    const result = await api.post(`/connections/${connectionId}/databases/${database}/tables/${table}/data`, { data }, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    if (result.data.success) {
      message.success('数据添加成功');
      return result.data.data;
    } else {
      message.error(result.data.message || '添加数据失败');
      throw new Error(result.data.message);
    }
  } catch (error) {
    console.error('添加数据失败:', error);
    message.error('添加数据失败');
    throw error;
  }
};

// 更新表数据
const updateTableData = async (connectionId: number, database: string, table: string, data: any, condition: any): Promise<any> => {
  try {
    const api = getApi();
    const result = await api.put(`/connections/${connectionId}/databases/${database}/tables/${table}/data`, { 
      data, 
      condition 
    }, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    if (result.data.success) {
      message.success('数据更新成功');
      return result.data.data;
    } else {
      message.error(result.data.message || '更新数据失败');
      throw new Error(result.data.message);
    }
  } catch (error) {
    console.error('更新数据失败:', error);
    message.error('更新数据失败');
    throw error;
  }
};

// 删除表数据
const deleteTableData = async (connectionId: number, database: string, table: string, condition: any): Promise<any> => {
  try {
    const api = getApi();
    const result = await api.delete(`/connections/${connectionId}/databases/${database}/tables/${table}/data`, { 
      data: { condition },
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });
    
    if (result.data.success) {
      message.success('数据删除成功');
      return result.data.data;
    } else {
      message.error(result.data.message || '删除数据失败');
      throw new Error(result.data.message);
    }
  } catch (error) {
    console.error('删除数据失败:', error);
    message.error('删除数据失败');
    throw error;
  }
};

// 创建数据库
const createDatabase = async (
  connectionId: number, 
  databaseName: string, 
  charset?: string, 
  collation?: string
): Promise<boolean> => {
  try {
    const api = getApi();
    // 获取连接信息以确定数据库类型
    const connectionInfo = localStorage.getItem(`connection_${connectionId}`);
    const { type } = connectionInfo ? JSON.parse(connectionInfo) : { type: 'mysql' };
    
    const response = await api.post(`/connections/${connectionId}/create-database`, {
      name: databaseName,
      type: type,
      charset: charset,
      collation: collation
    }, {
      headers: {
        Authorization: 'Bearer ' + localStorage.getItem('token'),
        'Content-Type': 'application/json'
      }
    });

    if (response.data.success) {
      message.success(`数据库 ${databaseName} 创建成功`);
      return true;
    } else {
      message.error(response.data.message || '创建数据库失败');
      return false;
    }
  } catch (error: any) {
    console.error('创建数据库失败:', error);
    message.error(error.response?.data?.message || '创建数据库失败，请检查网络或权限');
    return false;
  }
};

const ConnectionService = {
  getConnections,
  createConnection,
  updateConnection,
  deleteConnection,
  openConnection,
  closeConnection,
  isConnected,
  setConnectionStatus,
  getDatabases,
  getTables,
  getViews,
  getTableSchema,
  executeQuery,
  getFunctions,
  getEvents,
  testConnection,
  insertTableData,
  updateTableData,
  deleteTableData,
  getCompleteSchema,
  getDatabaseSchema,
  getDatabaseObjects,
  getTableDetails,
  createDatabase
};

export default ConnectionService; 