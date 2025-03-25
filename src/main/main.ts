import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as url from 'url';
import { join } from 'path';

// 保持对window对象的全局引用，如果不这样做的话，当JavaScript对象被
// 垃圾回收的时候，window对象将会自动的关闭
let mainWindow: BrowserWindow | null = null;

const isDevelopment = process.env.NODE_ENV !== 'production';

// 模拟数据
const mockUsers = [
  { id: 1, username: 'admin', password: 'admin123', email: 'admin@example.com', role: 'admin' }
];

const mockConnections = [
  {
    id: 1,
    name: 'MySQL开发环境',
    type: 'mysql',
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'password',
    database: 'test_db',
    userId: 1
  },
  {
    id: 2,
    name: 'PostgreSQL测试',
    type: 'postgresql',
    host: '192.168.1.100',
    port: 5432,
    user: 'postgres',
    password: 'password',
    database: 'postgres',
    userId: 1
  }
];

const createWindow = () => {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    // 设置图标
    icon: join(__dirname, '../../public/icon.svg'),
  });

  // 加载应用
  if (isDevelopment) {
    // 开发环境下加载开发服务器地址
    mainWindow.loadURL('http://localhost:3000/');
    // 打开开发者工具
    mainWindow.webContents.openDevTools();
  } else {
    // 修正路径，确保能找到index.html
    const indexPath = path.join(__dirname, '../renderer/index.html');
    console.log('Loading from:', indexPath);
    
    if (mainWindow) {
      mainWindow.loadFile(indexPath).catch(err => {
        console.error('Failed to load index.html:', err);
        // 尝试备用路径
        const altPath = path.join(__dirname, '../renderer/index.html');
        console.log('Trying alternative path:', altPath);
        if (mainWindow) {
          mainWindow.loadFile(altPath).catch(e => {
            console.error('Also failed with alternative path:', e);
          });
        }
      });
    }
  }

  // 当window被关闭时，发出closed事件
  mainWindow.on('closed', () => {
    // 取消引用window对象，如果你的应用支持多窗口的话，
    // 通常会把多个window对象存放在一个数组里面，
    // 与此同时，你应该删除相应的元素。
    mainWindow = null;
  });
};

// 当Electron完成初始化并准备创建浏览器窗口时调用此方法
app.whenReady().then(() => {
  createWindow();

  // 设置IPC处理程序
  setupIpcHandlers();

  app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (mainWindow === null) {
      createWindow();
    }
  });
});

// 除了macOS外，当所有窗口都被关闭的时候退出程序
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 设置IPC处理程序
const setupIpcHandlers = () => {
  // 文件对话框
  ipcMain.handle('dialog:openFile', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({});
    if (!canceled) {
      return filePaths[0];
    }
    return undefined;
  });

  // 认证相关处理程序
  ipcMain.handle('auth:login', async (_, { username, password }) => {
    const user = mockUsers.find(
      u => u.username === username && u.password === password
    );

    if (user) {
      const { password, ...userWithoutPassword } = user;
      return {
        success: true,
        data: {
          ...userWithoutPassword,
          token: `mock-token-${Date.now()}`
        }
      };
    }

    return {
      success: false,
      message: '用户名或密码不正确'
    };
  });

  ipcMain.handle('auth:logout', async () => {
    return { success: true };
  });

  // 数据库连接相关处理程序
  ipcMain.handle('connection:getAll', async () => {
    return {
      success: true,
      data: mockConnections
    };
  });

  ipcMain.handle('connection:getById', async (_, id) => {
    const connection = mockConnections.find(c => c.id === id);
    if (connection) {
      return {
        success: true,
        data: connection
      };
    }
    return {
      success: false,
      message: '找不到连接'
    };
  });

  ipcMain.handle('connection:create', async (_, data) => {
    // 这里模拟创建连接
    return {
      success: true,
      data: {
        id: mockConnections.length + 1,
        ...data,
        createdAt: new Date().toISOString()
      }
    };
  });

  ipcMain.handle('connection:update', async (_, id, data) => {
    // 这里模拟更新连接
    return {
      success: true,
      data: {
        id,
        ...data,
        updatedAt: new Date().toISOString()
      }
    };
  });

  ipcMain.handle('connection:delete', async (_, id) => {
    // 这里模拟删除连接
    return {
      success: true,
      data: true
    };
  });

  ipcMain.handle('connection:test', async (_, data) => {
    // 这里模拟测试连接
    return {
      success: true,
      data: {
        success: true,
        message: '连接成功'
      }
    };
  });

  ipcMain.handle('connection:open', async (_, id) => {
    // 这里模拟打开连接
    return {
      success: true,
      data: {
        success: true,
        message: '连接已打开'
      }
    };
  });

  // 查询相关处理程序
  ipcMain.handle('query:execute', async (_, connectionId, sql) => {
    // 模拟执行查询
    console.log(`执行查询，连接ID: ${connectionId}, SQL: ${sql}`);
    
    // 模拟返回查询结果
    return {
      success: true,
      data: {
        success: true,
        message: '查询成功',
        duration: 0.015,
        affectedRows: 0,
        columns: [
          { title: 'ID', dataIndex: 'id', key: 'id' },
          { title: '姓名', dataIndex: 'name', key: 'name' },
          { title: '年龄', dataIndex: 'age', key: 'age' },
          { title: '邮箱', dataIndex: 'email', key: 'email' },
          { title: '创建时间', dataIndex: 'createdAt', key: 'createdAt' },
        ],
        data: Array(20).fill(0).map((_, i) => ({
          key: i,
          id: i + 1,
          name: `用户 ${i + 1}`,
          age: Math.floor(Math.random() * 50) + 18,
          email: `user${i + 1}@example.com`,
          createdAt: new Date().toISOString(),
        })),
      }
    };
  });
};

// 在这个文件中，你可以包含应用程序特定的主进程代码
// 也可以拆分成几个文件，然后用require导入。

// 以下是与渲染进程通信的示例
// 删除这段重复代码，因为setupIpcHandlers已经注册了这个处理程序 