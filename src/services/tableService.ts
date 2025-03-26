import type { FieldDefinition, IndexDefinition, ForeignKeyDefinition, TriggerDefinition, DataTypeDefinition } from '@/types/table';
import request from '@/utils/request';
import { ApiResponse } from '@/types/api';
import axios from 'axios';
import { message } from 'antd';

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

// 定义表数据响应接口
export interface TableDataResponse {
  pagination: {
    total: number;
    current: number;
    pageSize: number;
    totalPages: number;
  };
  columns: string[];
  data: any[];
}

// 定义表结构接口
export interface TableStructure {
  columnName: string;
  dataType: string;
  isNullable: string;
  columnKey: string;
  columnDefault: any;
  extra: string;
  columnComment?: string;
}

/**
 * 表数据服务类
 * 提供表数据相关的API调用方法
 */
class TableService {
  // 获取认证头
  private getHeaders() {
    return {
      'Authorization': 'Bearer ' + localStorage.getItem('token'),
      'Content-Type': 'application/json'
    };
  }

  /**
   * 获取表结构
   * @param connectionId 连接ID
   * @param database 数据库名
   * @param table 表名
   * @returns 表结构数据
   */
  async getTableStructure(connectionId: number, database: string, table: string): Promise<TableStructure[]> {
    try {
      console.log(`获取表结构 - 连接ID: ${connectionId}, 数据库: ${database}, 表: ${table}`);
      const url = `/table-data/${connectionId}/${database}/${table}/structure`;
      
      const response = await request.get(url, {
        headers: this.getHeaders()
      });
      
      console.log('表结构API响应:', response);
      
      if (response.success) {
        return response.data || [];
      } else {
        message.error(response.data.message || '获取表结构失败');
        return [];
      }
    } catch (error: any) {
      console.error('获取表结构失败:', error);
      message.error(error.response?.data?.message || '获取表结构失败，请检查网络连接');
      return [];
    }
  }

  /**
   * 获取表数据
   * @param connectionId 连接ID
   * @param database 数据库名
   * @param table 表名
   * @param page 页码
   * @param pageSize 每页记录数
   * @returns 表数据和分页信息
   */
  async getTableData(
    connectionId: number, 
    database: string, 
    table: string, 
    page: number = 1, 
    pageSize: number = 100
  ): Promise<TableDataResponse> {
    try {
      console.log(`获取表数据 - 连接ID: ${connectionId}, 数据库: ${database}, 表: ${table}, 页码: ${page}, 每页: ${pageSize}`);
      const url = `/table-data/${connectionId}/${database}/${table}/data?page=${page}&pageSize=${pageSize}`;
      
      const response = await request.get(url, {
        headers: this.getHeaders()
      });
      
      console.log('表数据API响应:', response);
      
      if (response.success) {
        return response.data || { pagination: { total: 0, current: 1, pageSize, totalPages: 0 }, columns: [], data: [] };
      } else {
        message.error(response.message || '获取表数据失败');
        return { pagination: { total: 0, current: 1, pageSize, totalPages: 0 }, columns: [], data: [] };
      }
    } catch (error: any) {
      console.error('获取表数据失败:', error);
      message.error(error.response?.data?.message || '获取表数据失败，请检查网络连接');
      return { pagination: { total: 0, current: 1, pageSize, totalPages: 0 }, columns: [], data: [] };
    }
  }

  /**
   * 更新表数据
   * @param connectionId 连接ID
   * @param database 数据库名
   * @param table 表名
   * @param data 要更新的数据
   * @param condition 更新条件
   * @returns 更新结果
   */
  async updateTableData(
    connectionId: number, 
    database: string, 
    table: string, 
    data: Record<string, any>, 
    condition: Record<string, any>
  ): Promise<any> {
    try {
      console.log(`更新表数据 - 连接ID: ${connectionId}, 数据库: ${database}, 表: ${table}`);
      const url = `/table-data/${connectionId}/${database}/${table}/update`;
      
      const response = await request.post(url, {
        data,
        condition
      }, {
        headers: this.getHeaders()
      });
      
      if (response.data.success) {
        message.success('数据更新成功');
        return response.data.data;
      } else {
        message.error(response.data.message || '数据更新失败');
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      console.error('更新表数据失败:', error);
      message.error(error.response?.data?.message || '更新数据失败，请检查网络连接');
      throw error;
    }
  }

  /**
   * 插入表数据
   * @param connectionId 连接ID
   * @param database 数据库名
   * @param table 表名
   * @param data 要插入的数据
   * @returns 插入结果
   */
  async insertTableData(
    connectionId: number, 
    database: string, 
    table: string, 
    data: Record<string, any>
  ): Promise<any> {
    try {
      console.log(`插入表数据 - 连接ID: ${connectionId}, 数据库: ${database}, 表: ${table}`);
      const url = `/table-data/${connectionId}/${database}/${table}/insert`;
      
      const response = await request.post(url, data, {
        headers: this.getHeaders()
      });
      
      if (response.data.success) {
        message.success('数据添加成功');
        return response.data.data;
      } else {
        message.error(response.data.message || '数据添加失败');
        throw new Error(response.data.message);
      }
    } catch (error: any) {
      console.error('插入表数据失败:', error);
      message.error(error.response?.data?.message || '添加数据失败，请检查网络连接');
      throw error;
    }
  }

  /**
   * 删除表数据
   * @param connectionId 连接ID
   * @param database 数据库名
   * @param table 表名
   * @param condition 删除条件
   * @returns 删除结果
   */
  static async deleteTableData(connectionId: number, database: string, table: string, condition: Record<string, any>) {
    try {
      const url = `/table-data/${connectionId}/${database}/${table}/delete`;
      const response = await request.post(url, { condition }, {
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('token'),
          'Content-Type': 'application/json'
        }
      });
      if (response.data.success) {
        message.success('删除数据成功');
      }
      return response.data;
    } catch (error: any) {
      console.error('删除表数据失败:', error);
      message.error(`删除数据失败: ${error.response?.data?.message || error.message || '未知错误'}`);
      throw error;
    }
  }
}

export default new TableService(); 