import type { FieldDefinition, IndexDefinition, ForeignKeyDefinition, TriggerDefinition, DataTypeDefinition } from '@/types/table';
import request from '@/utils/request';
import { ApiResponse } from '@/types/api';

/**
 * 表格服务，处理表格相关的API请求
 */
export const tableService = {
  /**
   * 验证字段定义
   */
  validateField: async (params: {
    field: FieldDefinition;
    databaseType: string;
    connectionId: string;
  }): Promise<void> => {
    try {
      const response = await request.post<ApiResponse<void>>('/table/validate-field', params);
      if (!response.success) {
        throw new Error(response.message || '字段验证失败');
      }
    } catch (error: any) {
      // 转换 axios 错误为应用错误
      if (error.response?.data) {
        throw new Error(error.response.data.message || '字段验证失败');
      }
      throw error;
    }
  },

  /**
   * 验证整张表
   */
  validateTable: async (params: {
    connectionId: string;
    databaseName: string;
    tableName: string;
    fields: FieldDefinition[];
    indexes: IndexDefinition[];
    foreignKeys: ForeignKeyDefinition[];
    triggers: TriggerDefinition[];
  }): Promise<void> => {
    try {
      const response = await request.post<ApiResponse<void>>('/table/validate', params);
      if (!response.success) {
        throw new Error(response.message || '表验证失败');
      }
    } catch (error: any) {
      // 转换 axios 错误为应用错误
      if (error.response?.data) {
        throw new Error(error.response.data.message || '表验证失败');
      }
      throw error;
    }
  },

  /**
   * 创建表
   */
  createTable: async (params: {
    connectionId: string;
    databaseName: string;
    databaseType: string;
    tableName: string;
    fields: FieldDefinition[];
    indexes: IndexDefinition[];
    foreignKeys: ForeignKeyDefinition[];
    triggers: TriggerDefinition[];
    comment?: string;
  }): Promise<void> => {
    try {
      const response = await request.post<ApiResponse<void>>('/table/create', params);
      if (!response.success) {
        throw new Error(response.message || '创建表失败');
      }
    } catch (error: any) {
      // 转换 axios 错误为应用错误
      if (error.response?.data) {
        throw new Error(error.response.data.message || '创建表失败');
      }
      throw error;
    }
  },

  /**
   * 获取数据库支持的数据类型
   */
  getDatabaseTypes: async (params: {
    connectionId: string;
    databaseType: string;
  }): Promise<{
    types: string[];
    definitions: Record<string, DataTypeDefinition>;
  }> => {
    try {
      console.log('调用getDatabaseTypes API:', params);
      
      // request.ts中已经配置了baseURL为'/api'，所以这里不需要再加'/api'前缀
      const response = await request.get<ApiResponse<{
        types: string[];
        definitions: Record<string, DataTypeDefinition>;
      }>>(`/table/types`, { 
        params: {
          connectionId: params.connectionId,
          databaseType: params.databaseType
        }
      });
      
      console.log('获取数据类型API响应:', response);
      
      if (!response || !response.success) {
        console.error('获取数据类型失败:', response);
        throw new Error(response?.message || '获取数据类型失败');
      }
      
      // 验证返回数据结构
      if (!response.data) {
        console.error('获取数据类型返回数据为空');
        throw new Error('获取数据类型返回数据为空');
      }
      
      console.log('获取数据类型成功:', response.data);
      
      // 确保返回的数据结构符合预期
      const types = Array.isArray(response.data.types) ? response.data.types : [];
      const definitions = response.data.definitions || {};
      
      return {
        types,
        definitions
      };
    } catch (error: any) {
      console.error('获取数据类型错误:', error);
      // 提供默认返回值，避免应用崩溃
      return {
        types: [],
        definitions: {}
      };
    }
  },

  /**
   * 获取可用的参考表列表
   * @param params 请求参数
   * @returns 返回表名列表
   */
  getReferenceTables: async (params: {
    connectionId: string;
    databaseName: string;
  }): Promise<string[]> => {
    try {
      const response = await request.get<ApiResponse<string[]>>(`/table/reference-tables`, {
        params
      });
      
      if (!response.success) {
        throw new Error(response.message || '获取参考表失败');
      }
      
      return response.data || [];
    } catch (error: any) {
      console.error('获取参考表错误:', error);
      return [];
    }
  },

  /**
   * 获取表的字段列表
   * @param params 请求参数
   * @returns 返回字段名列表
   */
  getTableColumns: async (params: {
    connectionId: string;
    databaseName: string;
    tableName: string;
  }): Promise<string[]> => {
    try {
      const response = await request.get<ApiResponse<string[]>>(`/table/columns`, {
        params
      });
      
      if (!response.success) {
        throw new Error(response.message || '获取表字段失败');
      }
      
      return response.data || [];
    } catch (error: any) {
      console.error('获取表字段错误:', error);
      return [];
    }
  }
};

// 默认导出
export default tableService; 