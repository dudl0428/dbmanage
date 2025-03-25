import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { notification } from 'antd';
import { ApiResponse } from '@/types/api';

// 创建axios实例
const instance: AxiosInstance = axios.create({
  baseURL: '/api', // API基础URL
  timeout: 30000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // 从localStorage获取token
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
instance.interceptors.response.use(
  (response: AxiosResponse) => {
    // 直接返回响应数据，由service层处理具体的API格式
    return response.data;
  },
  (error) => {
    if (error.response) {
      // 处理服务器返回的错误
      const { status, data } = error.response;
      let message = '请求失败';
      
      // 处理不同HTTP状态码
      switch (status) {
        case 401:
          message = '未授权，请重新登录';
          // 清除token并跳转到登录页面
          localStorage.removeItem('token');
          window.location.href = '/login';
          break;
        case 403:
          message = '拒绝访问';
          break;
        case 404:
          message = '请求的资源不存在';
          break;
        case 500:
          message = '服务器内部错误';
          break;
        default:
          message = data?.message || `请求失败 (${status})`;
      }
      
      // 使用Antd通知显示错误信息
      notification.error({
        message: '请求错误',
        description: message,
        duration: 3
      });
      
      // 返回格式化的错误响应
      return Promise.reject({
        ...error,
        message
      });
    }
    
    // 处理网络错误
    if (error.message.includes('timeout')) {
      notification.error({
        message: '请求超时',
        description: '服务器响应超时，请稍后再试',
        duration: 3
      });
    } else if (error.message.includes('Network Error')) {
      notification.error({
        message: '网络错误',
        description: '无法连接到服务器，请检查网络连接',
        duration: 3
      });
    } else {
      notification.error({
        message: '请求错误',
        description: error.message || '发生未知错误',
        duration: 3
      });
    }
    
    return Promise.reject(error);
  }
);

// 请求方法封装
const request = {
  /**
   * GET请求
   * @param url 请求地址
   * @param config 请求配置
   * @returns 响应数据
   */
  get: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return instance.get(url, config);
  },
  
  /**
   * POST请求
   * @param url 请求地址
   * @param data 请求数据
   * @param config 请求配置
   * @returns 响应数据
   */
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return instance.post(url, data, config);
  },
  
  /**
   * PUT请求
   * @param url 请求地址
   * @param data 请求数据
   * @param config 请求配置
   * @returns 响应数据
   */
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    return instance.put(url, data, config);
  },
  
  /**
   * DELETE请求
   * @param url 请求地址
   * @param config 请求配置
   * @returns 响应数据
   */
  delete: <T = any>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    return instance.delete(url, config);
  }
};

export default request;
export { request, instance as axiosInstance }; 