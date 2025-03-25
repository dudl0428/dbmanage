/**
 * 字段定义接口
 */
export interface FieldDefinition {
  /**
   * 字段名
   */
  name: string;
  
  /**
   * 字段类型
   */
  type: string;
  
  /**
   * 字段长度
   */
  length?: number;
  
  /**
   * 小数位数
   */
  decimal?: number;
  
  /**
   * 默认值
   */
  defaultValue?: string;
  
  /**
   * 是否非空
   */
  notNull: boolean;
  
  /**
   * 是否自增
   */
  autoIncrement: boolean;
  
  /**
   * 是否为主键
   */
  primaryKey: boolean;
  
  /**
   * 注释
   */
  comment?: string;
}

/**
 * 索引定义接口
 */
export interface IndexDefinition {
  /**
   * 索引名
   */
  name: string;
  
  /**
   * 是否唯一索引
   */
  unique: boolean;
  
  /**
   * 索引字段名列表
   */
  columnNames: string[];
  
  /**
   * 索引类型
   */
  type?: string;
  
  /**
   * 索引方法（如BTREE, HASH等）
   */
  method?: string;
  
  /**
   * 注释
   */
  comment?: string;
  
  /**
   * 数据库类型
   */
  databaseType?: string;
}

/**
 * 外键定义接口
 */
export interface ForeignKeyDefinition {
  /**
   * 外键名
   */
  name: string;
  
  /**
   * 源字段列表
   */
  sourceColumns: string[];
  
  /**
   * 引用表名
   */
  referenceTable: string;
  
  /**
   * 引用字段列表
   */
  referenceColumns: string[];
  
  /**
   * 更新规则
   */
  updateRule?: string;
  
  /**
   * 删除规则
   */
  deleteRule?: string;
  
  /**
   * 注释
   */
  comment?: string;
  
  /**
   * 数据库类型
   */
  databaseType?: string;
}

/**
 * 触发器定义接口
 */
export interface TriggerDefinition {
  /**
   * 触发器名
   */
  name: string;
  
  /**
   * 触发时机（BEFORE, AFTER）
   */
  timing: string;
  
  /**
   * 触发事件（INSERT, UPDATE, DELETE）
   */
  event: string;
  
  /**
   * 触发器语句
   */
  statement: string;
  
  /**
   * 注释
   */
  comment?: string;
  
  /**
   * 数据库类型
   */
  databaseType?: string;
}

/**
 * 数据类型定义接口
 */
export interface DataTypeDefinition {
  /**
   * 是否支持长度属性
   */
  supportsLength: boolean;
  
  /**
   * 是否支持小数点属性
   */
  supportsDecimal: boolean;
  
  /**
   * 最大长度
   */
  maxLength?: number;
  
  /**
   * 最大小数位数
   */
  maxDecimal?: number;
  
  /**
   * 是否支持自增
   */
  supportsAutoIncrement: boolean;
}

export interface CreateTableRequest {
  connectionId: string;
  databaseName: string;
  tableName: string;
  fields: FieldDefinition[];
  indexes?: IndexDefinition[];
  foreignKeys?: ForeignKeyDefinition[];
  triggers?: TriggerDefinition[];
  comment?: string;
  options?: Record<string, string>;
} 