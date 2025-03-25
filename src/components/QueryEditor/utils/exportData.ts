/**
 * 数据导出工具函数
 * 用于将SQL查询结果导出为Excel或CSV格式
 */

// 列定义接口
export interface ColumnDefinition {
  title?: string;
  dataIndex: string;
  key?: string;
  [key: string]: any;
}

/**
 * 将数据导出为Excel文件
 * @param data 数据数组
 * @param columns 列定义
 * @param fileName 文件名(不含扩展名)
 */
export const exportToExcel = (data: any[], columns: ColumnDefinition[], fileName: string = 'export') => {
  // 创建工作表数据
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // 添加表头
  const headers = columns.map(col => {
    const title = col.title || col.dataIndex;
    // 处理包含逗号的标题
    return title.includes(',') ? `"${title}"` : title;
  });
  csvContent += headers.join(',') + '\r\n';
  
  // 添加数据行
  data.forEach(row => {
    const rowData = columns.map(col => {
      const dataIndex = col.dataIndex;
      const value = row[dataIndex];
      
      // 处理null或undefined值
      if (value === null || value === undefined) {
        return '';
      }
      
      // 处理字符串中的逗号，用双引号包裹
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\r') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    
    csvContent += rowData.join(',') + '\r\n';
  });
  
  // 创建下载链接
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${fileName}.xlsx`);
  document.body.appendChild(link);
  
  // 触发下载
  link.click();
  
  // 清理
  document.body.removeChild(link);
};

/**
 * 将数据导出为CSV文件
 * @param data 数据数组
 * @param columns 列定义
 * @param fileName 文件名(不含扩展名)
 */
export const exportToCSV = (data: any[], columns: ColumnDefinition[], fileName: string = 'export') => {
  // 创建CSV内容
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // 添加表头
  const headers = columns.map(col => {
    const title = col.title || col.dataIndex;
    // 处理包含逗号的标题
    return title.includes(',') ? `"${title}"` : title;
  });
  csvContent += headers.join(',') + '\r\n';
  
  // 添加数据行
  data.forEach(row => {
    const rowData = columns.map(col => {
      const dataIndex = col.dataIndex;
      const value = row[dataIndex];
      
      // 处理null或undefined值
      if (value === null || value === undefined) {
        return '';
      }
      
      // 处理字符串中的逗号，用双引号包裹
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\r') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      
      return value;
    });
    
    csvContent += rowData.join(',') + '\r\n';
  });
  
  // 创建下载链接
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${fileName}.csv`);
  document.body.appendChild(link);
  
  // 触发下载
  link.click();
  
  // 清理
  document.body.removeChild(link);
};

/**
 * 将数据导出为JSON文件
 * @param data 数据数组
 * @param fileName 文件名(不含扩展名)
 */
export const exportToJSON = (data: any[], fileName: string = 'export') => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${fileName}.json`);
  document.body.appendChild(link);
  
  // 触发下载
  link.click();
  
  // 清理
  URL.revokeObjectURL(url);
  document.body.removeChild(link);
};

/**
 * 复制数据到剪贴板
 * @param data 数据数组
 * @param columns 列定义
 * @returns 是否复制成功
 */
export const copyToClipboard = async (data: any[], columns: ColumnDefinition[]): Promise<boolean> => {
  try {
    // 创建CSV格式的文本
    let csvContent = '';
    
    // 添加表头
    const headers = columns.map(col => col.title || col.dataIndex);
    csvContent += headers.join('\t') + '\n';
    
    // 添加数据行
    data.forEach(row => {
      const rowData = columns.map(col => {
        const value = row[col.dataIndex];
        return value !== null && value !== undefined ? value : '';
      });
      csvContent += rowData.join('\t') + '\n';
    });
    
    // 复制到剪贴板
    await navigator.clipboard.writeText(csvContent);
    return true;
  } catch (error) {
    console.error('复制到剪贴板失败:', error);
    return false;
  }
}; 