import React, { useState, useRef, useEffect } from 'react';
import { Editor, loader } from '@monaco-editor/react';
import { message, Select, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import './style.css';
import { ConnectionResponse } from '../../services/connectionService';

// 配置monaco编辑器使用本地资源而不是CDN
loader.config({
  paths: {
    vs: '/monaco-editor/min/vs'
  },
  'vs/nls': {
    availableLanguages: {
      '*': 'zh-cn'
    }
  }
});

// 导入子组件
import EditorToolbar from './components/EditorToolbar';
import ResultsPanel from './components/ResultsPanel';
import AiAssistant from './components/AiAssistant';

// 导入工具函数
import { formatSql, aiFormatSql } from './utils/formatSql';
import { registerSqlCompletionProvider } from './utils/autoCompletion';
import { getApi } from '../../utils/api';

// 导入常量和模拟数据
import { 
  DbSchema,
  QueryHistoryItem,
} from './constants/sqlData';

// 编辑器配置
import { EDITOR_CONFIG } from '../../config';

// Schema缓存 - 存储每个数据库的结构信息
const schemaCache: Record<string, DbSchema> = {};

// 连接类型定义 - 扩展以匹配ConnectionResponse
interface Connection extends Partial<ConnectionResponse> {
  id: number;
  name: string;
  type: string;
  database?: string;
  host: string;
  port: number;
  username: string;
  status?: 'connected' | 'disconnected' | 'error' | undefined;
}

interface QueryEditorProps {
  height?: number | string;
  initialSql?: string;
  connection?: ConnectionResponse | null;
  database?: string | null;
  sql?: string;
  onChange?: (sql: string) => void;
}

const QueryEditor: React.FC<QueryEditorProps> = ({ 
  height = '100%',
  initialSql = '-- 在此处输入您的SQL查询',
  connection,
  database,
  sql: externalSql,
  onChange: externalOnChange
}) => {
  // 编辑器引用
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // 状态管理
  const [sql, setSql] = useState<string>(externalSql || initialSql);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [showAiAssistant, setShowAiAssistant] = useState<boolean>(false);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [executionTime, setExecutionTime] = useState<number>(0);
  const [results, setResults] = useState<any>({ data: [], columns: [] });
  const [showResults, setShowResults] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("results");
  const [resultsHeight, setResultsHeight] = useState<number>(200);
  const [sqlDialect, setSqlDialect] = useState<string>("mysql");
  const [isGeneratingSql, setIsGeneratingSql] = useState<boolean>(false);
  const [queryHistory, setQueryHistory] = useState<QueryHistoryItem[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<number | undefined>(undefined);
  const [selectedModel, setSelectedModel] = useState<'openai' | 'deepseek'>('openai');
  const [currentDatabase, setCurrentDatabase] = useState<string | undefined>(undefined);
  const [databaseList, setDatabaseList] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState<boolean>(false);
  const [isLoadingDatabases, setIsLoadingDatabases] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<{lineNumber: number, column: number}>({lineNumber: 1, column: 1});

  // 初始化
  useEffect(() => {
    // 获取所有连接
    handleRefreshConnections();
    
    return () => {
      // 清理逻辑
    };
  }, []);

  // 当数据库或连接改变时，获取数据库结构
  useEffect(() => {
    if (selectedConnection && currentDatabase) {
      fetchDbSchema();
    }
  }, [selectedConnection, currentDatabase]);

  // 处理连接变更时，获取该连接下的数据库列表
  useEffect(() => {
    if (selectedConnection) {
      fetchDatabases(selectedConnection);
    }
  }, [selectedConnection]);

  // 获取数据库结构
  const fetchDbSchema = async () => {
    if (!selectedConnection || !currentDatabase) return;
    
    // 检查缓存中是否已存在该数据库的结构信息
    const cacheKey = `${selectedConnection}-${currentDatabase}`;
    if (schemaCache[cacheKey]) {
      console.log('使用缓存的数据库结构:', cacheKey);
      
      // 使用缓存的结构信息更新编辑器
      if (monacoRef.current) {
        registerSqlCompletionProvider(monacoRef.current, schemaCache[cacheKey]);
      }
      return;
    }
    
    try {
      setIsLoading(true);
      const api = getApi();
      const response = await api.get('/database/complete-schema', {
        params: { 
          connectionId: selectedConnection,
          database: currentDatabase
        }
      });
      
      if (response.data && response.data.success) {
        const schemaData = response.data.data;
        console.log('获取到的数据库结构:', schemaData);
        
        // 处理表结构信息以适合编辑器自动完成
        const processedSchema: DbSchema = {
          tables: []
        };
        
        // 处理表和列信息
        if (schemaData.tables && Array.isArray(schemaData.tables)) {
          processedSchema.tables = schemaData.tables.map((table: any) => {
            // 确保表有有意义的注释
            const tableName = table.name || '';
            const tableComment = table.comment || table.tableComment || '';
            const processedTableComment = tableComment.trim() 
              ? tableComment 
              : `${tableName || '未命名表'}表`;
              
            // 处理表的列信息
            const tableColumns = (table.columns || []).map((column: any) => {
              // 确保字段有有意义的注释
              const columnName = column.Field || column.name || column.column_name || '';
              const columnComment = column.Comment || column.comment || '';
              const processedColumnComment = columnComment.trim() 
                ? columnComment 
                : `${columnName || '未命名字段'}字段`;
              
              // 提取并规范化字段类型
              const columnType = column.Type || column.type || column.data_type || '';
              
              // 处理主键标记
              const isPrimaryKey = column.isPrimaryKey === true || 
                                 column.key === 'PRI' || 
                                 column.Key === 'PRI' || 
                                 column.is_primary_key === true;
              
              // 处理可空性
              const isNullable = column.Null === 'YES' || 
                               column.nullable === true || 
                               column.is_nullable === 'YES';
              
              return {
                name: columnName,
                type: columnType,
                comment: processedColumnComment,
                nullable: isNullable,
                isPrimaryKey: isPrimaryKey,
                key: column.Key || column.key || '',
                default: column.Default || column.default || column.column_default || ''
              };
            });
            
            return {
              name: tableName,
              comment: processedTableComment,
              columns: tableColumns
            };
          });
        }
        
        // 保存到缓存
        schemaCache[cacheKey] = processedSchema;
        
        // 更新编辑器的自动完成提供程序
        if (monacoRef.current) {
          registerSqlCompletionProvider(monacoRef.current, processedSchema);
        }
        
        console.log('处理后的数据库结构:', processedSchema);
        message.success('已加载数据库结构');
      } else {
        console.error('获取数据库结构失败:', response.data?.message || '未知错误');
        message.warning('无法获取数据库结构，使用本地缓存');
      }
    } catch (error) {
      console.error('获取数据库结构出错:', error);
      message.warning('无法连接到数据库服务，使用本地缓存');
    } finally {
      setIsLoading(false);
    }
  };

  // 获取数据库列表
  const fetchDatabases = async (connectionId: number) => {
    if (!connectionId) return;
    
    setIsLoadingDatabases(true);
    try {
      const api = getApi();
      const response = await api.get(`/connections/${connectionId}/databases`);
      
      if (response.data && response.data.success) {
        const dbList = response.data.data || [];
        setDatabaseList(dbList);
        
        // 如果当前没有选择数据库，自动选择第一个
        if (dbList.length > 0 && !currentDatabase) {
          setCurrentDatabase(dbList[0]);
        }
      } else {
        console.error('获取数据库列表失败:', response.data?.message || '未知错误');
        message.error('获取数据库列表失败');
        setDatabaseList([]);
      }
    } catch (error) {
      console.error('获取数据库列表出错:', error);
      message.error('获取数据库列表失败，请检查网络连接');
      setDatabaseList([]);
    } finally {
      setIsLoadingDatabases(false);
    }
  };

  // 在处理连接变更时，需要重新获取数据库结构
  const handleConnectionChange = (connId: number) => {
    setSelectedConnection(connId);
    
    // 获取当前选择的连接对应的数据库
    const conn = connections.find(c => c.id === connId);
    if (conn && conn.database) {
      setCurrentDatabase(conn.database);
    } else {
      setCurrentDatabase(undefined);
    }
  };

  // 处理数据库变更
  const handleDatabaseChange = (dbName: string) => {
    setCurrentDatabase(dbName);
  };

  // 编辑器挂载完成
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // 初始化显示的SQL
    if (externalSql) {
      editor.setValue(externalSql);
    }
    
    // 配置编辑器
    editor.updateOptions({
      fontSize: EDITOR_CONFIG.fontSize || 14,
      wordWrap: EDITOR_CONFIG.wordWrap || 'on',
      minimap: { enabled: EDITOR_CONFIG.minimap || false },
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      tabSize: 2,
      automaticLayout: true,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        useShadows: true,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        verticalScrollbarSize: 10,
        horizontalScrollbarSize: 10,
      }
    });
    
    // 添加键盘快捷键
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, executeSql);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF, handleFormat);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {/* 保存功能 */});
    
    // 添加命令：自然语言转SQL - Alt+Q
    editor.addCommand(monaco.KeyMod.Alt | monaco.KeyCode.KeyQ, () => {
      const currentText = editor.getValue();
      // 如果当前选中了文本，只处理选中的部分
      const selection = editor.getSelection();
      let textToProcess = currentText;
      
      if (selection && !selection.isEmpty()) {
        const selectedText = editor.getModel().getValueInRange(selection);
        if (selectedText && selectedText.trim()) {
          textToProcess = selectedText;
        }
      }
      
      // 检测是否是自然语言查询
      if (detectNaturalLanguage(textToProcess)) {
        convertNaturalLanguageToSql(textToProcess);
      } else {
        message.info('当前内容不是自然语言查询或已经是SQL');
      }
    });
    
    // 添加快捷键提示
    const tooltipContents = [
      'Ctrl+Enter: 执行SQL',
      'Ctrl+Shift+F: 格式化SQL',
      'Alt+Q: 将自然语言转换为SQL',
      'Ctrl+Space: 显示/隐藏AI助手',
    ].join('\n');
    
    editor.getModel().updateOptions({
      tabSize: 2,
      insertSpaces: true,
    });
    
    // 获取光标位置
    editor.onDidChangeCursorPosition((e: any) => {
      setCursorPosition({
        lineNumber: e.position.lineNumber,
        column: e.position.column
      });
    });
    
    // 添加键盘事件监听
    editor.onKeyUp((e: any) => {
      // 实现智能检测：如果用户输入了自然语言并按下回车，自动转换为SQL
      if (e.keyCode === monaco.KeyCode.Enter) {
        // 获取当前行的内容
        const lineNumber = editor.getPosition().lineNumber;
        const lineContent = editor.getModel().getLineContent(lineNumber - 1); // 获取刚按下回车前的那一行
        
        // 如果这一行是自然语言查询，并且以?结尾，自动转换
        if (detectNaturalLanguage(lineContent) && lineContent.endsWith('?')) {
          convertNaturalLanguageToSql(lineContent);
        }
      }
    });
    
    // 添加contextMenu选项
    editor.addAction({
      id: 'convert-nl-to-sql',
      label: '将自然语言转换为SQL',
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.KeyQ],
      contextMenuGroupId: 'navigation',
      contextMenuOrder: 1.5,
      run: (ed: any) => {
        const selection = ed.getSelection();
        const text = selection.isEmpty() 
          ? ed.getValue() 
          : ed.getModel().getValueInRange(selection);
          
        if (text && text.trim()) {
          if (detectNaturalLanguage(text)) {
            convertNaturalLanguageToSql(text);
          } else {
            message.info('选中内容不是自然语言查询或已经是SQL');
          }
        } else {
          message.warning('请选择或输入有效的查询描述');
        }
      }
    });
    
    // 如果有数据库结构信息，初始化自动完成
    const cacheKey = `${selectedConnection}-${currentDatabase}`;
    if (schemaCache[cacheKey]) {
      registerSqlCompletionProvider(monaco, schemaCache[cacheKey]);
    }
  };

  // 处理编辑器加载错误
  const handleEditorWillMount = (monaco: any) => {
    monaco.languages.register({ id: 'sql' });
    monaco.languages.setMonarchTokensProvider('sql', {
      tokenizer: {
        root: [
          [/--.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/SELECT|INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|FROM|WHERE|GROUP BY|ORDER BY|HAVING|JOIN|LEFT|RIGHT|INNER|OUTER|UNION|ALL|AS|ON|BETWEEN|IN|LIKE|IS|NULL/i, 'keyword'],
          [/[A-Za-z][A-Za-z0-9_]*/, 'identifier'],
          [/[0-9]+/, 'number'],
          [/'[^']*'/, 'string'],
          [/"[^"]*"/, 'string'],
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment']
        ]
      }
    });
  };

  // 执行SQL
  const executeSql = async () => {
    if (isExecuting) return;
    
    // 获取当前SQL
    let currentSql = '';
    
    // 检查是否有选中的文本
    const editor = editorRef.current;
    if (editor) {
      const selection = editor.getSelection();
      if (selection && !selection.isEmpty()) {
        // 用户选择了部分SQL，只执行选中的部分
        currentSql = editor.getModel().getValueInRange(selection);
      } else {
        // 没有选择，执行整个编辑器内容
        currentSql = editor.getValue() || sql;
      }
    } else {
      currentSql = sql;
    }
    
    if (!currentSql.trim()) {
      message.warning('请输入SQL语句');
      return;
    }
    
    // 过滤掉 SQL 注释（以 -- 开头的行）
    currentSql = currentSql.split('\n')
      .filter((line: string) => !line.trim().startsWith('--'))
      .join('\n')
      .trim();
      
    if (!currentSql) {
      message.warning('SQL语句为空（可能全是注释）');
      return;
    }

    // 检查SQL语句是否是SELECT类型且没有LIMIT子句，自动添加LIMIT 1000
    const isSelectQuery = /^\s*SELECT\b/i.test(currentSql);
    const hasLimitClause = /\bLIMIT\s+\d+/i.test(currentSql);
    
    if (isSelectQuery && !hasLimitClause) {
      // 对于SELECT查询，自动添加LIMIT 1000
      currentSql = `${currentSql.trim()} LIMIT 1000`;
    }
    
    if (!selectedConnection) {
      message.warning('请先选择数据库连接');
      return;
    }
    
    if (!currentDatabase) {
      message.warning('请先选择数据库');
      return;
    }
    
    setIsExecuting(true);
    setShowResults(true);
    
    // 记录开始时间
    const startTime = Date.now();
    
    try {
      // 调用后端API执行SQL
      const api = getApi();
      const response = await api.post(`/connections/${selectedConnection}/databases/${currentDatabase}/execute`, {
        sql: currentSql
      });
      
      // 计算执行时间
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;
      
      console.log('API响应数据:', response.data);
      
      if (response.data && response.data.success) {
        // 处理可能的嵌套结构
        let resultData = response.data.data;
        
        // 检查是否有嵌套的data对象
        if (resultData && resultData.data && typeof resultData.data === 'object') {
          resultData = resultData.data;
          console.log('检测到嵌套的data结构，提取内层data:', resultData);
        }
        
        // 获取SQL类型
        const sqlType = resultData.sqlType || 'UNKNOWN';
        console.log('SQL类型:', sqlType);
        
        // 根据SQL类型和结果进行不同处理
        if (sqlType === 'SELECT' || resultData.isQueryResult) {
          const columns = resultData.columns || [];
          const rows = resultData.rows || [];
          
          console.log('处理查询结果数据:', {
            columns: columns,
            rows: rows
          });
          
          // 更新结果
          setResults({
            sqlType,
            data: rows.map((row: any, index: number) => ({
              key: `row-${index}`, // 确保每行有唯一key
              ...row
            })),
            columns: columns.map((col: string) => ({ title: col, dataIndex: col })),
            affectedRows: resultData.affectedRows || rows.length,
            totalCount: rows.length // 添加总记录数
          });
          setActiveTab("results");
          
          message.success(`查询执行成功，返回${rows.length}条记录，耗时${duration.toFixed(3)}秒`);
        } else if (['CREATE_TABLE', 'ALTER_TABLE', 'DROP_TABLE'].includes(sqlType)) {
          // 表结构操作
          setResults({
            sqlType,
            data: [],
            columns: [],
            affectedRows: resultData.affectedRows || 0,
            message: `成功执行${getSqlTypeDisplayName(sqlType)}操作，影响了${resultData.affectedRows || 0}行`,
            tables: resultData.tables || []
          });
          setActiveTab("messages");
          
          // 如果是表操作，刷新数据库结构
          fetchDbSchema();
          
          message.success(`${getSqlTypeDisplayName(sqlType)}操作成功，耗时${duration.toFixed(3)}秒`);
        } else if (['CREATE_VIEW', 'ALTER_VIEW', 'DROP_VIEW'].includes(sqlType)) {
          // 视图操作
          setResults({
            sqlType,
            data: [],
            columns: [],
            affectedRows: resultData.affectedRows || 0,
            message: `成功执行${getSqlTypeDisplayName(sqlType)}操作`,
            views: resultData.views || []
          });
          setActiveTab("messages");
          
          // 视图操作也需要刷新数据库结构
          fetchDbSchema();
          
          message.success(`${getSqlTypeDisplayName(sqlType)}操作成功，耗时${duration.toFixed(3)}秒`);
        } else if (['CREATE_PROCEDURE', 'CREATE_FUNCTION', 'DROP_PROCEDURE', 'DROP_FUNCTION'].includes(sqlType)) {
          // 存储过程和函数操作
          setResults({
            sqlType,
            data: [],
            columns: [],
            affectedRows: resultData.affectedRows || 0,
            message: `成功执行${getSqlTypeDisplayName(sqlType)}操作`,
            functions: resultData.functions || []
          });
          setActiveTab("messages");
          
          message.success(`${getSqlTypeDisplayName(sqlType)}操作成功，耗时${duration.toFixed(3)}秒`);
        } else if (['INSERT', 'UPDATE', 'DELETE'].includes(sqlType)) {
          // DML操作
          setResults({
            sqlType,
            data: [],
            columns: [],
            affectedRows: resultData.affectedRows || 0,
            message: `成功执行${getSqlTypeDisplayName(sqlType)}操作，影响了${resultData.affectedRows || 0}行`
          });
          setActiveTab("messages");
          
          message.success(`${getSqlTypeDisplayName(sqlType)}操作成功，影响了${resultData.affectedRows || 0}行，耗时${duration.toFixed(3)}秒`);
        } else if (sqlType === 'EXPLAIN') {
          // EXPLAIN查询结果
          const columns = resultData.columns || [];
          const rows = resultData.rows || [];
          
          setResults({
            sqlType,
            data: rows.map((row: any, index: number) => ({
              key: `row-${index}`,
              ...row
            })),
            columns: columns.map((col: string) => ({ title: col, dataIndex: col })),
            isExplain: true
          });
          setActiveTab("results");
          
          message.success(`执行计划查询成功，耗时${duration.toFixed(3)}秒`);
        } else if (sqlType === 'DESCRIBE' || sqlType === 'DESC' || sqlType === 'SHOW') {
          // DESCRIBE/SHOW命令结果
          const columns = resultData.columns || [];
          const rows = resultData.rows || [];
          
          setResults({
            sqlType,
            data: rows.map((row: any, index: number) => ({
              key: `row-${index}`,
              ...row
            })),
            columns: columns.map((col: string) => ({ title: col, dataIndex: col })),
          });
          setActiveTab("results");
          
          message.success(`${getSqlTypeDisplayName(sqlType)}命令执行成功，耗时${duration.toFixed(3)}秒`);
        } else if (['CREATE_INDEX', 'DROP_INDEX', 'CREATE_TRIGGER', 'DROP_TRIGGER', 'TRANSACTION', 'SET'].includes(sqlType)) {
          // 其他DDL和事务控制语句
          setResults({
            sqlType,
            data: [],
            columns: [],
            affectedRows: resultData.affectedRows || 0,
            message: `成功执行${getSqlTypeDisplayName(sqlType)}操作`
          });
          setActiveTab("messages");
          
          message.success(`${getSqlTypeDisplayName(sqlType)}操作成功，耗时${duration.toFixed(3)}秒`);
        } else {
          // 其他未明确处理的SQL类型，显示通用结果
          setResults({
            sqlType,
            data: resultData.rows || [],
            columns: resultData.columns || [],
            affectedRows: resultData.affectedRows || 0,
            message: `成功执行SQL操作，影响了${resultData.affectedRows || 0}行`
          });
          
          if (resultData.isQueryResult) {
            setActiveTab("results");
          } else {
            setActiveTab("messages");
          }
          
          message.success(`SQL执行成功，耗时${duration.toFixed(3)}秒`);
        }
        
        // 更新查询历史
        addQueryToHistory(
          currentSql, 
          resultData.affectedRows || (resultData.rows ? resultData.rows.length : 0), 
          duration, 
          'success'
        );
      } else {
        // 执行出错
        setResults({
          data: [],
          columns: [],
          error: response.data.message || '执行SQL失败',
          sqlType: response.data.sqlType || 'UNKNOWN'
        });
        setActiveTab("messages");
        
        // 添加到查询历史
        addQueryToHistory(currentSql, 0, duration, 'error', response.data.message);
        
        message.error('执行SQL失败: ' + (response.data.message || '未知错误'));
      }
    } catch (error: any) {
      console.error('执行SQL失败:', error);
      setResults({
        data: [],
        columns: [],
        error: error.message || '执行SQL失败'
      });
      setActiveTab("messages");
      
      // 添加到查询历史
      addQueryToHistory(currentSql, 0, 0, 'error', error.message);
      
      message.error('执行SQL失败: ' + (error.message || '未知错误'));
    } finally {
      setIsExecuting(false);
      setExecutionTime((Date.now() - startTime) / 1000);
    }
  };

  // 获取SQL类型的显示名称
  const getSqlTypeDisplayName = (sqlType: string): string => {
    const displayNames: Record<string, string> = {
      'SELECT': '查询',
      'INSERT': '插入',
      'UPDATE': '更新',
      'DELETE': '删除',
      'CREATE_TABLE': '创建表',
      'ALTER_TABLE': '修改表',
      'DROP_TABLE': '删除表',
      'CREATE_VIEW': '创建视图',
      'ALTER_VIEW': '修改视图',
      'DROP_VIEW': '删除视图',
      'CREATE_INDEX': '创建索引',
      'DROP_INDEX': '删除索引',
      'CREATE_PROCEDURE': '创建存储过程',
      'CREATE_FUNCTION': '创建函数',
      'DROP_PROCEDURE': '删除存储过程',
      'DROP_FUNCTION': '删除函数',
      'CREATE_TRIGGER': '创建触发器',
      'DROP_TRIGGER': '删除触发器',
      'TRANSACTION': '事务',
      'EXPLAIN': '执行计划',
      'DESCRIBE': '描述表结构',
      'DESC': '描述表结构',
      'SHOW': '显示',
      'CREATE_DATABASE': '创建数据库',
      'DROP_DATABASE': '删除数据库',
      'USE_DATABASE': '使用数据库',
      'SET': '设置变量',
      'GRANT': '授权',
      'REVOKE': '撤销授权',
      'CREATE_USER': '创建用户',
      'ALTER_USER': '修改用户',
      'DROP_USER': '删除用户',
      'CREATE_EVENT': '创建事件',
      'ALTER_EVENT': '修改事件',
      'DROP_EVENT': '删除事件'
    };
    
    return displayNames[sqlType] || 'SQL';
  };

  // 添加查询到历史记录
  const addQueryToHistory = (
    sql: string, 
    rowCount: number, 
    executionTime: number, 
    status: 'success' | 'error',
    errorMessage?: string
  ) => {
    const newHistoryItem: QueryHistoryItem = {
      id: Date.now().toString(),
      sql,
      timestamp: Date.now(),
      database: connections.find(c => c.id === selectedConnection)?.database,
      executionTime,
      rowCount,
      status,
      errorMessage
    };
    
    setQueryHistory(prev => [newHistoryItem, ...prev]);
  };

  // 处理SQL格式化
  const handleFormat = async () => {
    if (!editorRef.current) return;
    
    const currentSql = editorRef.current.getValue();
    if (!currentSql.trim()) return;
    
    try {
      const formattedSql = formatSql(currentSql, sqlDialect);
      editorRef.current.setValue(formattedSql);
      message.success('SQL格式化成功');
    } catch (error) {
      console.error('格式化SQL失败:', error);
      message.error('格式化SQL失败');
    }
  };

  // AI助手格式化
  const handleAiFormat = async () => {
    if (!editorRef.current) return;
    
    const currentSql = editorRef.current.getValue();
    if (!currentSql.trim()) return;
    
    try {
      message.loading({ content: 'AI正在格式化SQL...', key: 'formatting' });
      const formattedSql = await aiFormatSql(currentSql, sqlDialect);
      editorRef.current.setValue(formattedSql);
      message.success({ content: 'AI格式化SQL成功', key: 'formatting' });
    } catch (error) {
      console.error('AI格式化SQL失败:', error);
      message.error({ content: 'AI格式化SQL失败', key: 'formatting' });
    }
  };

  // 切换AI助手
  const toggleAiAssistant = () => {
    setShowAiAssistant(prev => !prev);
  };

  // 清除编辑器内容
  const clearEditor = () => {
    if (editorRef.current) {
      editorRef.current.setValue('');
    }
  };

  // 从历史记录中选择查询
  const selectQueryFromHistory = (query: string) => {
    if (editorRef.current) {
      editorRef.current.setValue(query);
    }
  };

  // 处理AI生成的SQL
  const handleGeneratedSql = (generatedSql: string) => {
    if (editorRef.current) {
      // 设置编辑器内容为生成的SQL
      editorRef.current.setValue(generatedSql);
      
      // 添加到历史记录
      addQueryToHistory(generatedSql, 0, 0, 'success');
      
      // 关闭AI助手
      setShowAiAssistant(false);
      
      // 向后端API发送模型使用记录（可选）
      try {
        // 这里可以调用API记录模型使用情况
        console.log(`使用${selectedModel}模型生成SQL:`, generatedSql);
      } catch (error) {
        console.error('记录模型使用情况失败:', error);
      }
    }
  };

  // 处理SQL方言变更
  const handleDialectChange = (dialect: string) => {
    setSqlDialect(dialect);
  };

  // 处理模型变更
  const handleModelChange = (model: 'openai' | 'deepseek') => {
    setSelectedModel(model);
  };

  // 添加获取所有连接的方法
  const handleRefreshConnections = async () => {
    setIsLoadingConnections(true);
    try {
      const api = getApi();
      const response = await api.get('/connections');
      
      if (response.data && response.data.success) {
        const connectionsData = response.data.data;
        setConnections(connectionsData.map((conn: any) => ({
          ...conn,
          status: conn.status as 'connected' | 'disconnected' | 'error' | undefined
        })));
        
        // 如果当前没有选择连接，或选择的连接不在列表中，自动选择第一个
        if (connectionsData.length > 0 && 
            (!selectedConnection || !connectionsData.some((c: any) => c.id === selectedConnection))) {
          handleConnectionChange(connectionsData[0].id);
        }
      } else {
        console.error('获取连接列表失败:', response.data?.message || '未知错误');
        message.error('获取连接列表失败');
      }
    } catch (error) {
      console.error('获取连接列表出错:', error);
      message.error('获取连接列表失败，请检查网络连接');
    } finally {
      setIsLoadingConnections(false);
    }
  };

  // 检测是否是自然语言查询
  const detectNaturalLanguage = (text: string): boolean => {
    if (!text || text.trim().length < 5) return false; // 降低最小长度要求
    
    // 常见的SQL关键字
    const sqlKeywords = ['select', 'from', 'where', 'group by', 'order by', 'having', 
                         'join', 'inner join', 'left join', 'right join', 'limit', 
                         'insert', 'update', 'delete', 'create', 'alter', 'drop'];
    
    // 检查是否包含SQL关键字
    const lowerText = text.toLowerCase();
    
    // 如果文本明显是SQL语句，直接返回false
    if (lowerText.startsWith('select ') || 
        lowerText.startsWith('insert ') || 
        lowerText.startsWith('update ') || 
        lowerText.startsWith('delete ')) {
      return false;
    }
    
    // 检查SQL关键字出现的频率和位置
    let keywordCount = 0;
    sqlKeywords.forEach(keyword => {
      // 计算关键字出现的次数
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) keywordCount += matches.length;
    });
    
    // 如果SQL关键字出现次数较多，可能是SQL
    if (keywordCount > 2) return false;
    
    // 中文指标: 包含中文字符的比例
    const chineseCharCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
    const chineseRatio = chineseCharCount / text.length;
    
    // 问句特征
    const hasQuestionMark = text.includes('?') || text.includes('？');
    const startsWithQuestionWords = /^(what|how|when|where|why|who|which|show|find|get|query|list|count|统计|查询|显示|获取|列出|查找|查看|请|我想|帮我)/i.test(text.trim());
    
    // 至少满足下列条件之一:
    // 1. 文本包含中文字符
    // 2. 文本形式为问句
    // 3. 文本以常见的自然语言查询词开头
    return (chineseRatio > 0.05) || // 降低中文比例要求
           (hasQuestionMark) ||     // 有问号就视为问句
           (startsWithQuestionWords);
  };

  // 处理自然语言转换为SQL
  const convertNaturalLanguageToSql = async (naturalLanguage: string) => {
    if (!naturalLanguage || naturalLanguage.trim() === '') return;
    
    // 显示正在处理的提示
    const currentValue = editorRef.current?.getValue() || '';
    editorRef.current?.setValue(`-- 正在将自然语言转换为SQL...\n-- 原始输入: ${naturalLanguage}\n${currentValue}`);
    
    try {
      // 获取当前连接和数据库信息
      const connectionId = selectedConnection;
      const databaseName = currentDatabase;
      
      if (!connectionId || !databaseName) {
        message.warning('请先选择数据库连接和数据库');
        return;
      }
      
      // 获取数据库结构信息
      const api = getApi();
      const schemaResponse = await api.get('/database/complete-schema', {
        params: { connectionId, database: databaseName }
      });
      
      if (!schemaResponse.data?.success) {
        message.error('获取数据库结构失败');
        return;
      }
      
      const schema = schemaResponse.data.data;
      
      // 获取当前连接类型
      const currentConnection = connections.find(c => c.id === connectionId);
      const connectionType = currentConnection?.type || 'mysql';
      
      // 调用后端API生成SQL
      const generateResponse = await api.post('/ai/generate-sql', {
        query: naturalLanguage,
        model: selectedModel,
        connectionType: connectionType,
        database: databaseName,
        schema: schema
      });
      
      if (generateResponse.data?.success) {
        const generatedSql = generateResponse.data.data;
        
        // 确保SQL前有足够的空白行，并且SQL从行首开始（没有前导空格）
        const trimmedSql = generatedSql.trim();
        const sqlWithComments = 
          `-- 以下SQL由自然语言生成:\n` +
          `-- "${naturalLanguage}"\n` +
          `-- 注意: SQL使用的是表的英文名，而不是中文名\n` +
          `-- 注意: AI只会使用提供的数据库结构中存在的表和字段\n` +
          `-- 如果SQL中使用了不存在的表或字段，请检查数据库结构\n\n` +
          trimmedSql;
        
        // 替换编辑器中的内容
        editorRef.current?.setValue(sqlWithComments);
      } else {
        message.error('生成SQL失败: ' + (generateResponse.data?.message || '未知错误'));
        
        // 恢复原始输入
        editorRef.current?.setValue(naturalLanguage);
      }
    } catch (error: any) {
      console.error('自然语言转SQL错误:', error);
      message.error('转换失败: ' + (error.message || '未知错误'));
      
      // 恢复原始输入
      editorRef.current?.setValue(naturalLanguage);
    }
  };

  // 编辑器内容变更时的处理
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || '';
    setSql(newValue);
    
    if (externalOnChange) {
      externalOnChange(newValue);
    }
    
    // 智能检测：当用户输入完一行文本后，检测是否是自然语言
    // 需要限制检测频率，避免频繁弹出提示
    if (editorRef.current && !isGeneratingSql) {
      const currentContent = newValue.trim();
      
      // 只在内容变化较大时进行检测
      if (currentContent.length > 15 && 
          currentContent.split('\n').length <= 3 && // 只检测少量行的输入
          !currentContent.startsWith('--') && // 不是注释
          detectNaturalLanguage(currentContent)) {
        
        // 使用antd的通知，提供转换建议
        message.info({
          content: (
            <div>
              <p>检测到您输入的可能是自然语言查询，是否转换为SQL？</p>
              <Button 
                type="primary" 
                size="small" 
                onClick={() => {
                  message.destroy(); // 关闭当前提示
                  convertNaturalLanguageToSql(currentContent);
                }}
                style={{ marginRight: '8px' }}
              >
                转换
              </Button>
              <Button 
                size="small" 
                onClick={() => message.destroy()}
              >
                取消
              </Button>
            </div>
          ),
          duration: 5, // 5秒后自动关闭
          key: 'nl-sql-suggestion' // 使用固定key，避免多个提示
        });
      }
    }
  };

  // 渲染编辑器和结果面板
  return (
    <div 
      className="query-editor" 
      style={{ 
        height, 
        display: 'flex', 
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* 合并工具栏和连接选择器 */}
      <div className="combined-toolbar">
        <div className="toolbar-left">
          <div className="connection-info">
            <span>数据库连接:</span>
            <Select
              value={selectedConnection}
              onChange={handleConnectionChange}
              style={{ width: 150 }}
              loading={isLoadingConnections}
              dropdownRender={(menu) => (
                <>
                  {menu}
                  <div style={{ padding: '8px', borderTop: '1px solid #e8e8e8' }}>
                    <a onClick={handleRefreshConnections} style={{ display: 'block', cursor: 'pointer' }}>
                      <ReloadOutlined /> 刷新连接
                    </a>
                  </div>
                </>
              )}
            >
              {connections.map(conn => (
                <Select.Option key={conn.id} value={conn.id}>{conn.name}</Select.Option>
              ))}
            </Select>
          </div>
          
          <div className="database-info">
            <span>数据库:</span>
            <Select
              value={currentDatabase}
              onChange={handleDatabaseChange}
              style={{ width: 150 }}
              disabled={!selectedConnection}
              loading={isLoadingDatabases}
            >
              {databaseList.map((db: string) => (
                <Select.Option key={db} value={db}>{db}</Select.Option>
              ))}
            </Select>
          </div>

          <EditorToolbar
            isExecuting={isExecuting}
            onExecute={executeSql}
            onFormat={handleFormat}
            onAiFormat={handleAiFormat}
            onToggleAi={toggleAiAssistant}
            showAiAssistant={showAiAssistant}
            onClear={clearEditor}
            sqlDialect={sqlDialect}
            onDialectChange={handleDialectChange}
            aiModel={selectedModel}
            onAiModelChange={handleModelChange}
            onNaturalLanguageConvert={() => {
              const editor = editorRef.current;
              if (editor) {
                const selection = editor.getSelection();
                const text = selection.isEmpty() 
                  ? editor.getValue() 
                  : editor.getModel().getValueInRange(selection);
                
                if (text && text.trim()) {
                  if (detectNaturalLanguage(text)) {
                    convertNaturalLanguageToSql(text);
                  } else {
                    message.info('当前内容不是自然语言查询或已经是SQL');
                  }
                } else {
                  message.warning('请选择或输入有效的查询描述');
                }
              }
            }}
          />
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="editor-content-wrapper" style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        {/* 编辑器区域 */}
        <div 
          className={`editor-area ${showResults ? 'with-results' : ''} ${showAiAssistant ? 'with-ai' : ''}`}
          style={{ 
            height: showResults ? `calc(100% - 40px - ${resultsHeight}px - 22px)` : 'calc(100% - 40px - 22px)',
            position: 'relative',
            minHeight: '50px', // 确保编辑器区域最小高度
            width: showResults ? 'calc(100% - 10px)' : '100%', // 当显示结果面板时，为拖动句柄留出空间
            flexGrow: 1,
          }}
        >
          {/* AI助手 */}
          {showAiAssistant && (
            <AiAssistant
              onClose={toggleAiAssistant}
              onGenerateSQL={handleGeneratedSql}
              isGenerating={isGeneratingSql}
              defaultModel={selectedModel}
              onModelChange={handleModelChange}
              defaultQuery={sql}
              queryHistory={queryHistory}
              onQuerySelect={selectQueryFromHistory}
              connectionId={selectedConnection}
              availableConnections={connections}
              selectedDatabase={currentDatabase}
            />
          )}

          {/* 代码编辑器 */}
          <div className="monaco-container">
            <Editor
              beforeMount={handleEditorWillMount}
              onMount={handleEditorDidMount}
              height="100%"
              width="100%"
              defaultLanguage="sql"
              defaultValue={sql}
              options={{
                fontSize: 14,
                automaticLayout: true,
                lineNumbers: 'on',
                lineNumbersMinChars: 3,
                folding: true,
                scrollBeyondLastLine: false,
                minimap: { enabled: false },
                lineDecorationsWidth: 10,
                lineHeight: 20
              }}
              onChange={handleEditorChange}
            />
            
            {isLoading && (
              <div className="editor-loading-overlay">
                <div className="editor-loading-content">
                  <div className="loading-spinner"></div>
                  <div className="loading-text">加载数据库结构...</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 结果面板，放在与编辑器同级而不是下方 */}
        {showResults && (
          <ResultsPanel
            results={results}
            showResults={showResults}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onClose={() => setShowResults(false)}
            executionTime={executionTime}
            height={typeof height === 'number' ? height - 62 : window.innerHeight - 62} // 垂直占满整个区域
            onHeightChange={(newHeight) => {
              // 因为我们改变了布局，这里主要处理的是保持水平拖拽的逻辑
              const totalAvailableHeight = window.innerHeight - 62;
              const minEditorHeight = 50;
              const maxResultsHeight = totalAvailableHeight - minEditorHeight;
              const limitedHeight = Math.max(50, Math.min(newHeight, maxResultsHeight));
              
              setResultsHeight(limitedHeight);
            }}
          />
        )}
      </div>
      
      {/* 底部状态栏 */}
      <div className="query-status-bar">
        <div className="status-left">
          <span className="cursor-position">行:{cursorPosition.lineNumber} 列:{cursorPosition.column}</span>
        </div>
        <div className="status-right">
          {results && (
            <>
              {results.sqlType && (
                <span className="sql-type">{getSqlTypeDisplayName(results.sqlType)}</span>
              )}
              {results.affectedRows !== undefined && (
                <span className="affected-rows">影响行数: {results.affectedRows}</span>
              )}
              {executionTime > 0 && (
                <span className="execution-time">执行时间: {executionTime.toFixed(3)}s</span>
              )}
            </>
          )}
          <span className="status-indicator">就绪</span>
        </div>
      </div>
    </div>
  );
};

export default QueryEditor;