import { ConnectionResponse, ConnectionResult } from '../services/connectionService';

// 声明全局window对象的ElectronAPI接口
export interface ElectronAPI {
  // 连接相关的API
  getConnections: () => Promise<ConnectionResponse[]>;
  createConnection: (connection: Omit<ConnectionResponse, 'id'>) => Promise<ConnectionResponse>;
  updateConnection: (id: number, connection: Partial<ConnectionResponse>) => Promise<ConnectionResponse>;
  deleteConnection: (id: number) => Promise<boolean>;
  openConnection: (id: number) => Promise<ConnectionResult>;
  closeConnection: (id: number) => Promise<boolean>;
  
  // 数据库相关的API
  getDatabases: (connectionId: number) => Promise<string[]>;
  getTables: (connectionId: number, database: string) => Promise<string[]>;
  getViews: (connectionId: number, database: string) => Promise<string[]>;
  getTableSchema: (connectionId: number, database: string, table: string) => Promise<any[]>;
  executeQuery: (connectionId: number, database: string, sql: string) => Promise<any>;
  
  // 其他Electron通信API
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isMaximized: () => Promise<boolean>;
  
  // 健康检查API
  healthCheck: () => Promise<boolean>;
}

// 全局window对象类型声明
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

// 声明isElectron函数类型
export function isElectron(): boolean; 