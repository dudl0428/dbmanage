/**
 * 判断当前环境是否是Electron
 * @returns 是否是Electron环境
 */
export function isElectron(): boolean {
  // 在renderer进程中，有window对象，并且window.electronAPI存在
  return typeof window !== 'undefined' && 
    typeof window.electronAPI !== 'undefined';
}

/**
 * 获取Electron窗口最大化状态
 * @returns Promise<boolean> 窗口是否最大化
 */
export async function isMaximized(): Promise<boolean> {
  if (isElectron()) {
    return await window.electronAPI.isMaximized();
  }
  return false;
}

/**
 * 最小化窗口
 */
export function minimizeWindow(): void {
  if (isElectron()) {
    window.electronAPI.minimize();
  }
}

/**
 * 最大化或还原窗口
 */
export function maximizeWindow(): void {
  if (isElectron()) {
    window.electronAPI.maximize();
  }
}

/**
 * 关闭窗口
 */
export function closeWindow(): void {
  if (isElectron()) {
    window.electronAPI.close();
  }
}

/**
 * 执行健康检查
 * @returns Promise<boolean> 健康检查结果
 */
export async function healthCheck(): Promise<boolean> {
  if (isElectron()) {
    return await window.electronAPI.healthCheck();
  }
  return false;
}

export default {
  isElectron,
  isMaximized,
  minimizeWindow,
  maximizeWindow,
  closeWindow,
  healthCheck
}; 