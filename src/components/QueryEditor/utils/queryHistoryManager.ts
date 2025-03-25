/**
 * 查询历史记录项接口
 */
export interface QueryHistoryItem {
  id: string;
  sql: string;
  timestamp: number;
  connectionId?: string;
  database?: string;
  executionTime?: number;
  affectedRows?: number;
  success: boolean;
  errorMessage?: string;
}

/**
 * 查询历史管理器类
 * 负责管理SQL查询历史记录
 */
export class QueryHistoryManager {
  private static readonly LOCAL_STORAGE_KEY = 'sql_query_history';
  private static readonly MAX_HISTORY_ITEMS = 100;
  
  private history: QueryHistoryItem[] = [];
  
  constructor() {
    this.loadFromStorage();
  }
  
  /**
   * 从本地存储加载历史记录
   */
  private loadFromStorage(): void {
    try {
      const storedHistory = localStorage.getItem(QueryHistoryManager.LOCAL_STORAGE_KEY);
      if (storedHistory) {
        this.history = JSON.parse(storedHistory);
      }
    } catch (error) {
      console.error('加载SQL查询历史记录失败:', error);
      this.history = [];
    }
  }
  
  /**
   * 保存历史记录到本地存储
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(
        QueryHistoryManager.LOCAL_STORAGE_KEY, 
        JSON.stringify(this.history.slice(0, QueryHistoryManager.MAX_HISTORY_ITEMS))
      );
    } catch (error) {
      console.error('保存SQL查询历史记录失败:', error);
    }
  }
  
  /**
   * 添加新的查询记录
   * @param item 查询历史项
   */
  addQueryToHistory(item: Omit<QueryHistoryItem, 'id' | 'timestamp'>): void {
    const newItem: QueryHistoryItem = {
      ...item,
      id: this.generateId(),
      timestamp: Date.now()
    };
    
    this.history.unshift(newItem);
    
    // 限制历史记录数量
    if (this.history.length > QueryHistoryManager.MAX_HISTORY_ITEMS) {
      this.history = this.history.slice(0, QueryHistoryManager.MAX_HISTORY_ITEMS);
    }
    
    this.saveToStorage();
  }
  
  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return 'query_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  /**
   * 获取所有查询历史
   */
  getAllHistory(): QueryHistoryItem[] {
    return [...this.history];
  }
  
  /**
   * 按数据库过滤查询历史
   * @param database 数据库名称
   */
  getHistoryByDatabase(database: string): QueryHistoryItem[] {
    return this.history.filter(item => item.database === database);
  }
  
  /**
   * 按连接ID过滤查询历史
   * @param connectionId 连接ID
   */
  getHistoryByConnection(connectionId: string): QueryHistoryItem[] {
    return this.history.filter(item => item.connectionId === connectionId);
  }
  
  /**
   * 删除指定的查询历史
   * @param id 查询历史ID
   */
  deleteQueryHistory(id: string): void {
    this.history = this.history.filter(item => item.id !== id);
    this.saveToStorage();
  }
  
  /**
   * 清空所有查询历史
   */
  clearAllHistory(): void {
    this.history = [];
    this.saveToStorage();
  }
  
  /**
   * 更新查询历史项
   * @param id 查询历史ID
   * @param updates 更新内容
   */
  updateQueryHistory(id: string, updates: Partial<QueryHistoryItem>): void {
    const index = this.history.findIndex(item => item.id === id);
    if (index !== -1) {
      this.history[index] = { ...this.history[index], ...updates };
      this.saveToStorage();
    }
  }
  
  /**
   * 搜索查询历史
   * @param keyword 搜索关键词
   */
  searchHistory(keyword: string): QueryHistoryItem[] {
    if (!keyword.trim()) {
      return this.getAllHistory();
    }
    
    const lowerKeyword = keyword.toLowerCase();
    return this.history.filter(item => 
      item.sql.toLowerCase().includes(lowerKeyword) ||
      (item.database && item.database.toLowerCase().includes(lowerKeyword))
    );
  }
} 