import React, { useState, useEffect } from 'react';
import { Button, Input, Typography, Space, Divider, message, Spin } from 'antd';
import { CloseOutlined, RobotOutlined, SendOutlined, HistoryOutlined } from '@ant-design/icons';
import { EXAMPLE_QUERIES } from '../constants/sqlData';
import { getApi } from '../../../utils/api';
import { ConnectionResponse } from '../../../services/connectionService';

const { TextArea } = Input;
const { Text } = Typography;

// 定义连接状态类型
type ConnectionStatus = 'connected' | 'disconnected' | 'error' | undefined;

// 定义连接类型，扩展ConnectionResponse
interface Connection extends Partial<ConnectionResponse> {
  id: number;
  name: string;
  type: string;
  host: string;
  port: number;
  database?: string;
  username: string;
  status?: ConnectionStatus;
}

// 定义查询历史条目类型
interface QueryHistoryItem {
  id: string;
  sql: string;
  timestamp: number;
  database?: string;
  status: 'success' | 'error';
}

export interface AiAssistantProps {
  onClose: () => void;
  onGenerateSQL: (sql: string) => void;
  isGenerating: boolean;
  defaultModel?: 'openai' | 'deepseek';
  defaultQuery?: string;
  queryHistory?: QueryHistoryItem[];
  onQuerySelect?: (query: string) => void;
  onModelChange?: (model: 'openai' | 'deepseek') => void;
  connectionId?: number;
  availableConnections?: Connection[];
  selectedDatabase?: string;
}

const AiAssistant: React.FC<AiAssistantProps> = ({
  onClose,
  onGenerateSQL,
  isGenerating,
  defaultModel = 'openai',
  defaultQuery = '',
  queryHistory = [],
  onQuerySelect,
  onModelChange,
  connectionId,
  availableConnections = [],
  selectedDatabase,
}) => {
  // 基本状态
  const [query, setQuery] = useState(defaultQuery);
  const [model, setModel] = useState<'openai' | 'deepseek'>(defaultModel);
  const [isLoading, setIsLoading] = useState(false);
  const [schemaInfo, setSchemaInfo] = useState<string>('');

  // 当外部传入的connectionId改变时获取模式信息
  useEffect(() => {
    if (connectionId && selectedDatabase) {
      fetchSchemaInfo(connectionId, selectedDatabase);
    }
  }, [connectionId, selectedDatabase]);

  // 获取数据库结构信息
  const fetchSchemaInfo = async (connectionId: number, database: string) => {
    if (!connectionId || !database) return;
    
    setIsLoading(true);
    try {
      const api = getApi();
      const response = await api.get('/database/complete-schema', {
        params: { connectionId, database }
      });
      
      if (response.data && response.data.success) {
        const schemaData = response.data.data;
        
        // 确保schema格式正确，处理表和字段信息，确保包含注释
        const processedSchema = {
          databaseType: schemaData.databaseType || 'mysql',
          database: database,
          tables: (schemaData.tables || []).map((table: any) => {
            // 确保表有有意义的注释
            const tableComment = table.comment || table.tableComment || '';
            const processedTableComment = tableComment.trim() 
              ? tableComment 
              : `${table.name || '未命名表'}表`;
              
            return {
              name: table.name,
              comment: processedTableComment, // 使用处理后的表注释
              columns: (table.columns || []).map((column: any) => {
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
              })
            };
          })
        };
        
        console.log('处理后的数据库结构:', processedSchema);
        setSchemaInfo(JSON.stringify(processedSchema));
      } else {
        console.error('获取数据库结构失败:', response.data?.message || '未知错误');
        setSchemaInfo('');
      }
    } catch (error) {
      console.error('获取数据库结构出错:', error);
      setSchemaInfo('');
    } finally {
      setIsLoading(false);
    }
  };

  // 生成SQL
  const handleGenerate = async () => {
    if (!query.trim()) {
      message.warning('请输入查询描述');
      return;
    }

    onGenerateSQL(`-- 生成中...`);
    setIsLoading(true);

    try {
      // 使用外部传入的连接和数据库
      const conn = availableConnections.find(c => c.id === connectionId);
      const connectionType = conn?.type || 'mysql';
      
      // 添加一个简要的表结构说明，帮助AI更好理解数据结构
      let schemaStructureExplanation = "";
      
      if (schemaInfo) {
        try {
          const schemaData = JSON.parse(schemaInfo);
          if (schemaData.tables && Array.isArray(schemaData.tables) && schemaData.tables.length > 0) {
            schemaStructureExplanation = "数据库表结构概述:\n";
            
            // 收集所有表名和主键
            const tableInfo = new Map();
            schemaData.tables.forEach((table: any) => {
              const primaryKeys = [];
              if (table.columns) {
                for (const col of table.columns) {
                  if (col.isPrimaryKey || col.key === 'PRI') {
                    primaryKeys.push(col.name);
                  }
                }
              }
              tableInfo.set(table.name, {
                comment: table.comment,
                primaryKeys,
                englishName: table.name,
              });
            });
            
            // 尝试识别表间关系
            const relationships: Array<{from: string; to: string; via: string}> = [];
            schemaData.tables.forEach((table: any) => {
              if (table.columns) {
                table.columns.forEach((column: any) => {
                  if (column.name.toLowerCase().endsWith('_id')) {
                    const possibleTableName = column.name.substring(0, column.name.length - 3);
                    if (tableInfo.has(possibleTableName)) {
                      relationships.push({
                        from: table.name,
                        to: possibleTableName,
                        via: column.name,
                      });
                    }
                  }
                });
              }
            });
            
            // 添加表和关系信息
            schemaStructureExplanation += "表间关系:\n";
            relationships.forEach(rel => {
              const fromTableComment = tableInfo.get(rel.from)?.comment || '';
              const toTableComment = tableInfo.get(rel.to)?.comment || '';
              schemaStructureExplanation += `- ${rel.from}(表英文名，中文名:${fromTableComment}) 通过 ${rel.via} 关联到 ${rel.to}(表英文名，中文名:${toTableComment})\n`;
            });
          }
        } catch (e) {
          console.error("解析schema结构出错:", e);
        }
      }
      
      // 调用后端API生成SQL
      const api = getApi();
      const response = await api.post('/ai/generate-sql', {
        query,
        model,
        connectionType,
        database: selectedDatabase,
        schema: schemaInfo,
        schemaStructureExplanation // 添加结构说明
      });

      if (response.data && response.data.success) {
        const generatedSql = response.data.data;
        onGenerateSQL(generatedSql);
      } else {
        message.error('生成SQL失败: ' + (response.data?.message || '未知错误'));
        onGenerateSQL(`-- 生成SQL失败: ${response.data?.message || '未知错误'}`);
      }
    } catch (error: any) {
      console.error('生成SQL出错:', error);
      message.error('生成SQL出错: ' + (error.message || '未知错误'));
      onGenerateSQL(`-- 生成SQL失败: ${error.message || '未知错误'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理示例查询点击
  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  // 处理历史查询点击
  const handleHistoryClick = (historyQuery: string) => {
    if (onQuerySelect) {
      onQuerySelect(historyQuery);
    }
  };

  // 处理模型变更
  const handleModelChange = (value: 'openai' | 'deepseek') => {
    setModel(value);
    if (onModelChange) {
      onModelChange(value);
    }
  };

  // 键盘事件处理
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="ai-assistant-container">
      <div className="ai-assistant-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <RobotOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
          <h3 className="ai-assistant-title">AI 查询助手</h3>
        </div>
        
        <Button 
          type="default" 
          icon={<CloseOutlined />} 
          onClick={onClose}
          size="middle"
          style={{ 
            borderRadius: '50%', 
            height: '36px', 
            width: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fff'
          }}
        />
      </div>
      
      <div className="ai-assistant-content">
        <div style={{ flex: 1 }}>
          <TextArea
            className="ai-query-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="请用自然语言描述您需要的查询，比如：查询最近一周注册的用户数量"
            rows={10}
            disabled={isLoading || isGenerating}
            onKeyDown={handleKeyDown}
          />
          <div className="ai-hint">提示: 按 Ctrl+Enter 快速生成 SQL</div>
          
          <Button 
            type="primary" 
            block 
            onClick={handleGenerate}
            loading={isLoading || isGenerating}
            disabled={!query.trim()}
          >
            <SendOutlined /> 生成 SQL
          </Button>
        </div>
        
        <div className="ai-examples">
          <div className="ai-examples-title">
            <Space>
              <RobotOutlined style={{ fontSize: '16px', color: '#1890ff' }}/>
              <span>示例查询</span>
            </Space>
          </div>
          <div className="ai-examples-list">
            {EXAMPLE_QUERIES.map((example, index) => (
              <div 
                key={index} 
                className="ai-example-item"
                onClick={() => handleExampleClick(example.description)}
              >
                {example.description}
              </div>
            ))}
          </div>
        </div>
        
        {queryHistory.length > 0 && (
          <div className="ai-query-history">
            <div className="ai-history-title">
              <Space>
                <HistoryOutlined style={{ fontSize: '16px', color: '#1890ff' }}/>
                <span>最近查询</span>
              </Space>
            </div>
            <div className="ai-history-list">
              {queryHistory.slice(0, 5).map((item) => (
                <div 
                  key={item.id} 
                  className="ai-history-item"
                  onClick={() => handleHistoryClick(item.sql)}
                >
                  {item.sql.length > 50 ? item.sql.substring(0, 50) + '...' : item.sql}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {(isLoading || isGenerating) && (
        <div className="ai-loading-overlay">
          <Spin size="large" />
          <div className="ai-loading-text">
            {isGenerating ? 'AI正在智能生成SQL，请稍候...' : '正在加载数据库结构...'}
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssistant; 