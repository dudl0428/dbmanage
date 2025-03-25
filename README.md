# 数据库管理工具

这是一个类似于Navicat的数据库管理桌面应用程序。

## 功能特性

- 管理多种数据库连接（MySQL, PostgreSQL, SQLite等）
- 数据库对象浏览（表、视图等）
- SQL查询编辑和执行
- 查询结果可视化
- 数据导出

## 应用截图

应用包含以下主要界面:

- **登录界面**: 用户认证入口
- **主界面**: 数据库连接和表数据浏览
- **SQL查询界面**: 执行和分析SQL查询

## 技术栈

- Electron
- React
- TypeScript
- Ant Design
- Zustand (状态管理)

## 开发环境设置

### 系统要求

- Node.js (>= 14.x)
- npm (>= 6.x)

### 安装依赖

```bash
# 安装依赖
npm install
```

### 开发模式运行

```bash
# 运行开发模式
npm run dev
```
   npm run electron

### 构建应用

```bash
# 构建前端和主进程
npm run build

# 构建可执行文件
npm run package
```

## 项目结构

```
src/
├── components/     # 组件
├── layouts/        # 布局组件
├── main/           # Electron主进程
├── pages/          # 页面
├── services/       # 服务
├── store/          # 状态管理
├── utils/          # 工具函数
└── constants/      # 常量
```

## 使用说明

1. 登录界面使用默认账号密码：
   - 用户名: admin
   - 密码: admin123

2. 在主界面左侧可以浏览和管理数据库连接
3. 点击连接可以展开数据库列表
4. 点击数据库可以展开表和视图列表
5. 点击表可以在右侧查看表数据
6. 切换到查询标签页可以执行SQL查询

## 故障排除

### 常见问题

1. **应用无法启动**
   - 确保安装了所有依赖：`npm install`
   - 检查Node.js版本是否兼容
npm run electron
2. **无法加载渲染进程**
   - 运行 `npm run build` 确保渲染进程已经构建
   - 检查 `dist/renderer` 目录是否存在并包含HTML文件

3. **无法连接到数据库**
   - 确认数据库服务器是否正在运行
   - 检查防火墙设置
   - 验证连接信息（主机、端口、用户名、密码）是否正确

4. **开发过程中的问题**
   - 如遇到热重载失效问题，尝试重启开发服务器
   - 检查终端是否有错误日志
   - 在开发模式下打开DevTools调试：`Ctrl+Shift+I` (Windows/Linux) 或 `Cmd+Opt+I` (macOS)

## 许可协议

MIT 