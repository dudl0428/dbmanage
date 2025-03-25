// import { monaco } from 'react-monaco-editor';
import { DbSchema } from '../constants/sqlData';

// API基础配置
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://localhost:8080/api'  // 生产环境API地址
  : 'http://localhost:3000/api'; // 开发环境API地址

/**
 * SQL关键字列表
 */
const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 
  'TABLE', 'INDEX', 'VIEW', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP BY', 
  'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET', 'UNION', 'ALL', 'AS', 'DISTINCT', 'COUNT', 
  'SUM', 'AVG', 'MAX', 'MIN', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS NULL', 
  'IS NOT NULL', 'DESC', 'ASC', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL JOIN', 'CROSS JOIN',
  'EXISTS', 'HAVING', 'WITH'
];

/**
 * 注册SQL自动完成提供程序
 * @param monaco Monaco编辑器实例
 * @param dbSchema 数据库结构信息，从后端API获取
 */
export const registerSqlCompletionProvider = (monaco: any, dbSchema: DbSchema) => {
  // 注册SQL语言高亮
  registerSQLHighlighting(monaco);
  
  // 配置编辑器默认设置
  monaco.editor.defineTheme('sqlTheme', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: '0000ff', fontStyle: 'bold' },
      { token: 'operator', foreground: '008800' },
      { token: 'string', foreground: 'a31515' },
      { token: 'number', foreground: '098658' },
      { token: 'comment', foreground: '008000', fontStyle: 'italic' }
    ],
    colors: {
      'editor.foreground': '#000000',
      'editor.background': '#ffffff',
      'editor.lineHighlightBackground': '#f5f5f5',
      'editorCursor.foreground': '#1890ff',
      'editorLineNumber.foreground': '#999999',
      'editor.selectionBackground': '#add6ff',
      'editor.inactiveSelectionBackground': '#e5ebf1'
    }
  });
  
  monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: [' ', '.', ',', '(', '=', '\n'],
    provideCompletionItems: async (model: any, position: any) => {
      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      
      const currentLine = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });
      
      // 检查是否在注释中
      if (currentLine.trim().startsWith('--')) {
        return { suggestions: [] };
      }
      
      // 初始化建议数组
      const suggestions: any[] = [];
      
      // 添加关键字建议
      addKeywordSuggestions(monaco, suggestions);
      
      // 添加表名和列名建议（如果有数据库结构）
      if (dbSchema && dbSchema.tables && dbSchema.tables.length > 0) {
        addTableColumnSuggestions(monaco, suggestions, textUntilPosition, dbSchema);
      }
      
      // 添加函数建议
      addFunctionSuggestions(monaco, suggestions);
      
      return { suggestions };
    }
  });
};

/**
 * 注册SQL语言高亮配置
 */
const registerSQLHighlighting = (monaco: any) => {
  // 定义SQL关键字的高亮规则
  monaco.languages.setMonarchTokensProvider('sql', {
    ignoreCase: true,
    defaultToken: '',
    
    keywords: SQL_KEYWORDS,
    
    operators: [
      '=', '>', '<', '!', '~', '?', ':',
      '==', '<=', '>=', '!=', '&&', '||', '++', '--', '+', '-', '*', '/', '%'
    ],
    
    // 符号定义
    symbols: /[=><!~?:&|+\-*\/\^%]+/,
    
    // C样式字符串（允许多行字符串和转义引号）
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    
    // 标记器规则
    tokenizer: {
      root: [
        // 标识符和关键字
        [/[a-zA-Z_]\w*/, { 
          cases: { 
            '@keywords': 'keyword',
            '@default': 'identifier' 
          } 
        }],
        
        // 空格
        { include: '@whitespace' },
        
        // 分隔符和运算符
        [/[{}()\[\]]/, '@brackets'],
        [/[<>](?!@symbols)/, '@brackets'],
        [/@symbols/, { 
          cases: { 
            '@operators': 'operator',
            '@default': '' 
          } 
        }],
        
        // 数字
        [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
        [/\d+/, 'number'],
        
        // 字符串
        [/'([^'\\]|\\.)*$/, 'string.invalid'],  // 不闭合的字符串
        [/'/, { token: 'string.quote', bracket: '@open', next: '@string' }],
        
        // 双引号字符串
        [/"([^"\\]|\\.)*$/, 'string.invalid'],  // 不闭合的字符串
        [/"/, { token: 'string.quote', bracket: '@open', next: '@stringDouble' }],
      ],
      
      string: [
        [/[^'\\]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/'/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ],
      
      stringDouble: [
        [/[^"\\]+/, 'string'],
        [/@escapes/, 'string.escape'],
        [/\\./, 'string.escape.invalid'],
        [/"/, { token: 'string.quote', bracket: '@close', next: '@pop' }]
      ],
      
      whitespace: [
        [/[ \t\r\n]+/, 'white'],
        [/--.*$/, 'comment'],
        [/\/\*/, { token: 'comment.quote', next: '@comment' }]
      ],
      
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, { token: 'comment.quote', next: '@pop' }],
        [/[/*]/, 'comment']
      ]
    }
  });
};

/**
 * 添加关键字建议
 */
const addKeywordSuggestions = (monaco: any, suggestions: any[]) => {
  SQL_KEYWORDS.forEach(keyword => {
    suggestions.push({
      label: keyword,
      kind: monaco.languages.CompletionItemKind.Keyword,
      insertText: keyword,
      detail: '关键字',
      documentation: {
        value: getSQLKeywordDocumentation(keyword)
      }
    });
  });
};

/**
 * 添加表名和列名建议
 */
const addTableColumnSuggestions = (monaco: any, suggestions: any[], textUntilPosition: string, dbSchema: DbSchema) => {
  if (!dbSchema || !dbSchema.tables || dbSchema.tables.length === 0) {
    return; // 如果没有数据库结构信息，不添加表和列建议
  }
  
  // 记录查询过程，方便调试
  console.log('当前文本:', textUntilPosition);

  // ====================== 检测是否应该提示表名 ======================
  // 精确匹配FROM关键字后的模式
  const fromRegexExact = /\b(FROM|JOIN|INTO|UPDATE|TABLE)\s+([a-zA-Z0-9_]*)$/i;  
  // 匹配任何部分输入的表名的模式
  const tableNameRegex = /\b([a-zA-Z0-9_]+)$/i;
  // 宽松的FROM模式，匹配FROM子句中的任何位置
  const fromRegexLoose = /\bFROM\s+.*?$/i;
  
  // 首先尝试精确匹配FROM关键字
  const fromMatchExact = textUntilPosition.match(fromRegexExact);
  // 检查是否有FROM子句
  const hasFromClause = fromRegexLoose.test(textUntilPosition);
  // 尝试匹配任何部分输入的表名
  const tableNameMatch = textUntilPosition.match(tableNameRegex);
  
  // 判断是否应该提示表名
  const shouldSuggestTables = fromMatchExact || (hasFromClause && tableNameMatch);

  // ====================== 其他匹配模式 ======================
  // 检查是不是在WHERE、SELECT等关键字后面，应该提示列名
  const whereRegex = /\b(WHERE|AND|OR|ON|BY|HAVING|SELECT|SET)\s+([a-zA-Z0-9_\.]*)$/i;
  const whereMatch = textUntilPosition.match(whereRegex);
  
  // 更宽松的WHERE关键字匹配，匹配WHERE后面的任何位置
  const whereLooseRegex = /\bWHERE\b.*?$/i;
  const hasWhereClause = whereLooseRegex.test(textUntilPosition);
  
  // 检查是不是在点号后面，应该提示特定表的列名
  const dotRegex = /([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]*)$/i;
  const dotMatch = textUntilPosition.match(dotRegex);
  
  // 检查是否需要提示表字段 - 更宽松的条件匹配
  const shouldSuggestColumns = whereMatch || hasWhereClause || /\b(AND|OR)\b.*?$/i.test(textUntilPosition);

  // ====================== 提供表名建议 ======================
  if (shouldSuggestTables) {
    // 尝试提取可能的表名前缀
    let prefix = '';
    if (fromMatchExact) {
      console.log('精确匹配到FROM语句:', fromMatchExact);
      prefix = fromMatchExact[2].toLowerCase();
    } else if (tableNameMatch) {
      console.log('在FROM子句中匹配到可能的表名:', tableNameMatch);
      prefix = tableNameMatch[1].toLowerCase();
    }
    
    console.log('表名前缀:', prefix);
    
    // 存储已经添加的表名，避免重复
    const addedTables = new Set();
    
    dbSchema.tables.forEach((table: any) => {
      // 如果已经添加过该表，则跳过
      if (addedTables.has(table.name.toLowerCase())) {
        return;
      }
      
      // 过滤表名(如果有前缀输入)
      if (prefix && !table.name.toLowerCase().includes(prefix)) {
        return;
      }
      
      addedTables.add(table.name.toLowerCase());
      
      suggestions.push({
        label: table.name,
        kind: monaco.languages.CompletionItemKind.Class,
        insertText: table.name,
        detail: `表 (${table.columns?.length || 0}列)`,
        documentation: {
          value: table.comment || `表 ${table.name}`
        },
        sortText: '01' + table.name, // 确保表名在关键字之后
        filterText: table.name.toLowerCase() // 支持不区分大小写的过滤
      });
    });
    
    // 记录提示的表数量
    console.log(`提供了${addedTables.size}个表名建议`);
    return;
  }
  
  // ====================== 提供列名建议 ======================
  // 指定表的列名建议
  if (dotMatch) {
    console.log('匹配到表名.列名模式:', dotMatch);
    const tableName = dotMatch[1];
    const columnPrefix = dotMatch[2].toLowerCase();
    
    // 先尝试精确匹配表名
    let table = dbSchema.tables.find((t: any) => 
      t.name.toLowerCase() === tableName.toLowerCase()
    );
    
    // 如果精确匹配失败，尝试部分匹配
    if (!table) {
      table = dbSchema.tables.find((t: any) => 
        t.name.toLowerCase().includes(tableName.toLowerCase())
      );
    }
    
    if (table && table.columns) {
      console.log(`找到表 ${table.name} 的列信息`);
      
      // 存储已添加的列，避免重复
      const addedColumns = new Set();
      
      table.columns.forEach((column: any) => {
        // 如果已经添加过该列，则跳过
        if (addedColumns.has(column.name.toLowerCase())) {
          return;
        }
        
        // 过滤列名(如果有前缀输入)
        if (columnPrefix && !column.name.toLowerCase().includes(columnPrefix)) {
          return;
        }
        
        addedColumns.add(column.name.toLowerCase());
        
        suggestions.push({
          label: column.name,
          kind: monaco.languages.CompletionItemKind.Field,
          insertText: column.name,
          detail: `${column.type} - ${table.name}.${column.name}`,
          documentation: {
            value: column.comment || `${table.name}.${column.name} (${column.type})`
          },
          sortText: '001' + column.name, // 确保列名在表名之前
          filterText: column.name.toLowerCase() // 支持不区分大小写的过滤
        });
      });
      
      console.log(`提供了${addedColumns.size}个列名建议`);
    } else {
      console.log(`未找到表 ${tableName} 的信息`);
    }
    return;
  }
  
  // ====================== 提供WHERE等条件中的列名建议 ======================
  // 所有列名建议
  if (shouldSuggestColumns) {
    console.log('匹配到WHERE或类似语句');
    
    // 查找所有已经在FROM或JOIN子句中引用的表
    const referencedTables: string[] = [];
    
    // 使用正则表达式匹配FROM子句中的表
    const fromTableRegex = /\bFROM\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi;
    let fromTableMatch;
    while ((fromTableMatch = fromTableRegex.exec(textUntilPosition)) !== null) {
      const tableName = fromTableMatch[1];
      const tableAlias = fromTableMatch[2];
      referencedTables.push(tableName);
      if (tableAlias) {
        // 存储别名映射关系
        referencedTables.push(tableAlias);
      }
    }
    
    // 匹配JOIN子句中的表
    const joinTableRegex = /\bJOIN\s+([a-zA-Z0-9_]+)(?:\s+(?:AS\s+)?([a-zA-Z0-9_]+))?/gi;
    let joinTableMatch;
    while ((joinTableMatch = joinTableRegex.exec(textUntilPosition)) !== null) {
      const tableName = joinTableMatch[1];
      const tableAlias = joinTableMatch[2];
      referencedTables.push(tableName);
      if (tableAlias) {
        // 存储别名映射关系
        referencedTables.push(tableAlias);
      }
    }
    
    console.log('引用的表:', referencedTables);
    
    // 为查询中的每个表添加列建议
    // 存储已添加的列，避免重复
    const addedColumns = new Set();
    
    dbSchema.tables.forEach((table: any) => {
      if (table.columns) {
        // 只为查询中引用的表添加列建议，如果没有明确引用任何表，则提供所有表的列
        if (referencedTables.length === 0 || referencedTables.some(t => 
            table.name.toLowerCase().includes(t.toLowerCase()) || 
            t.toLowerCase().includes(table.name.toLowerCase())
        )) {
          // 首先添加完整的表名.列名形式
          table.columns.forEach((column: any) => {
            // 避免重复添加相同的列
            const columnKey = `${table.name}.${column.name}`.toLowerCase();
            if (addedColumns.has(columnKey)) {
              return;
            }
            
            addedColumns.add(columnKey);
            
            suggestions.push({
              label: `${table.name}.${column.name}`,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: `${table.name}.${column.name}`,
              detail: `${column.type}`,
              documentation: {
                value: column.comment || `${table.name}.${column.name} (${column.type})`
              },
              sortText: '01' + table.name + '.' + column.name,
              filterText: `${table.name}.${column.name}`.toLowerCase() // 支持不区分大小写的过滤
            });
            
            // 同时添加不带表名前缀的列名，方便用户直接输入列名
            // 为了避免冲突，确保这些建议排在表名.列名之后
            if (!addedColumns.has(column.name.toLowerCase())) {
              addedColumns.add(column.name.toLowerCase());
              
              suggestions.push({
                label: column.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: column.name,
                detail: `${column.type} - 来自 ${table.name}`,
                documentation: {
                  value: column.comment || `${column.name} (${column.type})\n\n来自表: ${table.name}`
                },
                sortText: '02' + column.name, // 确保排在表名.列名形式之后
                filterText: column.name.toLowerCase()
              });
            }
          });
        }
      }
    });
    
    // 增加一些常用的SQL表达式和函数提示，使WHERE子句更容易构建
    const whereOperators = [
      { label: '= ', insertText: '= ', detail: '等于' },
      { label: '> ', insertText: '> ', detail: '大于' },
      { label: '< ', insertText: '< ', detail: '小于' },
      { label: '>= ', insertText: '>= ', detail: '大于等于' },
      { label: '<= ', insertText: '<= ', detail: '小于等于' },
      { label: '<> ', insertText: '<> ', detail: '不等于' },
      { label: 'IN ()', insertText: 'IN ($1)', detail: '包含于集合', snippet: true },
      { label: 'LIKE ', insertText: "LIKE '%$1%'", detail: '模糊匹配', snippet: true },
      { label: 'BETWEEN', insertText: 'BETWEEN $1 AND $2', detail: '范围匹配', snippet: true },
      { label: 'IS NULL', insertText: 'IS NULL', detail: '空值判断' },
      { label: 'IS NOT NULL', insertText: 'IS NOT NULL', detail: '非空判断' }
    ];
    
    whereOperators.forEach(op => {
      suggestions.push({
        label: op.label,
        kind: monaco.languages.CompletionItemKind.Operator,
        insertText: op.insertText,
        insertTextRules: op.snippet ? monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet : undefined,
        detail: op.detail,
        sortText: '03' + op.label
      });
    });
    
    console.log(`提供了${addedColumns.size}个列名建议`);
  }
};

/**
 * 添加SQL函数提示
 */
const addFunctionSuggestions = (monaco: any, suggestions: any[]) => {
  const sqlFunctions = [
    { name: 'COUNT', description: '计算行数', syntax: 'COUNT(column|*)', snippet: 'COUNT(${1:*})${0}' },
    { name: 'SUM', description: '计算总和', syntax: 'SUM(column)', snippet: 'SUM(${1:column})${0}' },
    { name: 'AVG', description: '计算平均值', syntax: 'AVG(column)', snippet: 'AVG(${1:column})${0}' },
    { name: 'MAX', description: '计算最大值', syntax: 'MAX(column)', snippet: 'MAX(${1:column})${0}' },
    { name: 'MIN', description: '计算最小值', syntax: 'MIN(column)', snippet: 'MIN(${1:column})${0}' },
    { name: 'CONCAT', description: '连接字符串', syntax: 'CONCAT(string1, string2, ...)', snippet: 'CONCAT(${1:string1}, ${2:string2})${0}' },
    { name: 'SUBSTRING', description: '提取子字符串', syntax: 'SUBSTRING(string, start, length)', snippet: 'SUBSTRING(${1:string}, ${2:start}, ${3:length})${0}' },
    { name: 'UPPER', description: '转为大写', syntax: 'UPPER(string)', snippet: 'UPPER(${1:string})${0}' },
    { name: 'LOWER', description: '转为小写', syntax: 'LOWER(string)', snippet: 'LOWER(${1:string})${0}' },
    { name: 'LENGTH', description: '计算字符串长度', syntax: 'LENGTH(string)', snippet: 'LENGTH(${1:string})${0}' },
    { name: 'NOW', description: '获取当前日期时间', syntax: 'NOW()', snippet: 'NOW()${0}' },
    { name: 'DATE_FORMAT', description: '格式化日期', syntax: "DATE_FORMAT(date, '%Y-%m-%d')", snippet: "DATE_FORMAT(${1:date}, '${2:%Y-%m-%d}')${0}" },
    { name: 'DATE_ADD', description: '日期加减', syntax: 'DATE_ADD(date, INTERVAL value unit)', snippet: 'DATE_ADD(${1:date}, INTERVAL ${2:value} ${3:DAY})${0}' },
    { name: 'DATE_SUB', description: '日期减法', syntax: 'DATE_SUB(date, INTERVAL value unit)', snippet: 'DATE_SUB(${1:date}, INTERVAL ${2:value} ${3:DAY})${0}' },
    { name: 'IFNULL', description: '空值处理', syntax: 'IFNULL(expression, replacement)', snippet: 'IFNULL(${1:expression}, ${2:replacement})${0}' },
    { name: 'IF', description: '条件判断', syntax: 'IF(condition, value_if_true, value_if_false)', snippet: 'IF(${1:condition}, ${2:value_if_true}, ${3:value_if_false})${0}' }
  ];
  
  sqlFunctions.forEach(func => {
    suggestions.push({
      label: func.name,
      kind: monaco.languages.CompletionItemKind.Function,
      insertText: func.snippet,
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      detail: func.description,
      documentation: {
        value: `**语法:** ${func.syntax}\n\n**描述:** ${func.description}`
      }
    });
  });
};

/**
 * 获取SQL关键字的说明文档
 */
const getSQLKeywordDocumentation = (keyword: string): string => {
  const docs: Record<string, string> = {
    'SELECT': '指定要检索哪些列',
    'FROM': '指定要从哪些表中检索数据',
    'WHERE': '指定检索数据的条件',
    'INSERT': '插入新数据到表中',
    'UPDATE': '更新表中的数据',
    'DELETE': '从表中删除数据',
    'JOIN': '连接两个或多个表',
    'LEFT JOIN': '左连接，返回左表的所有行',
    'RIGHT JOIN': '右连接，返回右表的所有行',
    'INNER JOIN': '内连接，返回两表匹配的行',
    'GROUP BY': '按指定列对结果分组',
    'HAVING': '过滤分组后的结果',
    'ORDER BY': '按指定列排序结果',
    'LIMIT': '限制结果数量',
    'UNION': '合并两个或多个查询结果',
    'DISTINCT': '消除重复行',
    'COUNT': '计数函数',
    'SUM': '求和函数',
    'AVG': '求平均值函数',
    'MAX': '求最大值函数',
    'MIN': '求最小值函数'
  };
  
  return docs[keyword] || keyword;
}; 