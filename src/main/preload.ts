import { contextBridge, ipcRenderer } from 'electron';

// 确保预加载脚本载入成功的日志
console.log('Preload script loaded successfully!');

// 暴露给渲染进程的API
contextBridge.exposeInMainWorld('electronAPI', {
  // 认证相关API
  auth: {
    login: (username: string, password: string) => ipcRenderer.invoke('auth:login', { username, password }),
    logout: () => ipcRenderer.invoke('auth:logout'),
  },
  
  // 数据库连接相关API
  connection: {
    create: (data: any) => ipcRenderer.invoke('connection:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('connection:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('connection:delete', id),
    getAll: () => ipcRenderer.invoke('connection:getAll'),
    getById: (id: number) => ipcRenderer.invoke('connection:getById', id),
    test: (data: any) => ipcRenderer.invoke('connection:test', data),
    open: (id: number) => ipcRenderer.invoke('connection:open', id),
  },
  
  // 数据库查询相关API
  query: {
    execute: (connectionId: number, sql: string) => ipcRenderer.invoke('query:execute', connectionId, sql),
    getStructure: (connectionId: number) => ipcRenderer.invoke('query:getStructure', connectionId),
    getTables: (connectionId: number, database: string, schema?: string) => 
      ipcRenderer.invoke('query:getTables', connectionId, database, schema),
    getViews: (connectionId: number, database: string, schema?: string) => 
      ipcRenderer.invoke('query:getViews', connectionId, database, schema),
    getTableStructure: (connectionId: number, tableName: string) => 
      ipcRenderer.invoke('query:getTableStructure', connectionId, tableName),
  },
  
  // 文件操作相关API
  dialog: {
    openFile: () => ipcRenderer.invoke('dialog:openFile'),
  }
}); 