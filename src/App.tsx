import { useState, useEffect } from 'react';
import { ConfigProvider, Spin, message } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import LoginPage from './pages/Login';
import MainLayout from './layouts/MainLayout';
import { useAuthStore } from './store/authStore';
import ApiService from './services/api';
import './App.css';

const App = () => {
  const { token, checkToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [apiAvailable, setApiAvailable] = useState(false);

  useEffect(() => {
    const initApp = async () => {
      console.log('初始化应用...');
      // 检查后端API是否可用
      try {
        const isHealthy = await ApiService.checkHealth();
        if (isHealthy) {
          console.log('后端API连接成功');
          setApiAvailable(true);
        } else {
          console.warn('后端API不可用，将使用本地IPC通信');
          message.warning('后端服务不可用，部分功能可能受限');
        }
      } catch (error) {
        console.warn('后端API健康检查失败:', error);
        message.warning('后端服务不可用，部分功能可能受限');
      }

      // 检查用户认证状态
      console.log('检查认证状态...');
      const tokenValid = await checkToken();
      console.log('Token有效?', tokenValid);
      setLoading(false);
    };
    
    initApp();
  }, [checkToken]);

  if (loading) {
    return (
      <div className="app-loading">
        <Spin size="large" tip="应用加载中..." />
      </div>
    );
  }

  console.log('当前token状态:', token);
  
  return (
    <ConfigProvider locale={zhCN}>
      {token ? <MainLayout /> : <LoginPage />}
    </ConfigProvider>
  );
};

export default App; 