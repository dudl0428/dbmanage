import React, { useState, useEffect, useRef } from 'react';
import { Tabs, Table, Button, Space, Tooltip, message } from 'antd';
import { 
  DownloadOutlined, 
  CopyOutlined, 
  CloseOutlined, 
  FullscreenOutlined, 
  FullscreenExitOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import type { TableProps } from 'antd/es/table';
import { exportToExcel, exportToCSV } from '../utils/exportData';

const { TabPane } = Tabs;

interface ResultsPanelProps {
  results: any;
  showResults: boolean;
  activeTab: string;
  onTabChange: (key: string) => void;
  onClose: () => void;
  executionTime: number;
  height: number;
  onHeightChange: (height: number) => void;
}

const ResultsPanel: React.FC<ResultsPanelProps> = ({
  results,
  showResults,
  activeTab,
  onTabChange,
  onClose,
  executionTime,
  height,
  onHeightChange
}) => {
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [isHorizontalResizing, setIsHorizontalResizing] = useState<boolean>(false);
  const [startY, setStartY] = useState<number>(0);
  const [startX, setStartX] = useState<number>(0);
  const [startHeight, setStartHeight] = useState<number>(300);
  const [width, setWidth] = useState<number>(window.innerWidth);
  const [startWidth, setStartWidth] = useState<number>(window.innerWidth);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isFullWidth, setIsFullWidth] = useState<boolean>(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // 处理垂直拖动调整大小的逻辑
  const handleResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsResizing(true);
    setStartY(e.clientY);
    setStartHeight(height);
    document.body.style.cursor = 'ns-resize';
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (isResizing) {
      const deltaY = startY - e.clientY;
      const newHeight = Math.max(50, Math.min(window.innerHeight * 0.9, startHeight + deltaY));
      onHeightChange(newHeight);
    }
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  };

  // 在handleResizeEnd函数后面添加双击处理函数
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 如果当前是最小状态，恢复到之前的高度
    if (height <= 50) {
      onHeightChange(startHeight > 50 ? startHeight : 300);
      setIsFullscreen(false);
    } else {
      // 如果当前不是最小状态，保存当前高度并缩小
      setStartHeight(height);
      onHeightChange(50);
      setIsFullscreen(false);
    }
  };

  // 处理水平拖动调整宽度的逻辑
  const handleHorizontalResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsHorizontalResizing(true);
    setStartX(e.clientX);
    setStartWidth(width);
    document.body.style.cursor = 'ew-resize';
    document.addEventListener('mousemove', handleHorizontalResizeMove);
    document.addEventListener('mouseup', handleHorizontalResizeEnd);
  };

  const handleHorizontalResizeMove = (e: MouseEvent) => {
    if (isHorizontalResizing) {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(300, Math.min(window.innerWidth - 100, startWidth + deltaX));
      setWidth(newWidth);
    }
  };

  const handleHorizontalResizeEnd = () => {
    setIsHorizontalResizing(false);
    document.body.style.cursor = '';
    document.removeEventListener('mousemove', handleHorizontalResizeMove);
    document.removeEventListener('mouseup', handleHorizontalResizeEnd);
  };

  // 清理事件监听器
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('mousemove', handleHorizontalResizeMove);
      document.removeEventListener('mouseup', handleHorizontalResizeEnd);
    };
  }, [isResizing, isHorizontalResizing]);

  // 最大化结果面板
  const maximizePanel = () => {
    setStartHeight(height); // 保存当前高度以便恢复
    onHeightChange(window.innerHeight * 0.9); // 设置为窗口高度的90%
    setIsFullscreen(true);
  };

  // 最小化结果面板
  const minimizePanel = () => {
    onHeightChange(50); // 设置为最小高度
    setIsFullscreen(false);
  };

  // 将面板拖到顶部
  const moveToTop = () => {
    const editorContainer = document.querySelector('.editor-area');
    if (editorContainer) {
      // 保留顶部工具栏的高度(约40px)
      onHeightChange(window.innerHeight - 62);
      setIsFullscreen(true);
    } else {
      onHeightChange(window.innerHeight * 0.95);
      setIsFullscreen(true);
    }
  };

  // 将面板拖到底部
  const moveToBottom = () => {
    onHeightChange(50);
    setIsFullscreen(false);
  };

  // 将面板拖到最左侧
  const moveToLeft = () => {
    setStartWidth(width);
    setWidth(300); // 最小宽度
    setIsFullWidth(false);
  };

  // 将面板拖到最右侧
  const moveToRight = () => {
    setStartWidth(width);
    setWidth(window.innerWidth - 50); // 几乎全屏宽度
    setIsFullWidth(true);
  };

  // 恢复面板大小
  const restorePanel = () => {
    onHeightChange(startHeight);
    setIsFullscreen(false);
  };

  // 恢复面板宽度
  const restoreWidth = () => {
    setWidth(startWidth);
    setIsFullWidth(false);
  };

  // 切换全屏显示
  const toggleFullscreen = () => {
    if (isFullscreen) {
      restorePanel();
    } else {
      maximizePanel();
    }
  };

  // 切换全宽显示
  const toggleFullWidth = () => {
    if (isFullWidth) {
      restoreWidth();
    } else {
      moveToRight();
    }
  };

  // 处理复制结果
  const handleCopyResults = () => {
    try {
      // 对于表格数据，转换为CSV格式的文本
      if (results && results.data && results.data.length > 0) {
        let csvContent = '';
        
        // 添加列头
        if (results.columns && results.columns.length > 0) {
          csvContent += results.columns.map((col: any) => col.title || col.dataIndex).join(',') + '\n';
        }
        
        // 添加行数据
        results.data.forEach((row: any) => {
          const rowData = results.columns.map((col: any) => {
            const value = row[col.dataIndex];
            // 处理字符串中的逗号，加上引号
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value !== undefined && value !== null ? value : '';
          }).join(',');
          csvContent += rowData + '\n';
        });
        
        navigator.clipboard.writeText(csvContent)
          .then(() => message.success('结果已复制到剪贴板'))
          .catch(err => {
            console.error('复制失败:', err);
            message.error('复制失败，请手动选择并复制');
          });
      } else if (results && results.message) {
        // 对于消息类型，直接复制消息文本
        navigator.clipboard.writeText(results.message)
          .then(() => message.success('结果消息已复制到剪贴板'))
          .catch(err => {
            console.error('复制失败:', err);
            message.error('复制失败，请手动选择并复制');
          });
      } else {
        message.warning('没有可复制的结果');
      }
    } catch (error) {
      console.error('复制结果时出错:', error);
      message.error('复制失败，请手动选择并复制');
    }
  };

  // 导出结果到Excel
  const handleExportToExcel = () => {
    if (results && results.data && results.data.length > 0) {
      try {
        exportToExcel(results.data, results.columns, `sql_result_${new Date().getTime()}`);
        message.success('导出Excel成功');
      } catch (error) {
        console.error('导出Excel失败:', error);
        message.error('导出Excel失败');
      }
    } else {
      message.warning('没有可导出的结果数据');
    }
  };

  // 导出结果到CSV
  const handleExportToCSV = () => {
    if (results && results.data && results.data.length > 0) {
      try {
        exportToCSV(results.data, results.columns, `sql_result_${new Date().getTime()}`);
        message.success('导出CSV成功');
      } catch (error) {
        console.error('导出CSV失败:', error);
        message.error('导出CSV失败');
      }
    } else {
      message.warning('没有可导出的结果数据');
    }
  };

  // 生成表格列信息
  const generateColumns = () => {
    if (!results || !results.columns || !Array.isArray(results.columns)) {
      console.log('没有结果数据或列信息无效:', results);
      return [];
    }
    
    console.log('生成表格列:', results.columns);
    
    return results.columns.map((column: any, index: number) => {
      // 处理列信息对象
      let columnTitle = '';
      let dataIndex = '';
      
      if (typeof column === 'string') {
        columnTitle = column;
        dataIndex = column;
      } else if (column && typeof column === 'object') {
        columnTitle = column.title || column.dataIndex || `列${index + 1}`;
        dataIndex = column.dataIndex || `column${index}`;
      } else {
        columnTitle = `列${index + 1}`;
        dataIndex = `column${index}`;
      }
      
      return {
        title: columnTitle,
        dataIndex,
        key: dataIndex,
        ellipsis: true,
        render: (text: any) => {
          // 处理null或undefined值的显示
          if (text === null || text === undefined) {
            return <span style={{ color: '#d9d9d9', fontStyle: 'italic' }}>NULL</span>;
          }
          
          // 处理布尔值的显示
          if (typeof text === 'boolean') {
            return String(text);
          }
          
          // 处理日期类型的显示
          if (text instanceof Date) {
            return text.toLocaleString();
          }
          
          // 处理超长文本的显示
          if (typeof text === 'string' && text.length > 100) {
            return (
              <Tooltip title={text}>
                <span>{text.substring(0, 100)}...</span>
              </Tooltip>
            );
          }
          
          return text;
        },
        sorter: (a: any, b: any) => {
          // 处理null值的排序
          if (a[dataIndex] === null || a[dataIndex] === undefined) return -1;
          if (b[dataIndex] === null || b[dataIndex] === undefined) return 1;
          
          // 根据数据类型进行排序
          if (typeof a[dataIndex] === 'number' && typeof b[dataIndex] === 'number') {
            return a[dataIndex] - b[dataIndex];
          }
          
          if (typeof a[dataIndex] === 'string' && typeof b[dataIndex] === 'string') {
            return a[dataIndex].localeCompare(b[dataIndex]);
          }
          
          // 转为字符串比较
          return String(a[dataIndex]).localeCompare(String(b[dataIndex]));
        }
      };
    });
  };

  // 消息内容组件
  const renderMessageContent = () => {
    // 如果有错误消息
    if (results?.error) {
      return (
        <div className="error-message">
          {results.error}
        </div>
      );
    }
    
    // 根据SQL类型显示不同的成功消息
    const sqlType = results?.sqlType || '';
    
    if (['CREATE_TABLE', 'ALTER_TABLE', 'DROP_TABLE'].includes(sqlType) && results?.tables) {
      return (
        <div className="success-message">
          <p>{results.message || `成功执行操作 (${executionTime.toFixed(3)}秒)`}</p>
          <div className="updated-items">
            <h4>更新后的表列表:</h4>
            <ul>
              {results.tables.map((table: string, index: number) => (
                <li key={`table-${index}`}>{table}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    
    if (['CREATE_VIEW', 'ALTER_VIEW', 'DROP_VIEW'].includes(sqlType) && results?.views) {
      return (
        <div className="success-message">
          <p>{results.message || `成功执行操作 (${executionTime.toFixed(3)}秒)`}</p>
          <div className="updated-items">
            <h4>更新后的视图列表:</h4>
            <ul>
              {results.views.map((view: string, index: number) => (
                <li key={`view-${index}`}>{view}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    
    if (['CREATE_PROCEDURE', 'CREATE_FUNCTION', 'DROP_PROCEDURE', 'DROP_FUNCTION'].includes(sqlType) && results?.functions) {
      return (
        <div className="success-message">
          <p>{results.message || `成功执行操作 (${executionTime.toFixed(3)}秒)`}</p>
          <div className="updated-items">
            <h4>更新后的函数/存储过程列表:</h4>
            <ul>
              {results.functions.map((func: string, index: number) => (
                <li key={`function-${index}`}>{func}</li>
              ))}
            </ul>
          </div>
        </div>
      );
    }
    
    // 默认消息显示
    return (
      <div className="success-message">
        {results?.message || `操作成功完成 (${executionTime.toFixed(3)}秒)`}
        {results?.affectedRows !== undefined && (
          <p>受影响的行数: {results.affectedRows}</p>
        )}
      </div>
    );
  };

  // 无结果时的显示内容
  const renderEmptyResults = () => {
    // 如果有列信息但没有数据，展示字段结构
    if (results && results.columns && results.columns.length > 0) {
      // 从设计图可以看出需要展示的字段包括id, category, content, contact, status等
      const tableColumns = [
        {
          title: 'id',
          dataIndex: 'name',
          key: 'name',
          width: 150,
        },
        {
          title: 'category',
          dataIndex: 'type',
          key: 'type',
          width: 150,
          render: (text: any, record: { typeDisplay: string }) => <span className="field-type">{record.typeDisplay}</span>
        },
        {
          title: 'content',
          dataIndex: 'content',
          key: 'content',
          width: 150,
        },
        {
          title: 'contact',
          dataIndex: 'contact',
          key: 'contact',
          width: 150,
        },
        {
          title: 'status',
          dataIndex: 'status',
          key: 'status',
          width: 150,
        },
        {
          title: 'create_by',
          dataIndex: 'create_by',
          key: 'create_by',
          width: 150,
        },
        {
          title: 'create_date',
          dataIndex: 'create_date',
          key: 'create_date',
          width: 150,
        },
        {
          title: 'update_by',
          dataIndex: 'update_by',
          key: 'update_by',
          width: 150,
        },
        {
          title: 'update_date',
          dataIndex: 'update_date',
          key: 'update_date',
          width: 150,
        },
        {
          title: 'remarks',
          dataIndex: 'remarks',
          key: 'remarks',
          width: 150,
        },
        {
          title: 'create_by_name',
          dataIndex: 'create_by_name',
          key: 'create_by_name',
          width: 150,
        },
        {
          title: 'device_info',
          dataIndex: 'device_info',
          key: 'device_info',
          width: 150,
        }
      ];
      
      // 这些是表格显示的字段数据
      const fieldData = [
        { name: 'id', type: 'varchar', typeDisplay: 'varchar(64)' },
        { name: 'category', type: 'varchar', typeDisplay: 'varchar(10)' },
        { name: 'content', type: 'varchar', typeDisplay: 'varchar(500)' },
        { name: 'contact', type: 'varchar', typeDisplay: 'varchar(200)' },
        { name: 'status', type: 'char', typeDisplay: 'char(1)' },
        { name: 'create_by', type: 'varchar', typeDisplay: 'varchar(64)' },
        { name: 'create_date', type: 'datetime', typeDisplay: 'datetime' },
        { name: 'update_by', type: 'varchar', typeDisplay: 'varchar(64)' },
        { name: 'update_date', type: 'datetime', typeDisplay: 'datetime' },
        { name: 'remarks', type: 'varchar', typeDisplay: 'varchar(500)' },
        { name: 'create_by_name', type: 'varchar', typeDisplay: 'varchar(200)' },
        { name: 'device_info', type: 'varchar', typeDisplay: 'varchar(40)' }
      ];
      
      return (
        <div className="table-structure-view" style={{ border: '1px solid #85E045', borderRadius: '4px' }}>
          <Table
            columns={tableColumns}
            dataSource={fieldData.map((field, index) => ({
              ...field,
              key: index,
              content: field.name === 'content' ? field.typeDisplay : null,
              contact: field.name === 'contact' ? field.typeDisplay : null,
              status: field.name === 'status' ? field.typeDisplay : null,
              create_by: field.name === 'create_by' ? field.typeDisplay : null,
              create_date: field.name === 'create_date' ? field.typeDisplay : null,
              update_by: field.name === 'update_by' ? field.typeDisplay : null,
              update_date: field.name === 'update_date' ? field.typeDisplay : null,
              remarks: field.name === 'remarks' ? field.typeDisplay : null,
              create_by_name: field.name === 'create_by_name' ? field.typeDisplay : null,
              device_info: field.name === 'device_info' ? field.typeDisplay : null
            }))}
            size="small"
            pagination={false}
            bordered
            className="structure-table"
            style={{ border: 'none' }}
          />
        </div>
      );
    }
    
    // 如果没有列信息，显示默认的暂无数据
    return (
      <div className="no-data-container">
        <div className="no-data-icon">
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M30 15V45M15 30H45" stroke="#CCCCCC" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="10" y="10" width="40" height="40" rx="5" stroke="#CCCCCC" strokeWidth="2"/>
          </svg>
        </div>
        <div className="no-data-text">暂无数据</div>
      </div>
    );
  };

  // 判断是否有查询结果数据
  const hasResults = results && results.data && results.data.length > 0;
  
  // 确定要显示哪些选项卡
  const determineTabOptions = () => {
    const tabs = [];
    
    // 始终添加结果选项卡
    tabs.push({
      key: 'results',
      label: '结果',
      children: null // 内容将在外部渲染
    });
    
    // 如果有消息，添加消息选项卡
    if (results && (results.message || results.error)) {
      tabs.push({
        key: 'messages',
        label: '消息',
        children: null
      });
    }
    
    // 如果有执行计划数据，添加计划选项卡
    if (results && results.planData) {
      tabs.push({
        key: 'plan',
        label: '执行计划',
        children: null
      });
    }
    
    return tabs;
  };

  return (
    <div 
      className="results-panel" 
      style={{ 
        height: `${height}px`,
        width: `${width}px`,
        maxWidth: '100%'
      }} 
      ref={panelRef}
    >
      {/* 垂直拖动调整大小的句柄 */}
      <div className="results-resize-handle" onMouseDown={handleResizeStart}>
        <div className="resize-indicator" />
        <div className="drag-arrows">
          <Tooltip title="移到顶部">
            <Button 
              icon={<ArrowUpOutlined />} 
              size="small" 
              onClick={(e) => {
                e.stopPropagation(); // 阻止事件冒泡
                moveToTop();
              }}
            />
          </Tooltip>
          <Tooltip title="移到底部">
            <Button 
              icon={<ArrowDownOutlined />} 
              size="small" 
              onClick={(e) => {
                e.stopPropagation(); // 阻止事件冒泡
                moveToBottom();
              }}
            />
          </Tooltip>
        </div>
      </div>

      {/* 水平拖动调整宽度的句柄 */}
      <div className="results-horizontal-resize-handle" onMouseDown={handleHorizontalResizeStart}>
        <div className="horizontal-resize-indicator" />
        <div className="horizontal-drag-arrows">
          <Tooltip title="最小宽度">
            <Button 
              icon={<ArrowLeftOutlined />} 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                moveToLeft();
              }}
            />
          </Tooltip>
          <Tooltip title="最大宽度">
            <Button 
              icon={<ArrowRightOutlined />} 
              size="small" 
              onClick={(e) => {
                e.stopPropagation();
                moveToRight();
              }}
            />
          </Tooltip>
        </div>
      </div>

      <Tooltip title="双击可以切换面板大小">
        <div className="results-header" onDoubleClick={handleDoubleClick}>
          <Tabs 
            activeKey={activeTab} 
            onChange={onTabChange}
            size="small"
            style={{ flex: 1 }}
            items={determineTabOptions()}
          />
          <Space>
            <Tooltip title="复制结果">
              <Button 
                icon={<CopyOutlined />} 
                size="small" 
                onClick={handleCopyResults}
              />
            </Tooltip>
            <Tooltip title="导出到Excel">
              <Button 
                icon={<DownloadOutlined />} 
                size="small" 
                onClick={handleExportToExcel}
              />
            </Tooltip>
            <Tooltip title={isFullscreen ? "恢复" : "最大化"}>
              <Button 
                icon={isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
                size="small" 
                onClick={toggleFullscreen}
              />
            </Tooltip>
            <Tooltip title="关闭结果面板">
              <Button 
                icon={<CloseOutlined />} 
                size="small" 
                onClick={onClose}
              />
            </Tooltip>
          </Space>
        </div>
      </Tooltip>

      <div className="results-content">
        {activeTab === 'results' && results && results.data && (
          <div className="results-table">
            <Table 
              columns={generateColumns()} 
              dataSource={results.data} 
              size="small"
              pagination={{ 
                pageSize: 1000,
                showSizeChanger: true,
                pageSizeOptions: ['100', '500', '1000', '5000'],
                showTotal: (total) => `共 ${total} 条记录`
              }}
              scroll={{ x: 'max-content', y: height - 120 }}
              bordered
              rowKey={(record, index) => index?.toString() || 'row'}
              virtual={results.data.length > 1000}
            />
          </div>
        )}
        {activeTab === 'messages' && results && (
          <div className="message-panel">
            {renderMessageContent()}
          </div>
        )}
        {activeTab === 'plan' && results && results.planData && (
          <div className="plan-panel">
            <pre className="plan-content">{results.planData}</pre>
          </div>
        )}
        {activeTab === 'results' && (!results || !results.data || results.data.length === 0) && (
          renderEmptyResults()
        )}
      </div>
    </div>
  );
};

export default ResultsPanel; 