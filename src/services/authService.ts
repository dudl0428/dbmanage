import ApiService from './api';

// 定义接口
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  fullName?: string;
}

export interface AuthResponse {
  id: number;
  username: string;
  email: string;
  role: string;
  accessToken: string;
  tokenType: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

class AuthService {
  // 用户登录
  static async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      // 先尝试使用HTTP API
      const response = await ApiService.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
      
      // 如果成功，保存token和用户信息
      if (response.data.success) {
        const authData = response.data.data;
        // 明确设置token到localStorage
        console.log('设置token:', authData.accessToken);
        localStorage.setItem('token', authData.accessToken);
        localStorage.setItem('user', JSON.stringify({
          id: authData.id,
          username: authData.username,
          email: authData.email,
          role: authData.role
        }));
        return authData;
      }
      
      throw new Error(response.data.message || '登录失败');
    } catch (error) {
      console.error("HTTP API登录失败，尝试使用Electron IPC:", error);
      
      // 如果HTTP请求失败，尝试使用Electron IPC
      try {
        // @ts-ignore - window.electronAPI是通过preload脚本注入的
        const electronResponse = await window.electronAPI.auth.login(credentials.username, credentials.password);
        
        if (electronResponse.success) {
          const user = electronResponse.data;
          // 明确设置token到localStorage
          console.log('设置Electron token:', user.token);
          localStorage.setItem('token', user.token);
          localStorage.setItem('user', JSON.stringify({
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role
          }));
          
          return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            accessToken: user.token,
            tokenType: 'Bearer'
          };
        }
        
        throw new Error(electronResponse.message || '登录失败');
      } catch (ipcError) {
        console.error("Electron IPC登录也失败:", ipcError);
        throw ipcError;
      }
    }
  }
  
  // 用户注册
  static async register(data: RegisterRequest): Promise<ApiResponse<string>> {
    try {
      // 先尝试使用HTTP API
      const response = await ApiService.post<ApiResponse<string>>('/auth/register', data);
      return response.data;
    } catch (error) {
      console.error("HTTP API注册失败，尝试使用Electron IPC:", error);
      
      // 如果HTTP请求失败，尝试使用Electron IPC
      try {
        // @ts-ignore - window.electronAPI是通过preload脚本注入的
        const electronResponse = await window.electronAPI.auth.register(data);
        
        return {
          success: electronResponse.success,
          message: electronResponse.message || '注册处理完成',
          data: electronResponse.data || ''
        };
      } catch (ipcError) {
        console.error("Electron IPC注册也失败:", ipcError);
        throw ipcError;
      }
    }
  }
  
  // 用户登出
  static async logout(): Promise<void> {
    try {
      // 先尝试使用HTTP API
      await ApiService.post('/auth/logout');
    } catch (error) {
      console.error("HTTP API登出失败，尝试使用Electron IPC:", error);
      
      // 如果HTTP请求失败，尝试使用Electron IPC
      try {
        // @ts-ignore - window.electronAPI是通过preload脚本注入的
        await window.electronAPI.auth.logout();
      } catch (ipcError) {
        console.error("Electron IPC登出也失败:", ipcError);
        // 登出失败不抛出异常，以确保前端仍能正常清除状态
      }
    }
    
    // 无论如何，清除localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
  
  // 获取当前登录的用户
  static getCurrentUser(): any {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      return JSON.parse(userStr);
    }
    return null;
  }
  
  // 检查用户是否已登录
  static isAuthenticated(): boolean {
    return !!localStorage.getItem('token');
  }
}

export default AuthService; 