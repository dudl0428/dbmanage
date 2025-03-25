import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// API基础配置
// 注意：在vite项目中，环境变量通过import.meta.env访问
// 但需要在vite-env.d.ts中声明类型
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://localhost:8080/api'  // 生产环境API地址
  : 'http://localhost:3000/api'; // 开发环境API地址（使用端口3000适配当前环境）

// API响应接口
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  success: boolean;
}

// 创建axios实例
const createAxiosInstance = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // 请求拦截器
  instance.interceptors.request.use(
    (config) => {
      // 从localStorage获取token并添加到请求头
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('添加了Authorization头:', config.headers.Authorization);
      } else {
        console.log('未找到token或headers不存在');
        // 如果没有token，临时使用一个模拟token用于开发测试
        if (config.headers && process.env.NODE_ENV !== 'production') {
          config.headers.Authorization = 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkRldmVsb3BlciIsImlhdCI6MTUxNjIzOTAyMn0.XbPfbIHMI6arZ3Y922BhjWgQzWXcXNrz0ogtVhfEd2o';
          console.log('使用开发测试token');
        }
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // 响应拦截器
  instance.interceptors.response.use(
    (response) => {
      return response;
    },
    (error) => {
      if (error.response) {
        // 处理401未授权错误（token过期或无效）
        if (error.response.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

// 获取API实例
export const getApi = (): AxiosInstance => {
  return createAxiosInstance(API_BASE_URL);
};

// HTTP请求方法
export const http = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<{ data: ApiResponse<T> }> => {
    try {
      const response = await getApi().get<ApiResponse<T>>(url, config);
      return response;
    } catch (error) {
      console.error('HTTP GET请求错误:', error);
      throw error;
    }
  },

  post: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<{ data: ApiResponse<T> }> => {
    try {
      const response = await getApi().post<ApiResponse<T>>(url, data, config);
      return response;
    } catch (error) {
      console.error('HTTP POST请求错误:', error);
      throw error;
    }
  },

  put: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<{ data: ApiResponse<T> }> => {
    try {
      const response = await getApi().put<ApiResponse<T>>(url, data, config);
      return response;
    } catch (error) {
      console.error('HTTP PUT请求错误:', error);
      throw error;
    }
  },

  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<{ data: ApiResponse<T> }> => {
    try {
      const response = await getApi().delete<ApiResponse<T>>(url, config);
      return response;
    } catch (error) {
      console.error('HTTP DELETE请求错误:', error);
      throw error;
    }
  }
};

export default http; 