/**
 * API响应基础接口
 */
export interface ApiResponse<T = any> {
  /**
   * 请求是否成功
   */
  success: boolean;
  
  /**
   * 响应代码
   */
  code: number;
  
  /**
   * 响应消息
   */
  message: string;
  
  /**
   * 响应数据
   */
  data: T;
  
  /**
   * 表单验证错误字段
   */
  field?: string;
}

/**
 * 分页数据接口
 */
export interface PaginationData<T = any> {
  /**
   * 当前页码
   */
  current: number;
  
  /**
   * 每页大小
   */
  pageSize: number;
  
  /**
   * 总记录数
   */
  total: number;
  
  /**
   * 总页数
   */
  totalPages: number;
  
  /**
   * 列表数据
   */
  list: T[];
}

/**
 * 分页查询参数接口
 */
export interface PaginationQuery {
  /**
   * 当前页码
   */
  current?: number;
  
  /**
   * 每页大小
   */
  pageSize?: number;
  
  /**
   * 排序字段
   */
  sortField?: string;
  
  /**
   * 排序方向
   */
  sortOrder?: 'ascend' | 'descend';
  
  /**
   * 搜索关键词
   */
  keyword?: string;
} 