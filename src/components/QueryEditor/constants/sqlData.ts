// SQL关键字列表 - 用于提示
export const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 
  'TABLE', 'INDEX', 'VIEW', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP BY', 
  'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'AS', 'DISTINCT', 'COUNT', 
  'SUM', 'AVG', 'MAX', 'MIN', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS NULL', 
  'IS NOT NULL', 'DESC', 'ASC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
  'EXISTS', 'ANY', 'ALL', 'SOME', 'HAVING', 'WITH', 'ROLLUP'
];

// 数据库表接口
export interface DbColumn {
  name: string;
  type: string;
  nullable?: boolean;
  comment?: string;
}

export interface DbTable {
  name: string;
  columns: DbColumn[];
  comment?: string;
}

/**
 * 数据库结构信息接口
 */
export interface DbSchema {
  tables: TableInfo[];
}

/**
 * 表信息接口
 */
export interface TableInfo {
  name: string;
  comment?: string;
  columns: ColumnInfo[];
}

/**
 * 列信息接口
 */
export interface ColumnInfo {
  name: string;
  type: string;
  comment?: string;
  isPrimary?: boolean;
  isNullable?: boolean;
  defaultValue?: string;
}

// 模拟数据库和表结构 - 仅用于开发和测试环境的备用数据
export const MOCK_DB_SCHEMA_EXAMPLE: DbSchema = {
  tables: [
    {
      name: 'users',
      comment: '用户表',
      columns: [
        { name: 'id', type: 'INT', comment: '用户ID', isPrimary: true, isNullable: false },
        { name: 'username', type: 'VARCHAR(50)', comment: '用户名', isNullable: false },
        { name: 'password', type: 'VARCHAR(100)', comment: '密码', isNullable: false },
        { name: 'email', type: 'VARCHAR(100)', comment: '邮箱', isNullable: true },
        { name: 'phone', type: 'VARCHAR(20)', comment: '电话', isNullable: true },
        { name: 'created_at', type: 'DATETIME', comment: '创建时间', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'DATETIME', comment: '更新时间', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
        { name: 'status', type: 'TINYINT', comment: '状态 (1: 活跃, 0: 禁用)', isNullable: false, defaultValue: '1' },
      ]
    },
    {
      name: 'orders',
      comment: '订单表',
      columns: [
        { name: 'id', type: 'INT', comment: '订单ID', isPrimary: true, isNullable: false },
        { name: 'user_id', type: 'INT', comment: '用户ID', isNullable: false },
        { name: 'order_number', type: 'VARCHAR(50)', comment: '订单号', isNullable: false },
        { name: 'order_date', type: 'DATETIME', comment: '订单日期', isNullable: false },
        { name: 'total_amount', type: 'DECIMAL(10,2)', comment: '订单总金额', isNullable: false },
        { name: 'status', type: 'VARCHAR(20)', comment: '订单状态', isNullable: false, defaultValue: "'pending'" },
        { name: 'payment_method', type: 'VARCHAR(50)', comment: '支付方式', isNullable: true },
        { name: 'shipping_address', type: 'TEXT', comment: '收货地址', isNullable: true },
        { name: 'created_at', type: 'DATETIME', comment: '创建时间', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'DATETIME', comment: '更新时间', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' }
      ]
    },
    {
      name: 'products',
      comment: '商品表',
      columns: [
        { name: 'id', type: 'INT', comment: '商品ID', isPrimary: true, isNullable: false },
        { name: 'name', type: 'VARCHAR(100)', comment: '商品名称', isNullable: false },
        { name: 'description', type: 'TEXT', comment: '商品描述', isNullable: true },
        { name: 'price', type: 'DECIMAL(10,2)', comment: '价格', isNullable: false },
        { name: 'stock', type: 'INT', comment: '库存', isNullable: false, defaultValue: '0' },
        { name: 'category_id', type: 'INT', comment: '类别ID', isNullable: true },
        { name: 'image_url', type: 'VARCHAR(255)', comment: '图片URL', isNullable: true },
        { name: 'created_at', type: 'DATETIME', comment: '创建时间', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' },
        { name: 'updated_at', type: 'DATETIME', comment: '更新时间', isNullable: false, defaultValue: 'CURRENT_TIMESTAMP' }
      ]
    }
  ]
};

/**
 * 示例SQL查询
 */
export const EXAMPLE_QUERIES = [
  { 
    title: '基本SELECT查询', 
    sql: 'SELECT id, username, email\nFROM users\nWHERE status = 1\nORDER BY username',
    description: '从用户表中选择活跃用户'
  },
  { 
    title: 'JOIN查询', 
    sql: 'SELECT o.id, o.order_number, u.username, o.total_amount\nFROM orders o\nJOIN users u ON o.user_id = u.id\nWHERE o.status = \'completed\'',
    description: '查询所有已完成订单及其用户信息'
  },
  { 
    title: '聚合查询', 
    sql: 'SELECT\n  p.category_id,\n  c.name AS category_name,\n  COUNT(*) AS product_count,\n  AVG(p.price) AS avg_price\nFROM products p\nJOIN categories c ON p.category_id = c.id\nGROUP BY p.category_id\nHAVING COUNT(*) > 2\nORDER BY product_count DESC',
    description: '按类别统计商品数量和平均价格'
  },
  { 
    title: '子查询', 
    sql: 'SELECT id, username, email\nFROM users\nWHERE id IN (\n  SELECT DISTINCT user_id\n  FROM orders\n  WHERE total_amount > 1000\n)',
    description: '查询有大额订单的用户'
  },
  { 
    title: 'INSERT语句', 
    sql: 'INSERT INTO products (name, description, price, stock, category_id)\nVALUES\n(\'智能手机\', \'最新款智能手机，性能强劲\', 3999.99, 100, 1),\n(\'无线耳机\', \'高音质无线蓝牙耳机\', 899.00, 200, 1)',
    description: '添加新商品记录'
  }
];

/**
 * SQL查询历史记录条目接口
 */
export interface QueryHistoryItem {
  id: string;
  sql: string;
  timestamp: number;
  database?: string;
  executionTime?: number;
  rowCount?: number;
  status: 'success' | 'error';
  errorMessage?: string;
}

/**
 * 模拟SQL查询历史记录
 */
export const MOCK_QUERY_HISTORY: QueryHistoryItem[] = [
  {
    id: '1',
    sql: 'SELECT * FROM users WHERE status = 1',
    timestamp: Date.now() - 3600000,
    database: 'shop_db',
    executionTime: 0.024,
    rowCount: 85,
    status: 'success'
  },
  {
    id: '2',
    sql: 'UPDATE products SET stock = 0 WHERE id = 5',
    timestamp: Date.now() - 7200000,
    database: 'shop_db',
    executionTime: 0.012,
    rowCount: 1,
    status: 'success'
  },
  {
    id: '3',
    sql: 'SELECT * FROM invalid_table',
    timestamp: Date.now() - 10800000,
    database: 'shop_db',
    executionTime: 0.005,
    status: 'error',
    errorMessage: 'Table \'shop_db.invalid_table\' doesn\'t exist'
  }
];

/**
 * 模拟数据库连接
 */
export const MOCK_CONNECTIONS = [
  {
    id: 1,
    name: '本地MySQL',
    type: 'mysql',
    database: 'shop_db',
    host: 'localhost',
    port: 3306,
    username: 'root',
    status: 'connected'
  },
  {
    id: 2,
    name: '测试环境PostgreSQL',
    type: 'postgresql',
    database: 'test_db',
    host: '192.168.1.100',
    port: 5432,
    username: 'postgres',
    status: 'disconnected'
  },
  {
    id: 3,
    name: '生产环境MySQL',
    type: 'mysql',
    database: 'prod_db',
    host: '10.0.0.15',
    port: 3306,
    username: 'admin',
    status: 'error'
  }
]; 