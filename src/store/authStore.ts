import { create } from 'zustand';
import { message } from 'antd';
import AuthService from '../services/authService';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkToken: () => Promise<boolean>;
}

// 使用本地存储保存会话
const setToken = (token: string) => {
  console.log('通过setToken函数保存token:', token);
  localStorage.setItem('token', token);
};

const getToken = (): string | null => {
  // 先尝试从localStorage获取
  let token = localStorage.getItem('token');
  
  // 如果没有token且在开发环境，使用默认测试token
  if (!token && process.env.NODE_ENV !== 'production') {
    token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldmVsb3BlciIsImlhdCI6MTUxNjIzOTAyMn0.XbPfbIHMI6arZ3Y922BhjWgQzWXcXNrz0ogtVhfEd2o';
    setToken(token); // 存储到localStorage中
    console.log('使用开发环境默认token');
  }
  
  return token;
};

const removeToken = () => {
  localStorage.removeItem('token');
};

const getUserFromStorage = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    return JSON.parse(userStr);
  }
  return null;
};

// 创建认证状态存储
export const useAuthStore = create<AuthState>()((set) => ({
  token: getToken(),
  user: getUserFromStorage(),
  loading: false,
  
  login: async (username: string, password: string) => {
    set({ loading: true });
    try {
      // 使用AuthService进行登录，它会优先尝试HTTP API，然后再使用IPC
      const response = await AuthService.login({ username, password });
      
      // 登录成功
      set({
        token: response.accessToken,
        user: {
          id: response.id,
          username: response.username,
          email: response.email,
          role: response.role
        },
        loading: false
      });
      
      // 保存token到localStorage
      console.log('存储token到localStorage:', response.accessToken);
      setToken(response.accessToken);
      localStorage.setItem('user', JSON.stringify({
        id: response.id,
        username: response.username,
        email: response.email,
        role: response.role
      }));
      
      message.success('登录成功');
      
      // 强制刷新页面以确保状态更新和界面重新渲染
      setTimeout(() => {
        window.location.reload();
      }, 500);
      
      return true;
    } catch (error: any) {
      console.error('登录错误:', error);
      message.error(error.message || '登录失败，请检查网络连接');
      set({ loading: false });
      return false;
    }
  },
  
  logout: async () => {
    try {
      // 使用AuthService进行注销，它会优先尝试HTTP API，然后再使用IPC
      await AuthService.logout();
      
      // 移除token和用户信息
      removeToken();
      localStorage.removeItem('user');
      
      // 更新状态
      set({ token: null, user: null });
      message.success('已退出登录');
    } catch (error) {
      console.error('注销错误:', error);
      message.error('注销失败');
      
      // 即使API调用失败，也清除本地状态
      removeToken();
      localStorage.removeItem('user');
      set({ token: null, user: null });
    }
  },
  
  checkToken: async () => {
    const savedToken = getToken();
    if (savedToken) {
      console.log('已有token存在:', savedToken);
      const savedUser = getUserFromStorage();
      if (savedUser) {
        set({ 
          token: savedToken,
          user: savedUser
        });
        return true;
      }
    }
    return false;
  }
})); 