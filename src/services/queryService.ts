import ApiService from './api';
import { ApiResponse } from './authService';

// 定义接口
export interface QueryRequest {
  connectionId: number;
  sql: string;
  params?: any[];
}

export interface QueryResponse {
  success: boolean;
  message: string;
  duration: number;
  affectedRows?: number;
  columns?: Array<{
    title: string;
    dataIndex: string;
    key: string;
  }>;
  data?: any[];
  error?: string;
}

export interface SavedQueryRequest {
  name: string;
  description?: string;
  sql: string;
  connectionId: number;
}

export interface SavedQueryResponse {
  id: number;
  name: string;
  description?: string;
  sql: string;
  connectionId: number;
  userId: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueryHistoryResponse {
  id: number;
  sql: string;
  connectionId: number;
  userId: number;
  duration: number;
  status: string;
  rows: number;
  executedAt: string;
}

// 定义Electron IPC响应类型
interface ElectronResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

class QueryService {
  // 执行SQL查询
  static async executeQuery(queryData: QueryRequest): Promise<QueryResponse> {
    try {
      // 先尝试使用HTTP API
      const response = await ApiService.post<ApiResponse<QueryResponse>>('/query/execute', queryData);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || '查询执行失败');
    } catch (error) {
      console.error("HTTP API执行查询失败，尝试使用Electron IPC:", error);
      
      // 如果HTTP请求失败，尝试使用Electron IPC
      try {
        // @ts-ignore - window.electronAPI是通过preload脚本注入的
        const electronResponse: ElectronResponse<QueryResponse> = await window.electronAPI.query.execute(queryData.connectionId, queryData.sql);
        
        if (electronResponse.success) {
          return electronResponse.data as QueryResponse;
        }
        
        throw new Error(electronResponse.message || '查询执行失败');
      } catch (ipcError) {
        console.error("Electron IPC执行查询也失败:", ipcError);
        throw ipcError;
      }
    }
  }
  
  // 获取数据库结构
  static async getDatabaseStructure(connectionId: number): Promise<any[]> {
    try {
      // 先尝试使用HTTP API
      const response = await ApiService.get<ApiResponse<any[]>>(`/query/structure/${connectionId}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || '获取数据库结构失败');
    } catch (error) {
      console.error("HTTP API获取数据库结构失败，尝试使用Electron IPC:", error);
      
      // 如果HTTP请求失败，尝试使用Electron IPC
      try {
        // @ts-ignore - window.electronAPI是通过preload脚本注入的
        const electronResponse: ElectronResponse<any[]> = await window.electronAPI.query.getStructure(connectionId);
        
        if (electronResponse.success) {
          return electronResponse.data as any[];
        }
        
        throw new Error(electronResponse.message || '获取数据库结构失败');
      } catch (ipcError) {
        console.error("Electron IPC获取数据库结构也失败:", ipcError);
        throw ipcError;
      }
    }
  }
  
  // 获取表结构
  static async getTableStructure(connectionId: number, tableName: string): Promise<any[]> {
    try {
      // 先尝试使用HTTP API
      const response = await ApiService.get<ApiResponse<any[]>>(`/query/table-structure?connectionId=${connectionId}&tableName=${encodeURIComponent(tableName)}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || '获取表结构失败');
    } catch (error) {
      console.error("HTTP API获取表结构失败，尝试使用Electron IPC:", error);
      
      // 如果HTTP请求失败，尝试使用Electron IPC
      try {
        // @ts-ignore - window.electronAPI是通过preload脚本注入的
        const electronResponse: ElectronResponse<any[]> = await window.electronAPI.query.getTableStructure(connectionId, tableName);
        
        if (electronResponse.success) {
          return electronResponse.data as any[];
        }
        
        throw new Error(electronResponse.message || '获取表结构失败');
      } catch (ipcError) {
        console.error("Electron IPC获取表结构也失败:", ipcError);
        throw ipcError;
      }
    }
  }
  
  // 获取数据库表
  static async getDatabaseTables(connectionId: number, database: string, schemaName: string): Promise<any[]> {
    try {
      // 先尝试使用HTTP API
      const response = await ApiService.get<ApiResponse<any[]>>(`/query/tables?connectionId=${connectionId}&database=${encodeURIComponent(database)}&schemaName=${encodeURIComponent(schemaName)}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || '获取数据库表失败');
    } catch (error) {
      console.error("HTTP API获取数据库表失败，尝试使用Electron IPC:", error);
      
      // 如果HTTP请求失败，尝试使用Electron IPC
      try {
        // @ts-ignore - window.electronAPI是通过preload脚本注入的
        const electronResponse: ElectronResponse<any[]> = await window.electronAPI.query.getTables(connectionId, database, schemaName);
        
        if (electronResponse.success) {
          return electronResponse.data as any[];
        }
        
        throw new Error(electronResponse.message || '获取数据库表失败');
      } catch (ipcError) {
        console.error("Electron IPC获取数据库表也失败:", ipcError);
        throw ipcError;
      }
    }
  }
  
  // 获取数据库视图
  static async getDatabaseViews(connectionId: number, database: string, schemaName: string): Promise<any[]> {
    try {
      // 先尝试使用HTTP API
      const response = await ApiService.get<ApiResponse<any[]>>(`/query/views?connectionId=${connectionId}&database=${encodeURIComponent(database)}&schemaName=${encodeURIComponent(schemaName)}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || '获取数据库视图失败');
    } catch (error) {
      console.error("HTTP API获取数据库视图失败，尝试使用Electron IPC:", error);
      
      // 如果HTTP请求失败，尝试使用Electron IPC
      try {
        // @ts-ignore - window.electronAPI是通过preload脚本注入的
        const electronResponse: ElectronResponse<any[]> = await window.electronAPI.query.getViews(connectionId, database, schemaName);
        
        if (electronResponse.success) {
          return electronResponse.data as any[];
        }
        
        throw new Error(electronResponse.message || '获取数据库视图失败');
      } catch (ipcError) {
        console.error("Electron IPC获取数据库视图也失败:", ipcError);
        throw ipcError;
      }
    }
  }
  
  // 保存查询
  static async saveQuery(queryData: SavedQueryRequest): Promise<boolean> {
    try {
      // 先尝试使用HTTP API
      const response = await ApiService.post<ApiResponse<boolean>>('/query/save', queryData);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || '保存查询失败');
    } catch (error) {
      console.error("HTTP API保存查询失败:", error);
      throw error;
    }
  }
  
  // 获取保存的查询列表
  static async getSavedQueries(): Promise<SavedQueryResponse[]> {
    try {
      // 使用HTTP API
      const response = await ApiService.get<ApiResponse<SavedQueryResponse[]>>('/query/saved');
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || '获取保存的查询列表失败');
    } catch (error) {
      console.error("HTTP API获取保存的查询列表失败:", error);
      throw error;
    }
  }
  
  // 获取查询历史
  static async getQueryHistory(limit: number = 20): Promise<QueryHistoryResponse[]> {
    try {
      // 使用HTTP API
      const response = await ApiService.get<ApiResponse<QueryHistoryResponse[]>>(`/query/history?limit=${limit}`);
      
      if (response.data.success) {
        return response.data.data;
      }
      
      throw new Error(response.data.message || '获取查询历史失败');
    } catch (error) {
      console.error("HTTP API获取查询历史失败:", error);
      throw error;
    }
  }
}

export default QueryService; 