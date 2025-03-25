import axios from 'axios';
import { message } from 'antd';
import { getApi } from '../utils/api';

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
    const result = await api.get('/connections');
    return result.data.data || [];
  } catch (error) {
    console.error('获取连接列表失败:', error);
    message.error('获取连接列表失败');
    return [];
  }
};

// 创建新连接
const createConnection = async (connection: Omit<ConnectionResponse, 'id'>): Promise<ConnectionResponse> => {
  try {
    const api = getApi();
    const result = await api.post('/connections', connection);
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
    const result = await api.put(`/connections/${id}`, connection);
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
    const result = await api.delete(`/connections/${id}`);
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
    const response = await api.post(`/connections/${id}/open`);
    
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
    const response = await api.post(`/connections/${id}/close`);
    
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
    const result = await api.get(`/connections/${connectionId}/databases`);
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
    // 尝试从后端获取表列表
    const result = await api.get(`/connections/${connectionId}/databases/${database}/tables`);
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
    const result = await api.get(`/connections/${connectionId}/databases/${database}/views`);
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

// 获取表结构
const getTableSchema = async (connectionId: number, database: string, table: string): Promise<any[]> => {
  try {
    const api = getApi();
    const result = await api.get(`/connections/${connectionId}/databases/${database}/tables/${table}/schema`);
    if (result.data.success) {
      return result.data.data || [];
    } else {
      message.error(result.data.message || '获取表结构失败');
      return [];
    }
  } catch (error) {
    console.error('获取表结构失败:', error);
    message.error('获取表结构失败');
    return [];
  }
};

// 执行SQL查询
const executeQuery = async (connectionId: number, database: string, sql: string): Promise<any> => {
  try {
    const api = getApi();
    const result = await api.post(`/connections/${connectionId}/databases/${database}/execute`, { sql });
    
    console.log('API返回原始结果:', result.data);
    
    if (result.data.success) {
      // 检查结果结构并确保正确返回rows和columns
      const returnData = {
        success: true,
        message: result.data.message,
      };
      
      // 处理多层嵌套的情况
      if (result.data.data) {
        let dataObject = result.data.data;
        
        // 检查是否有嵌套的data字段
        if (dataObject.data && typeof dataObject.data === 'object') {
          console.log('检测到嵌套的data字段:', dataObject.data);
          dataObject = dataObject.data;
        }
        
        // 提取关键字段
        const { 
          isQueryResult, 
          columns, 
          rows, 
          data, // 有些API可能用data而不是rows
          affectedRows, 
          executionTime, 
          database: db, 
          table 
        } = dataObject;
        
        // 将嵌套的数据字段提取到顶层
        return {
          ...returnData,
          isQueryResult,
          columns,
          rows: rows || data, // 兼容不同的字段名
          affectedRows,
          executionTime,
          database: db || database,
          table
        };
      } else {
        return returnData;
      }
    } else {
      message.error(result.data.message || '执行SQL查询失败');
      throw new Error(result.data.message);
    }
  } catch (error) {
    console.error('执行SQL查询失败:', error);
    message.error('执行SQL查询失败');
    throw error;
  }
};

// 获取函数列表
const getFunctions = async (connectionId: number, database: string): Promise<string[]> => {
  try {
    const api = getApi();
    const result = await api.get(`/connections/${connectionId}/databases/${database}/functions`);
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
    const result = await api.get(`/connections/${connectionId}/databases/${database}/events`);
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
    const result = await api.get(url);
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
    const result = await api.get(url);
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
    const result = await api.get(`/api/database/schema/${connectionId}/${database}`);
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
    const result = await api.get(`/api/database/schema/${connectionId}/${database}/${table}`);
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
    const result = await api.post(`/connections/${connectionId}/databases/${database}/tables/${table}/data`, { data });
    
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
      data: { condition } 
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