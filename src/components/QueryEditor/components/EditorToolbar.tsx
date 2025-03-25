import React from 'react';
import { Button, Tooltip, Space, Dropdown, Menu, Typography, Select } from 'antd';
import {
  PlayCircleOutlined,
  FormatPainterOutlined,
  RobotOutlined,
  SaveOutlined,
  HistoryOutlined,
  DownloadOutlined,
  ClearOutlined,
  SettingOutlined,
  CaretDownOutlined,
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

interface EditorToolbarProps {
  onExecute: () => void;
  onFormat: () => void;
  onAiFormat: () => void;
  onToggleAi: () => void;
  showAiAssistant: boolean;
  onSave?: () => void;
  onExport?: () => void;
  onClear: () => void;
  onSettings?: () => void;
  isExecuting: boolean;
  sqlDialect?: string;
  onDialectChange?: (dialect: string) => void;
  aiModel?: 'openai' | 'deepseek';
  onAiModelChange?: (model: 'openai' | 'deepseek') => void;
  onNaturalLanguageConvert?: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onExecute,
  onFormat,
  onAiFormat,
  onToggleAi,
  showAiAssistant,
  onSave,
  onExport,
  onClear,
  onSettings,
  isExecuting,
  sqlDialect = 'mysql',
  onDialectChange,
  aiModel = 'openai',
  onAiModelChange,
  onNaturalLanguageConvert,
}) => {
  // SQL方言选项
  const dialectOptions = [
    { label: 'MySQL', value: 'mysql' },
    { label: 'PostgreSQL', value: 'postgresql' },
    { label: 'SQL Server', value: 'tsql' },
    { label: 'Oracle', value: 'plsql' },
    { label: 'SQLite', value: 'sqlite' },
  ];

  // 方言菜单
  const dialectMenu = {
    items: dialectOptions.map(option => ({
      key: option.value,
      label: option.label,
      onClick: () => onDialectChange?.(option.value)
    })),
  };

  // 将方言显示名称映射为用户友好的名称
  const getDialectDisplayName = () => {
    const option = dialectOptions.find(opt => opt.value === sqlDialect);
    return option ? option.label : 'MySQL';
  };

  return (
    <>
      {/* 执行按钮 */}
      <Tooltip title="执行 (Ctrl+Enter)">
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          onClick={onExecute}
          loading={isExecuting}
          size="small"
        >
          执行
        </Button>
      </Tooltip>

      {/* 格式化按钮 */}
      <Tooltip title="格式化 SQL (Ctrl+Shift+F)">
        <Button 
          icon={<FormatPainterOutlined />} 
          onClick={onFormat}
          size="small"
        >
          格式化
        </Button>
      </Tooltip>

      {/* 自然语言转SQL按钮 */}
      {onNaturalLanguageConvert && (
        <Tooltip title="自然语言转SQL (Alt+Q)">
          <Button 
            icon={<RobotOutlined />} 
            onClick={onNaturalLanguageConvert}
            size="small"
          >
            自然语言转SQL
          </Button>
        </Tooltip>
      )}

      {/* AI 助手按钮 */}
      {/* <Tooltip title="AI 助手 (Ctrl+Space)">
        <Button 
          icon={<RobotOutlined />} 
          onClick={onToggleAi}
          type={showAiAssistant ? "primary" : "default"}
          size="small"
        >
          AI 助手
        </Button>
      </Tooltip> */}

      {/* AI 模型选择 */}
      <Select 
        value={aiModel} 
        onChange={onAiModelChange}
        style={{ width: 100 }}
        size="small"
      >
        <Option value="openai">OpenAI</Option>
        <Option value="deepseek">DeepSeek</Option>
      </Select>

      {/* SQL方言选择器 */}
      {/* <Dropdown menu={dialectMenu} trigger={['click']}>
        <Button size="small">
          <Space>
            {getDialectDisplayName()}
            <CaretDownOutlined />
          </Space>
        </Button>
      </Dropdown> */}

      {/* 右侧可选按钮 */}
      {(onSave !== undefined || onExport !== undefined || onSettings !== undefined) && (
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {/* 保存 */}
          {onSave !== undefined && (
            <Tooltip title="保存 (Ctrl+S)">
              <Button icon={<SaveOutlined />} onClick={onSave} size="small" />
            </Tooltip>
          )}

          {/* 导出 */}
          {onExport !== undefined && (
            <Tooltip title="导出结果">
              <Button icon={<DownloadOutlined />} onClick={onExport} size="small" />
            </Tooltip>
          )}

          {/* 清除 */}
          <Tooltip title="清除编辑器内容">
            <Button icon={<ClearOutlined />} onClick={onClear} size="small" />
          </Tooltip>

          {/* 设置 */}
          {onSettings !== undefined && (
            <Tooltip title="编辑器设置">
              <Button icon={<SettingOutlined />} onClick={onSettings} size="small" />
            </Tooltip>
          )}
        </div>
      )}
    </>
  );
};

export default EditorToolbar; 