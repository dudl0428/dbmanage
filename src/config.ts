/**
 * API基础URL配置
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

/**
 * 默认分页大小
 */
export const DEFAULT_PAGE_SIZE = 20;

/**
 * 编辑器默认配置
 */
export const EDITOR_CONFIG = {
  fontSize: 14,
  lineHeight: 1.5,
  minimap: {
    enabled: true
  },
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on' as const
};

/**
 * AI模型配置
 */
export const AI_MODELS = [
  { value: 'openai', label: 'OpenAI GPT-3.5' },
  { value: 'deepseek', label: 'DeepSeek Coder' }
];

/**
 * 默认连接超时时间（毫秒）
 */
export const DEFAULT_TIMEOUT = 30000;

/**
 * 本地存储键名
 */
export const STORAGE_KEYS = {
  RECENT_CONNECTIONS: 'recent_connections',
  QUERY_HISTORY: 'query_history',
  EDITOR_SETTINGS: 'editor_settings',
  THEME: 'theme'
}; 