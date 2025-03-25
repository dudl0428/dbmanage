import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// 创建一个axios实例
const apiClient: AxiosInstance = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// 请求拦截器，为每个请求添加token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // 处理401错误（未授权）
    if (error.response && error.response.status === 401) {
      // 清除localStorage中的token和用户信息
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // 重定向到登录页
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// 通用API接口
class ApiService {
  // 发送GET请求
  static get<T>(url: string, config?: AxiosRequestConfig) {
    return apiClient.get<T>(url, config);
  }
  
  // 发送POST请求
  static post<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return apiClient.post<T>(url, data, config);
  }
  
  // 发送PUT请求
  static put<T>(url: string, data?: any, config?: AxiosRequestConfig) {
    return apiClient.put<T>(url, data, config);
  }
  
  // 发送DELETE请求
  static delete<T>(url: string, config?: AxiosRequestConfig) {
    return apiClient.delete<T>(url, config);
  }
  
  // 检查API服务是否可用
  static async checkHealth(): Promise<boolean> {
    try {
      const response = await apiClient.get('/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error('健康检查失败:', error);
      return false;
    }
  }
}

export default ApiService; 