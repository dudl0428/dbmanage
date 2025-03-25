// 引入专业的SQL格式化库
import { format } from 'sql-formatter';

// SQL方言类型
type SqlDialect = 'sql' | 'mysql' | 'postgresql' | 'mariadb' | 'db2' | 'spark' | 'redshift' | 'snowflake' | 'sqlite' | 'plsql' | 'bigquery' | 'hive' | 'tsql' | 'transactsql' | 'db2i' | 'trino' | 'singlestoredb' | 'n1ql' | 'tidb';

/**
 * 专业SQL格式化
 * 使用sql-formatter库格式化SQL
 * @param sql 需要格式化的SQL
 * @param dialect SQL方言类型(mysql, postgresql, sql等)
 * @returns 格式化后的SQL
 */
export const formatSQL = (sql: string, dialect: SqlDialect = 'mysql'): string => {
  try {
    return format(sql, {
      language: dialect, // 指定SQL方言
      tabWidth: 2, // 缩进宽度
      keywordCase: 'upper', // 关键字大写
      linesBetweenQueries: 2, // 查询之间的行数
      denseOperators: false, // 运算符前后有空格
      logicalOperatorNewline: 'before', // 逻辑运算符位置
    });
  } catch (error) {
    console.error('SQL格式化失败：', error);
    return sql; // 如果格式化失败，返回原始SQL
  }
};

/**
 * 自定义风格的SQL格式化
 * @param sql 需要格式化的SQL
 * @param options 格式化选项
 * @returns 格式化后的SQL
 */
export const formatSQLWithOptions = (sql: string, options: {
  dialect?: SqlDialect;
  tabWidth?: number;
  useTabs?: boolean;
  keywordCase?: 'upper' | 'lower' | 'preserve';
  dataTypeCase?: 'upper' | 'lower' | 'preserve';
  functionCase?: 'upper' | 'lower' | 'preserve';
  indentStyle?: 'standard' | 'tabularLeft' | 'tabularRight';
  logicalOperatorNewline?: 'before' | 'after';
  linesBetweenQueries?: number;
  denseOperators?: boolean;
  newlineBeforeSemicolon?: boolean;
} = {}): string => {
  try {
    return format(sql, {
      language: options.dialect || 'mysql',
      tabWidth: options.tabWidth,
      useTabs: options.useTabs,
      keywordCase: options.keywordCase,
      dataTypeCase: options.dataTypeCase,
      functionCase: options.functionCase,
      indentStyle: options.indentStyle,
      logicalOperatorNewline: options.logicalOperatorNewline,
      linesBetweenQueries: options.linesBetweenQueries,
      denseOperators: options.denseOperators,
      newlineBeforeSemicolon: options.newlineBeforeSemicolon
    });
  } catch (error) {
    console.error('SQL格式化失败：', error);
    return sql;
  }
}; 