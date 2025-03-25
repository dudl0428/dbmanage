/**
 * 本地存储工具类
 * 封装对 localStorage 的操作，方便统一管理，未来可以扩展到不同的存储方式
 */

const TOKEN_KEY = 'dbmanage_token';
const USER_INFO_KEY = 'dbmanage_user_info';
const SETTINGS_KEY = 'dbmanage_settings';

const storage = {
  /**
   * 存储令牌
   * @param token 令牌字符串
   */
  setToken(token: string): void {
    localStorage.setItem(TOKEN_KEY, token);
  },

  /**
   * 获取令牌
   * @returns 令牌字符串或null
   */
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  /**
   * 清除令牌
   */
  clearToken(): void {
    localStorage.removeItem(TOKEN_KEY);
  },

  /**
   * 存储用户信息
   * @param userInfo 用户信息对象
   */
  setUserInfo(userInfo: any): void {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(userInfo));
  },

  /**
   * 获取用户信息
   * @returns 用户信息对象
   */
  getUserInfo(): any {
    const userInfo = localStorage.getItem(USER_INFO_KEY);
    return userInfo ? JSON.parse(userInfo) : null;
  },

  /**
   * 清除用户信息
   */
  clearUserInfo(): void {
    localStorage.removeItem(USER_INFO_KEY);
  },
  
  /**
   * 存储应用设置
   * @param settings 设置对象
   */
  setSettings(settings: any): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },
  
  /**
   * 获取应用设置
   * @returns 设置对象
   */
  getSettings(): any {
    const settings = localStorage.getItem(SETTINGS_KEY);
    return settings ? JSON.parse(settings) : null;
  },
  
  /**
   * 清除所有存储数据
   */
  clearAll(): void {
    localStorage.clear();
  }
};

export default storage; 