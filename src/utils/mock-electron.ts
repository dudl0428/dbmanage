import { ConnectionResponse, ConnectionResult } from '../services/connectionService';

// 模拟数据
const mockConnections: ConnectionResponse[] = [
  {
    id: 1,
    name: '本地MySQL',
    host: 'localhost',
    port: 3306,
    username: 'root',
    password: '123456',
    type: 'mysql',
    database: 'test_db'
  },
  {
    id: 2,
    name: '开发PostgreSQL',
    host: '192.168.1.100',
    port: 5432,
    username: 'postgres',
    password: 'postgres',
    type: 'postgresql',
    database: 'dev_db'
  }
];

// 模拟数据库列表
const mockDatabases: Record<number, string[]> = {
  1: ['mysql', 'information_schema', 'test_db', 'performance_schema'],
  2: ['postgres', 'template1', 'dev_db']
};

// 模拟表列表
const mockTables: Record<string, string[]> = {
  'test_db': ['users', 'products', 'orders', 'categories'],
  'dev_db': ['customers', 'employees', 'projects']
};

// 模拟视图列表
const mockViews: Record<string, string[]> = {
  'test_db': ['active_users', 'order_summary'],
  'dev_db': ['employee_details', 'project_status']
};

// 模拟连接状态
const connectionStatus: Record<number, boolean> = {};

// 模拟的Electron API实现
export const mockElectronAPI = {
  // 连接相关API
  getConnections: async (): Promise<ConnectionResponse[]> => {
    return mockConnections;
  },

  createConnection: async (connection: Omit<ConnectionResponse, 'id'>): Promise<ConnectionResponse> => {
    const newConnection = {
      ...connection,
      id: Math.floor(Math.random() * 1000) + 10
    } as ConnectionResponse;
    mockConnections.push(newConnection);
    return newConnection;
  },

  updateConnection: async (id: number, connection: Partial<ConnectionResponse>): Promise<ConnectionResponse> => {
    const index = mockConnections.findIndex(conn => conn.id === id);
    if (index === -1) {
      throw new Error('Connection not found');
    }
    mockConnections[index] = { ...mockConnections[index], ...connection };
    return mockConnections[index];
  },

  deleteConnection: async (id: number): Promise<boolean> => {
    const index = mockConnections.findIndex(conn => conn.id === id);
    if (index === -1) {
      return false;
    }
    mockConnections.splice(index, 1);
    return true;
  },

  openConnection: async (id: number): Promise<ConnectionResult> => {
    // 模拟连接打开延迟
    await new Promise(resolve => setTimeout(resolve, 500));
    connectionStatus[id] = true;
    return { success: true };
  },

  closeConnection: async (id: number): Promise<boolean> => {
    // 模拟连接关闭延迟
    await new Promise(resolve => setTimeout(resolve, 300));
    connectionStatus[id] = false;
    return true;
  },

  // 数据库相关API
  getDatabases: async (connectionId: number): Promise<string[]> => {
    // 检查连接状态
    if (!connectionStatus[connectionId]) {
      throw new Error('Connection is not open');
    }
    return mockDatabases[connectionId] || [];
  },

  getTables: async (connectionId: number, database: string): Promise<string[]> => {
    // 检查连接状态
    if (!connectionStatus[connectionId]) {
      throw new Error('Connection is not open');
    }
    return mockTables[database] || [];
  },

  getViews: async (connectionId: number, database: string): Promise<string[]> => {
    // 检查连接状态
    if (!connectionStatus[connectionId]) {
      throw new Error('Connection is not open');
    }
    return mockViews[database] || [];
  },

  getTableSchema: async (connectionId: number, database: string, table: string): Promise<any[]> => {
    // 检查连接状态
    if (!connectionStatus[connectionId]) {
      throw new Error('Connection is not open');
    }
    // 返回模拟的表结构
    return [
      { name: 'id', type: 'int', nullable: false, primary: true },
      { name: 'name', type: 'varchar', nullable: false, primary: false },
      { name: 'created_at', type: 'timestamp', nullable: true, primary: false }
    ];
  },

  executeQuery: async (connectionId: number, database: string, sql: string): Promise<any> => {
    // 检查连接状态
    if (!connectionStatus[connectionId]) {
      throw new Error('Connection is not open');
    }
    
    // 模拟查询结果
    return {
      columns: ['id', 'name', 'created_at'],
      rows: [
        { id: 1, name: 'Item 1', created_at: '2023-01-01' },
        { id: 2, name: 'Item 2', created_at: '2023-01-02' },
        { id: 3, name: 'Item 3', created_at: '2023-01-03' }
      ],
      rowCount: 3,
      sql: sql
    };
  },

  // 窗口控制API
  minimize: () => {
    console.log('Window minimized');
  },

  maximize: () => {
    console.log('Window maximized/restored');
  },

  close: () => {
    console.log('Window closed');
  },

  isMaximized: async (): Promise<boolean> => {
    return false;
  },

  // 健康检查API
  healthCheck: async (): Promise<boolean> => {
    return true;
  }
};

// 初始化模拟的Electron API
export function initMockElectronAPI(): void {
  if (typeof window !== 'undefined' && !window.electronAPI) {
    window.electronAPI = mockElectronAPI;
  }
} 