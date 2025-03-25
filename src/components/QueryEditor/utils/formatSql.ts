import axios from 'axios';

/**
 * 格式化SQL
 * 简单实现，生产环境可以使用sql-formatter库
 * 
 * @param sql SQL语句
 * @param dialect SQL方言
 * @returns 格式化后的SQL
 */
export function formatSql(sql: string, dialect: string = 'sql'): string {
  // 移除多余空格
  let formatted = sql.trim()
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');
  
  // 关键字大写
  const keywords = ['SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'GROUP BY', 
    'ORDER BY', 'HAVING', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 
    'AS', 'UNION', 'ALL', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'];
  
  // 查找关键字并大写
  keywords.forEach(keyword => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    formatted = formatted.replace(regex, keyword);
  });
  
  // 简单的缩进和换行
  formatted = formatted
    .replace(/SELECT/gi, 'SELECT\n  ')
    .replace(/FROM/gi, '\nFROM')
    .replace(/WHERE/gi, '\nWHERE')
    .replace(/ORDER BY/gi, '\nORDER BY')
    .replace(/GROUP BY/gi, '\nGROUP BY')
    .replace(/HAVING/gi, '\nHAVING')
    .replace(/UNION/gi, '\nUNION')
    .replace(/LEFT JOIN|RIGHT JOIN|INNER JOIN|JOIN/gi, '\n$&')
    .replace(/AND/gi, '\n  AND')
    .replace(/OR/gi, '\n  OR');
  
  return formatted;
}

/**
 * 使用AI格式化SQL
 * 
 * @param sql SQL语句
 * @param dialect SQL方言
 * @returns 格式化后的SQL
 */
export async function aiFormatSql(sql: string, dialect: string = 'sql'): Promise<string> {
  try {
    // 调用后端格式化API
    const response = await axios.post('/api/sql/format', { 
      sql, 
      dialect,
      useAi: true
    });
    
    if (response.data && response.data.formattedSql) {
      return response.data.formattedSql;
    }
    
    // 如果API调用失败，使用本地格式化作为备选
    throw new Error('API响应格式不正确');
  } catch (error) {
    console.error('AI格式化SQL失败，使用本地格式化:', error);
    return formatSql(sql, dialect);
  }
} 