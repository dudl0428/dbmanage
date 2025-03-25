/**
 * 全局连接管理器
 * 负责存储和管理当前活动的数据库连接信息
 */

// 本地存储键名
const ACTIVE_CONNECTION_KEY = 'active_connection_id';
const ACTIVE_DATABASE_KEY = 'active_database';
const CONNECTION_INFO_KEY = 'connection_info';

/**
 * 连接信息接口
 */
interface ConnectionInfo {
  id: string | number;
  name?: string;
  type?: string;
  host?: string;
  port?: number;
  username?: string;
  database?: string;
  [key: string]: any;
}

/**
 * 设置当前活动的连接ID
 * @param connectionId 连接ID
 */
export const setActiveConnectionId = (connectionId: string | number): void => {
  if (!connectionId) return;
  localStorage.setItem(ACTIVE_CONNECTION_KEY, connectionId.toString());
  console.log('已设置活动连接ID:', connectionId);
};

/**
 * 获取当前活动的连接ID
 * @returns 当前活动的连接ID
 */
export const getActiveConnectionId = (): string => {
  return localStorage.getItem(ACTIVE_CONNECTION_KEY) || '';
};

/**
 * 设置当前活动的数据库
 * @param database 数据库名称
 */
export const setActiveDatabase = (database: string): void => {
  if (!database) return;
  localStorage.setItem(ACTIVE_DATABASE_KEY, database);
  console.log('已设置活动数据库:', database);
};

/**
 * 获取当前活动的数据库
 * @returns 当前活动的数据库名称
 */
export const getActiveDatabase = (): string => {
  return localStorage.getItem(ACTIVE_DATABASE_KEY) || '';
};

/**
 * 存储连接信息
 * @param connection 连接信息对象
 */
export const saveConnectionInfo = (connection: ConnectionInfo): void => {
  if (!connection || !connection.id) return;
  
  try {
    // 获取现有的连接信息
    const existingInfoStr = localStorage.getItem(CONNECTION_INFO_KEY) || '{}';
    const existingInfo = JSON.parse(existingInfoStr);
    
    // 更新指定连接的信息
    existingInfo[connection.id] = connection;
    
    // 保存更新后的信息
    localStorage.setItem(CONNECTION_INFO_KEY, JSON.stringify(existingInfo));
    
    console.log('已保存连接信息:', connection.id);
  } catch (err) {
    console.error('保存连接信息失败:', err);
  }
};

/**
 * 获取指定连接的信息
 * @param connectionId 连接ID
 * @returns 连接信息对象，如果未找到则返回null
 */
export const getConnectionInfo = (connectionId: string | number): ConnectionInfo | null => {
  if (!connectionId) return null;
  
  try {
    const existingInfoStr = localStorage.getItem(CONNECTION_INFO_KEY) || '{}';
    const existingInfo = JSON.parse(existingInfoStr);
    
    return existingInfo[connectionId] || null;
  } catch (err) {
    console.error('获取连接信息失败:', err);
    return null;
  }
};

/**
 * 获取当前活动连接的信息
 * @returns 当前活动连接的信息对象，如果未找到则返回null
 */
export const getActiveConnectionInfo = (): ConnectionInfo | null => {
  const activeId = getActiveConnectionId();
  return activeId ? getConnectionInfo(activeId) : null;
};

/**
 * 清除连接信息
 * @param connectionId 可选，指定要清除的连接ID，不指定则清除所有连接信息
 */
export const clearConnectionInfo = (connectionId?: string | number): void => {
  if (connectionId) {
    try {
      const existingInfoStr = localStorage.getItem(CONNECTION_INFO_KEY) || '{}';
      const existingInfo = JSON.parse(existingInfoStr);
      
      if (existingInfo[connectionId]) {
        delete existingInfo[connectionId];
        localStorage.setItem(CONNECTION_INFO_KEY, JSON.stringify(existingInfo));
        console.log('已清除连接信息:', connectionId);
      }
    } catch (err) {
      console.error('清除连接信息失败:', err);
    }
  } else {
    localStorage.removeItem(CONNECTION_INFO_KEY);
    localStorage.removeItem(ACTIVE_CONNECTION_KEY);
    localStorage.removeItem(ACTIVE_DATABASE_KEY);
    console.log('已清除所有连接信息');
  }
};

export default {
  setActiveConnectionId,
  getActiveConnectionId,
  setActiveDatabase,
  getActiveDatabase,
  saveConnectionInfo,
  getConnectionInfo,
  getActiveConnectionInfo,
  clearConnectionInfo
}; 