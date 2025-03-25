import React, { useState, useEffect } from 'react';
import { Form, Input, Table, Button, Select, Checkbox, Tabs, message, Tooltip, Space, Divider, Radio, Switch, Modal, InputNumber } from 'antd';
import type { ColumnType } from 'antd/es/table';
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  VerticalAlignMiddleOutlined,
  QuestionCircleOutlined,
  CloseOutlined
} from '@ant-design/icons';
import type { FieldDefinition, IndexDefinition, ForeignKeyDefinition, TriggerDefinition, DataTypeDefinition } from '@/types/table';
import tableService from '@/services/tableService';
import './style.css';
import type { TabsProps } from 'antd';

const { Option } = Select;

interface TableDesignerProps {
  connectionId: string;
  databaseName: string;
  databaseType: string;
  onClose?: () => void;
  onSave?: () => void;
}

// 类型下拉菜单选项列表
const renderDataTypeOptions = (types: string[]) => {
  return types.map(type => (
    <Option key={type} value={type}>
      {type}
    </Option>
  ));
};

// 统一的错误处理函数
const handleApiError = (error: any, fallbackMessage: string) => {
  console.error(fallbackMessage, error);
  let errorMsg = error?.message || fallbackMessage;
  if (error?.response?.data?.message) {
    errorMsg = error.response.data.message;
  }
  message.error(errorMsg);
};

const TableDesigner: React.FC<TableDesignerProps> = ({
  connectionId,
  databaseName,
  databaseType,
  onClose,
  onSave
}) => {
  const [activeTab, setActiveTab] = useState('fields');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [tableForm] = Form.useForm();
  const [dataTypes, setDataTypes] = useState<string[]>([]);
  const [dataTypeDefinitions, setDataTypeDefinitions] = useState<Record<string, DataTypeDefinition>>({});
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [indexes, setIndexes] = useState<IndexDefinition[]>([]);
  const [foreignKeys, setForeignKeys] = useState<ForeignKeyDefinition[]>([]);
  const [triggers, setTriggers] = useState<TriggerDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [selectedIndexRows, setSelectedIndexRows] = useState<number[]>([]);
  const [selectedRow, setSelectedRow] = useState<FieldDefinition | IndexDefinition | ForeignKeyDefinition | TriggerDefinition | null>(null);
  const [fieldModalVisible, setFieldModalVisible] = useState(false);
  const [indexModalVisible, setIndexModalVisible] = useState(false);
  const [foreignKeyModalVisible, setForeignKeyModalVisible] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [editingIndex, setEditingIndex] = useState<IndexDefinition | null>(null);
  const [editingForeignKey, setEditingForeignKey] = useState<ForeignKeyDefinition | null>(null);
  const [fieldForm] = Form.useForm();
  const [indexForm] = Form.useForm();
  const [foreignKeyForm] = Form.useForm();
  const [tables, setTables] = useState<string[]>([]);
  const [referenceFields, setReferenceFields] = useState<string[]>([]);
  const [saveForm] = Form.useForm();

  useEffect(() => {
    loadDataTypes();
    initDefaultFields();
  }, [connectionId, databaseType]);

  // 初始化默认字段
  const initDefaultFields = () => {
    // 如果没有字段，添加一个默认的id主键字段
    if (fields.length === 0) {
      setFields([
        {
          name: 'id',
          type: 'int',
          length: 11,
          notNull: true,
          autoIncrement: true,
          primaryKey: true,
          comment: '主键ID'
        }
      ]);
    }
  };

  // 加载数据类型（优化错误处理）
  const loadDataTypes = async () => {
    try {
      setLoading(true);
      
      if (!connectionId || !databaseType) {
        message.warning('连接ID或数据库类型未提供');
        console.error('加载数据类型失败: 连接ID或数据库类型未提供', { connectionId, databaseType });
        return;
      }
      
      console.log('开始加载数据类型:', { 
        connectionId, 
        databaseType,
        normalizedType: databaseType.toLowerCase()
      });
      
      // 调用服务获取数据类型，确保传递正确的参数
      const response = await tableService.getDatabaseTypes({
        connectionId: connectionId,
        databaseType: databaseType.toLowerCase() // 确保转换为小写
      });
      
      console.log('数据类型加载结果:', {
        success: !!response,
        typesCount: response.types?.length,
        definitionsCount: Object.keys(response.definitions || {}).length,
        types: response.types,
        definitions: response.definitions
      });
      
      if (response && response.types) {
        setDataTypes(response.types);
        setDataTypeDefinitions(response.definitions || {});
        
        console.log('设置数据类型成功:', { 
          typesCount: response.types.length,
          definitionsCount: Object.keys(response.definitions || {}).length,
          firstFewTypes: response.types.slice(0, 5)
        });
        
        if (response.types.length === 0) {
          message.warning(`未找到数据库类型 ${databaseType} 的数据类型定义`);
          console.warn(`未找到数据库类型 ${databaseType} 的数据类型定义`);
        }
      } else {
        console.error('加载数据类型失败: 无效的返回格式', response);
        message.error('加载数据类型失败: 无效的返回格式');
      }
    } catch (error: any) {
      console.error('加载数据类型错误:', error);
      message.error(`加载数据类型失败: ${error.message || '未知错误'}`);
      setDataTypes([]);
      setDataTypeDefinitions({});
    } finally {
      setLoading(false);
    }
  };

  // 验证字段输入
  const validateField = async (field: FieldDefinition): Promise<boolean> => {
    try {
      if (!field.name) {
        message.error('字段名不能为空');
        return false;
      }
      
      // 验证字段名格式
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
        message.error('字段名只能包含字母、数字和下划线，且不能以数字开头');
        return false;
      }
      
      // 验证长度和小数点
      const typeInfo = dataTypeDefinitions[field.type];
      if (typeInfo?.supportsLength && field.length !== undefined) {
        if (typeInfo.maxLength && field.length > typeInfo.maxLength) {
          message.error(`字段 ${field.name} 的长度不能超过 ${typeInfo.maxLength}`);
          return false;
        }
      }
      
      if (typeInfo?.supportsDecimal && field.decimal !== undefined) {
        if (typeInfo.maxDecimal && field.decimal > typeInfo.maxDecimal) {
          message.error(`字段 ${field.name} 的小数位数不能超过 ${typeInfo.maxDecimal}`);
          return false;
        }
      }
      
      // 调用后端验证
      await tableService.validateField({
        field,
        databaseType,
        connectionId
      });
      
      return true;
    } catch (error: any) {
      handleApiError(error, `验证字段 ${field.name} 失败`);
      return false;
    }
  };

  const handleFieldChange = async (index: number, key: string, value: any) => {
    try {
      const newFields = [...fields];
      newFields[index] = {
        ...newFields[index],
        [key]: value
      };
      
      // 如果改变了数据类型，重置长度和小数点
      if (key === 'type') {
        const typeDefinition = dataTypeDefinitions[value];
        if (typeDefinition) {
          if (!typeDefinition.supportsLength) {
            newFields[index].length = undefined;
          }
          if (!typeDefinition.supportsDecimal) {
            newFields[index].decimal = undefined;
          }
        }
      }
      
      // 如果将字段设置为主键，自动添加非空属性
      if (key === 'primaryKey' && value === true) {
        newFields[index].notNull = true;
      }
      
      setFields(newFields);
      
      // 重要字段变更时验证
      if (key === 'name' || key === 'type' || key === 'length' || key === 'decimal') {
        await validateField(newFields[index]);
      }
    } catch (error: any) {
      handleApiError(error, '更新字段失败');
    }
  };

  const handleAddField = () => {
    try {
      // 检查是否有有效的数据类型可选
      if (!dataTypes.length) {
        message.warning('尚未加载数据类型，请稍后再试');
        return;
      }
      
      // 如果表中没有字段，添加一个默认的id字段作为主键
      if (fields.length === 0) {
        setFields([
          {
            name: 'id',
            type: 'int',
            length: 11,
            notNull: true,
            autoIncrement: true,
            primaryKey: true,
            comment: '主键ID'
          }
        ]);
      } else {
        setFields([
          ...fields,
          {
            name: '',
            type: dataTypes[0],
            notNull: false,
            autoIncrement: false,
            primaryKey: false,
            comment: ''
          }
        ]);
      }
    } catch (error: any) {
      handleApiError(error, '添加字段失败');
    }
  };

  // 处理删除按钮点击，根据当前活动的标签页执行不同的删除操作
  const handleDelete = (tab: string) => {
    switch (tab) {
      case 'fields':
        if (selectedRowKeys.length === 0) {
          message.warning('请先选择要删除的字段');
          return;
        }
        
        // 获取字段名称列表用于提示
        const fieldNames = selectedRowKeys.map(index => fields[index].name || `字段${index + 1}`).join(', ');
        
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除选中的字段吗？(${fieldNames})`,
          onOk: () => {
            const newFields = fields.filter((_, i) => !selectedRowKeys.includes(i));
            setFields(newFields);
            setSelectedRowKeys([]);
            
            // 同时更新索引和外键，移除引用了被删除字段的部分
            updateRelatedObjects(newFields);
          }
        });
        break;
        
      case 'indexes':
        if (selectedIndexRows.length === 0) {
          message.warning('请先选择要删除的索引');
          return;
        }
        
        const indexNames = selectedIndexRows.map(index => indexes[index].name || `索引${index + 1}`).join(', ');
        
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除选中的索引吗？(${indexNames})`,
          onOk: () => {
            setIndexes(indexes.filter((_, i) => !selectedIndexRows.includes(i)));
            setSelectedIndexRows([]);
          }
        });
        break;
        
      case 'foreignKeys':
        if (selectedRowKeys.length === 0) {
          message.warning('请先选择要删除的外键');
          return;
        }
        
        const fkNames = selectedRowKeys.map(index => foreignKeys[index].name || `外键${index + 1}`).join(', ');
        
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除选中的外键吗？(${fkNames})`,
          onOk: () => {
            setForeignKeys(foreignKeys.filter((_, i) => !selectedRowKeys.includes(i)));
            setSelectedRowKeys([]);
          }
        });
        break;
        
      case 'triggers':
        if (selectedRowKeys.length === 0) {
          message.warning('请先选择要删除的触发器');
          return;
        }
        
        const triggerNames = selectedRowKeys.map(index => triggers[index].name || `触发器${index + 1}`).join(', ');
        
        Modal.confirm({
          title: '确认删除',
          content: `确定要删除选中的触发器吗？(${triggerNames})`,
          onOk: () => {
            setTriggers(triggers.filter((_, i) => !selectedRowKeys.includes(i)));
            setSelectedRowKeys([]);
          }
        });
        break;
        
      default:
        break;
    }
  };

  // 更新依赖于字段的相关对象（索引、外键等）
  const updateRelatedObjects = (newFields: FieldDefinition[]) => {
    try {
      // 获取有效的字段名列表
      const validFieldNames = newFields.map(f => f.name).filter(Boolean);
      
      // 更新索引，移除引用了不存在字段的列
      const updatedIndexes = indexes.map(index => ({
        ...index,
        columnNames: index.columnNames.filter(col => validFieldNames.includes(col))
      })).filter(index => index.columnNames.length > 0);
      
      // 更新外键，移除引用了不存在字段的列
      const updatedForeignKeys = foreignKeys.map(fk => ({
        ...fk,
        sourceColumns: fk.sourceColumns.filter(col => validFieldNames.includes(col))
      })).filter(fk => fk.sourceColumns.length > 0);
      
      setIndexes(updatedIndexes);
      setForeignKeys(updatedForeignKeys);
    } catch (error: any) {
      console.error('更新相关对象失败:', error);
    }
  };

  const handleInsertField = (index: number) => {
    try {
      const newFields = [...fields];
      newFields.splice(index, 0, {
        name: '',
        type: dataTypes[0] || 'varchar',
        length: 255,
        notNull: false,
        primaryKey: false,
        autoIncrement: false,
        comment: ''
      });
      setFields(newFields);
    } catch (error: any) {
      handleApiError(error, '插入字段失败');
    }
  };

  const handleRowSelect = (index: number) => {
    if (selectedRowKeys.includes(index)) {
      setSelectedRowKeys(selectedRowKeys.filter(i => i !== index));
    } else {
      setSelectedRowKeys([...selectedRowKeys, index]);
    }
  };

  const handleIndexRowSelect = (index: number) => {
    if (selectedIndexRows.includes(index)) {
      setSelectedIndexRows(selectedIndexRows.filter(i => i !== index));
    } else {
      setSelectedIndexRows([...selectedIndexRows, index]);
    }
  };
  
  // 验证整个表单
  const validateForm = async (): Promise<boolean> => {
    try {
      // 验证表名
      const values = await form.validateFields();
      if (!values.tableName) {
        message.error('表名不能为空');
        return false;
      }
      
      // 验证字段列表
      if (fields.length === 0) {
        message.error('至少需要添加一个字段');
        return false;
      }
      
      // 验证每个字段的有效性
      for (const field of fields) {
        if (!field.name) {
          message.error('存在未命名的字段');
          return false;
        }
        
        // 验证字段名格式
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field.name)) {
          message.error(`字段名 ${field.name} 只能包含字母、数字和下划线，且不能以数字开头`);
          return false;
        }
        
        // 验证字段类型
        if (!field.type) {
          message.error(`字段 ${field.name} 未指定类型`);
          return false;
        }
        
        // 验证自增字段的限制
        if (field.autoIncrement) {
          const typeDefinition = dataTypeDefinitions[field.type];
          if (!typeDefinition?.supportsAutoIncrement) {
            message.error(`字段 ${field.name} 的类型 ${field.type} 不支持自增`);
            return false;
          }
        }
      }
      
      // 验证字段名唯一性
      const fieldNames = fields.map(f => f.name);
      const uniqueFieldNames = new Set(fieldNames);
      if (fieldNames.length !== uniqueFieldNames.size) {
        message.error('存在重复的字段名');
        return false;
      }
      
      // 验证索引
      for (const index of indexes) {
        if (!index.name) {
          message.error('存在未命名的索引');
          return false;
        }
        
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(index.name)) {
          message.error(`索引名 ${index.name} 只能包含字母、数字和下划线，且不能以数字开头`);
          return false;
        }
        
        if (!index.columnNames || index.columnNames.length === 0) {
          message.error(`索引 ${index.name} 未指定列`);
          return false;
        }
        
        // 验证引用的字段是否存在
        for (const columnName of index.columnNames) {
          if (!fieldNames.includes(columnName)) {
            message.error(`索引 ${index.name} 引用了不存在的字段 ${columnName}`);
            return false;
          }
        }
      }
      
      // 验证索引名唯一性
      const indexNames = indexes.map(i => i.name);
      const uniqueIndexNames = new Set(indexNames);
      if (indexNames.length !== uniqueIndexNames.size) {
        message.error('存在重复的索引名');
        return false;
      }
      
      // 验证外键
      for (const fk of foreignKeys) {
        if (!fk.name) {
          message.error('存在未命名的外键');
          return false;
        }
        
        if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(fk.name)) {
          message.error(`外键名 ${fk.name} 只能包含字母、数字和下划线，且不能以数字开头`);
          return false;
        }
        
        if (!fk.sourceColumns || fk.sourceColumns.length === 0) {
          message.error(`外键 ${fk.name} 未指定源列`);
          return false;
        }
        
        if (!fk.referenceTable) {
          message.error(`外键 ${fk.name} 未指定引用表`);
          return false;
        }
        
        if (!fk.referenceColumns || fk.referenceColumns.length === 0) {
          message.error(`外键 ${fk.name} 未指定引用列`);
          return false;
        }
        
        if (fk.sourceColumns.length !== fk.referenceColumns.length) {
          message.error(`外键 ${fk.name} 的源列和引用列数量不匹配`);
          return false;
        }
        
        // 验证引用的字段是否存在
        for (const columnName of fk.sourceColumns) {
          if (!fieldNames.includes(columnName)) {
            message.error(`外键 ${fk.name} 引用了不存在的字段 ${columnName}`);
            return false;
          }
        }
      }
      
      // 验证外键名唯一性
      const fkNames = foreignKeys.map(fk => fk.name);
      const uniqueFkNames = new Set(fkNames);
      if (fkNames.length !== uniqueFkNames.size) {
        message.error('存在重复的外键名');
        return false;
      }
      
      // 调用后端验证
      await tableService.validateTable({
        connectionId,
        databaseName,
        tableName: values.tableName,
        fields,
        indexes,
        foreignKeys,
        triggers
      });
      
      return true;
    } catch (error: any) {
      handleApiError(error, '验证表格失败');
      return false;
    }
  };

  const handleSaveTable = async (values: { tableName: string; comment?: string }) => {
    try {
      // 检查表名
      if (!values.tableName) {
        message.error('表名不能为空');
        return;
      }

      // 验证表名格式
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(values.tableName)) {
        message.error('表名只能包含字母、数字和下划线，且不能以数字开头');
        return;
      }

      // 检查是否有主键
      const hasPrimaryKey = fields.some(field => field.primaryKey);
      if (!hasPrimaryKey) {
        Modal.confirm({
          title: '警告',
          content: '表没有设置主键，是否继续创建？',
          okText: '继续',
          cancelText: '取消',
          onOk: async () => {
            await doSaveTable({
              ...values,
              databaseType: databaseType // 确保传递数据库类型
            });
          }
        });
      } else {
        await doSaveTable({
          ...values,
          databaseType: databaseType // 确保传递数据库类型
        });
      }
    } catch (error: any) {
      handleApiError(error, '创建表失败');
    }
  };
  
  // 实际保存表的函数
  const doSaveTable = async (values: { tableName: string; comment?: string }) => {
    try {
      setLoading(true);
      
      // 自动为主键创建索引(如果不存在)
      const primaryKeyFields = fields.filter(f => f.primaryKey);
      if (primaryKeyFields.length > 0) {
        const primaryKeyNames = primaryKeyFields.map(f => f.name);
        const hasPrimaryKeyIndex = indexes.some(idx => 
          idx.columnNames.length === primaryKeyNames.length && 
          idx.columnNames.every(col => primaryKeyNames.includes(col))
        );
        
        if (!hasPrimaryKeyIndex) {
          const newIndexes = [...indexes];
          newIndexes.push({
            name: `pk_${values.tableName}`,
            columnNames: primaryKeyNames,
            unique: true,
            type: 'BTREE',
            method: '',
            comment: '主键索引'
          });
          setIndexes(newIndexes);
        }
      }
      
      await tableService.createTable({
        connectionId,
        databaseName,
        databaseType,
        tableName: values.tableName,
        fields,
        indexes,
        foreignKeys,
        triggers,
        comment: values.comment
      });
      
      message.success(`表 ${values.tableName} 创建成功`);
      setSaveModalVisible(false);
      form.resetFields();
      
      // 重置表单状态
      setFields([]);
      setIndexes([]);
      setForeignKeys([]);
      setTriggers([]);
      
      if (onSave) {
        onSave();
      }
    } catch (error: any) {
      handleApiError(error, '创建表失败');
    } finally {
      setLoading(false);
    }
  };

  // 添加索引
  const handleAddIndex = () => {
    setIndexes([
      ...indexes,
      {
        name: '',
        columnNames: [],
        unique: false, // 添加unique属性
        type: 'BTREE',
        method: '',
        comment: ''
      }
    ]);
  };

  // 添加外键
  const handleAddForeignKey = () => {
    setForeignKeys([
      ...foreignKeys,
      {
        name: '',
        sourceColumns: [],
        referenceTable: '',
        referenceColumns: [],
        updateRule: 'NO ACTION', // 使用updateRule替换onUpdate
        deleteRule: 'NO ACTION', // 使用deleteRule替换onDelete
        comment: ''
      }
    ]);
  };

  // 添加触发器
  const handleAddTrigger = () => {
    setTriggers([
      ...triggers,
      {
        name: '',
        timing: 'BEFORE',
        event: 'INSERT',
        statement: 'BEGIN\n  -- 在这里编写触发器逻辑\nEND',
        comment: '',
        databaseType: databaseType
      }
    ]);
  };

  // 处理外键变更
  const handleForeignKeyChange = (index: number, key: string, value: any) => {
    const newForeignKeys = [...foreignKeys];
    newForeignKeys[index] = {
      ...newForeignKeys[index],
      [key]: value
    };
    setForeignKeys(newForeignKeys);
  };

  // 处理触发器变更
  const handleTriggerChange = (index: number, key: string, value: any) => {
    const newTriggers = [...triggers];
    newTriggers[index] = {
      ...newTriggers[index],
      [key]: value
    };
    setTriggers(newTriggers);
  };

  // 添加SQL预览生成功能
  const generateSqlPreview = (): string => {
    if (!fields.length) return '';
    
    try {
      const tableName = form.getFieldValue('tableName') || '新表';
      
      let sql = `CREATE TABLE \`${tableName}\` (\n`;
      
      // 添加字段定义
      const fieldDefinitions = fields.map(field => {
        let definition = `  \`${field.name}\` ${field.type}`;
        
        // 添加长度
        if (field.length) {
          if (field.decimal !== undefined) {
            definition += `(${field.length},${field.decimal})`;
          } else {
            definition += `(${field.length})`;
          }
        }
        
        // 添加NOT NULL
        if (field.notNull) {
          definition += ' NOT NULL';
        }
        
        // 添加自增
        if (field.autoIncrement) {
          definition += ' AUTO_INCREMENT';
        }
        
        // 添加默认值
        if (field.defaultValue !== undefined && field.defaultValue !== '') {
          // 数字类型直接使用值
          if (['int', 'bigint', 'float', 'double', 'decimal'].includes(field.type.toLowerCase())) {
            definition += ` DEFAULT ${field.defaultValue}`;
          } else {
            // 其他类型用引号包裹
            definition += ` DEFAULT '${field.defaultValue}'`;
          }
        }
        
        // 添加注释
        if (field.comment) {
          definition += ` COMMENT '${field.comment}'`;
        }
        
        return definition;
      });
      
      // 添加主键
      const primaryKeys = fields.filter(f => f.primaryKey).map(f => `\`${f.name}\``);
      if (primaryKeys.length > 0) {
        fieldDefinitions.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
      }
      
      sql += fieldDefinitions.join(',\n');
      sql += '\n)';
      
      return sql;
    } catch (error) {
      console.error('生成SQL预览失败:', error);
      return '-- 生成SQL失败';
    }
  };

  // 根据当前标签页获取新增按钮文本
  const getAddButtonText = () => {
    switch (activeTab) {
      case 'fields':
        return '新增字段';
      case 'indexes':
        return '新增索引';
      case 'foreignKeys':
        return '新增外键';
      default:
        return '新增';
    }
  };

  // 根据当前标签页获取新增按钮点击事件
  const handleAdd = () => {
    switch (activeTab) {
      case 'fields':
        handleAddField();
        break;
      case 'indexes':
        handleAddIndex();
        break;
      case 'foreignKeys':
        handleAddForeignKey();
        break;
      default:
        break;
    }
  };

  // 处理保存按钮点击
  const handleSave = () => {
    setSaveModalVisible(true);
  };

  // 处理字段对话框确认
  const handleFieldModalOk = async () => {
    try {
      const values = await fieldForm.validateFields();
      if (editingField) {
        // 编辑现有字段
        const newFields = [...fields];
        const index = fields.findIndex(f => f === editingField);
        if (index !== -1) {
          newFields[index] = { ...values };
          setFields(newFields);
        }
      } else {
        // 添加新字段
        setFields([...fields, { ...values }]);
      }
      setFieldModalVisible(false);
      fieldForm.resetFields();
      setEditingField(null);
    } catch (error) {
      console.error('字段表单验证失败:', error);
    }
  };

  // 处理索引对话框确认
  const handleIndexModalOk = async () => {
    try {
      const values = await indexForm.validateFields();
      if (editingIndex) {
        // 编辑现有索引
        const newIndexes = [...indexes];
        const index = indexes.findIndex(i => i === editingIndex);
        if (index !== -1) {
          newIndexes[index] = { ...values };
          setIndexes(newIndexes);
        }
      } else {
        // 添加新索引
        setIndexes([...indexes, { ...values }]);
      }
      setIndexModalVisible(false);
      indexForm.resetFields();
      setEditingIndex(null);
    } catch (error) {
      console.error('索引表单验证失败:', error);
    }
  };

  // 处理外键对话框确认
  const handleForeignKeyModalOk = async () => {
    try {
      const values = await foreignKeyForm.validateFields();
      if (editingForeignKey) {
        // 编辑现有外键
        const newForeignKeys = [...foreignKeys];
        const index = foreignKeys.findIndex(fk => fk === editingForeignKey);
        if (index !== -1) {
          newForeignKeys[index] = { ...values };
          setForeignKeys(newForeignKeys);
        }
      } else {
        // 添加新外键
        setForeignKeys([...foreignKeys, { ...values }]);
      }
      setForeignKeyModalVisible(false);
      foreignKeyForm.resetFields();
      setEditingForeignKey(null);
    } catch (error) {
      console.error('外键表单验证失败:', error);
    }
  };

  // 处理保存对话框确认
  const handleSaveModalOk = async () => {
    try {
      const values = await saveForm.validateFields();
      console.log('保存表单数据:', values); // 添加日志
      await handleSaveTable(values);
    } catch (error) {
      console.error('保存表单验证失败:', error);
      if (error instanceof Error) {
        message.error(error.message);
      }
    }
  };

  // 根据当前标签页获取按钮状态
  const getButtonStates = () => {
    switch (activeTab) {
      case 'fields':
        return {
          addTooltip: '新增字段',
          addDisabled: false,
          deleteTooltip: '删除字段',
          deleteDisabled: selectedRowKeys.length === 0,
          insertTooltip: '插入字段',
          insertDisabled: selectedRowKeys.length === 0,
          handleAdd: handleAddField,
          handleDelete: () => handleDelete('fields'),
          handleInsert: () => handleInsertField(selectedRowKeys[0])
        };
      case 'indexes':
        return {
          addTooltip: '新增索引',
          addDisabled: false,
          deleteTooltip: '删除索引',
          deleteDisabled: selectedIndexRows.length === 0,
          insertTooltip: '插入索引',
          insertDisabled: true,
          handleAdd: handleAddIndex,
          handleDelete: () => handleDelete('indexes'),
          handleInsert: () => {}
        };
      case 'foreignKeys':
        return {
          addTooltip: '新增外键',
          addDisabled: false,
          deleteTooltip: '删除外键',
          deleteDisabled: selectedRowKeys.length === 0,
          insertTooltip: '插入外键',
          insertDisabled: true,
          handleAdd: handleAddForeignKey,
          handleDelete: () => handleDelete('foreignKeys'),
          handleInsert: () => {}
        };
      case 'triggers':
        return {
          addTooltip: '新增触发器',
          addDisabled: false,
          deleteTooltip: '删除触发器',
          deleteDisabled: selectedRowKeys.length === 0,
          insertTooltip: '插入触发器',
          insertDisabled: true,
          handleAdd: handleAddTrigger,
          handleDelete: () => handleDelete('triggers'),
          handleInsert: () => {}
        };
      default:
        return {
          addTooltip: '新增',
          addDisabled: true,
          deleteTooltip: '删除',
          deleteDisabled: true,
          insertTooltip: '插入',
          insertDisabled: true,
          handleAdd: () => {},
          handleDelete: () => {},
          handleInsert: () => {}
        };
    }
  };

  const tabItems: TabsProps['items'] = [
    {
      key: 'fields',
      label: '字段',
      children: (
        <>
          <table className="design-table">
            <thead>
              <tr>
                <th></th>
                <th>名称 <Tooltip title="字段名只能包含字母、数字和下划线，且不能以数字开头"><QuestionCircleOutlined /></Tooltip></th>
                <th>类型</th>
                <th>长度</th>
                <th>小数点</th>
                <th>不是 Null</th>
                <th>自增</th>
                <th>键</th>
                <th>默认值</th>
                <th>注释</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => (
                <tr 
                  key={index} 
                  className={selectedRowKeys.includes(index) ? 'selected-row' : ''} 
                  onClick={() => handleRowSelect(index)}
                >
                  <td>
                    <Checkbox 
                      checked={selectedRowKeys.includes(index)} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedRowKeys([...selectedRowKeys, index]);
                        } else {
                          setSelectedRowKeys(selectedRowKeys.filter(i => i !== index));
                        }
                        e.stopPropagation(); // 防止触发行点击事件
                      }} 
                    />
                  </td>
                  <td>
                    <Input 
                      value={field.name} 
                      onChange={e => handleFieldChange(index, 'name', e.target.value)} 
                      onClick={e => e.stopPropagation()} // 防止触发行点击事件
                      placeholder="字段名"
                      maxLength={60} // 大多数数据库的字段名长度限制
                    />
                  </td>
                  <td>
                    <Select 
                      style={{ width: '100%' }} 
                      value={field.type} 
                      onChange={value => handleFieldChange(index, 'type', value)}
                      onClick={e => e.stopPropagation()} // 防止触发行点击事件
                    >
                      {renderDataTypeOptions(dataTypes)}
                    </Select>
                  </td>
                  <td>
                    <Input 
                      value={field.length} 
                      onChange={e => {
                        // 只允许输入数字
                        const value = e.target.value.replace(/\D/g, '');
                        handleFieldChange(index, 'length', value ? parseInt(value) : undefined);
                      }}
                      disabled={!dataTypeDefinitions[field.type]?.supportsLength}
                      onClick={e => e.stopPropagation()} // 防止触发行点击事件
                      placeholder={dataTypeDefinitions[field.type]?.supportsLength ? "长度" : ""}
                    />
                  </td>
                  <td>
                    <Input 
                      value={field.decimal} 
                      onChange={e => {
                        // 只允许输入数字
                        const value = e.target.value.replace(/\D/g, '');
                        handleFieldChange(index, 'decimal', value ? parseInt(value) : undefined);
                      }}
                      disabled={!dataTypeDefinitions[field.type]?.supportsDecimal}
                      onClick={e => e.stopPropagation()} // 防止触发行点击事件
                      placeholder={dataTypeDefinitions[field.type]?.supportsDecimal ? "小数位" : ""}
                    />
                  </td>
                  <td>
                    <Switch 
                      checked={field.notNull} 
                      onChange={checked => handleFieldChange(index, 'notNull', checked)}
                    />
                  </td>
                  <td>
                    <Switch 
                      checked={field.autoIncrement} 
                      onChange={checked => handleFieldChange(index, 'autoIncrement', checked)}
                      disabled={!dataTypeDefinitions[field.type]?.supportsAutoIncrement}
                    />
                  </td>
                  <td>
                    <Switch 
                      checked={field.primaryKey} 
                      onChange={checked => handleFieldChange(index, 'primaryKey', checked)}
                    />
                  </td>
                  <td>
                    <div className="default-value-cell">
                      {field.type.toLowerCase() === 'int' || field.type.toLowerCase() === 'bigint' ? (
                        <Input 
                          value={field.defaultValue} 
                          onChange={e => {
                            // 允许输入负号和数字
                            const value = e.target.value.replace(/[^\d-]/g, '');
                            handleFieldChange(index, 'defaultValue', value);
                          }}
                          onClick={e => e.stopPropagation()}
                          placeholder="默认值"
                        />
                      ) : (
                        <Input 
                          value={field.defaultValue} 
                          onChange={e => handleFieldChange(index, 'defaultValue', e.target.value)}
                          onClick={e => e.stopPropagation()}
                          placeholder="默认值"
                        />
                      )}
                    </div>
                  </td>
                  <td>
                    <Input 
                      value={field.comment} 
                      onChange={e => handleFieldChange(index, 'comment', e.target.value)}
                      onClick={e => e.stopPropagation()} // 防止触发行点击事件
                      placeholder="注释"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )
    },
    {
      key: 'indexes',
      label: '索引',
      children: (
        <>
          <table className="design-table">
            <thead>
              <tr>
                <th></th>
                <th>名称</th>
                <th>字段</th>
                <th>索引类型</th>
                <th>索引方法</th>
                <th>注释</th>
              </tr>
            </thead>
            <tbody>
              {indexes.map((index, i) => (
                <tr 
                  key={i} 
                  className={selectedIndexRows.includes(i) ? 'selected-row' : ''}
                  onClick={() => handleIndexRowSelect(i)}
                >
                  <td>
                    <Checkbox 
                      checked={selectedIndexRows.includes(i)} 
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIndexRows([...selectedIndexRows, i]);
                        } else {
                          setSelectedIndexRows(selectedIndexRows.filter(idx => idx !== i));
                        }
                      }} 
                    />
                  </td>
                  <td>
                    <Input 
                      value={index.name} 
                      onChange={e => {
                        const newIndexes = [...indexes];
                        newIndexes[i].name = e.target.value;
                        setIndexes(newIndexes);
                      }}
                    />
                  </td>
                  <td>
                    <Select 
                      mode="multiple" 
                      style={{ width: '100%' }} 
                      value={index.columnNames}
                      onChange={value => {
                        const newIndexes = [...indexes];
                        newIndexes[i].columnNames = value;
                        setIndexes(newIndexes);
                      }}
                    >
                      {fields.map((field, index) => (
                        <Option key={index} value={field.name}>
                          {field.name}
                        </Option>
                      ))}
                    </Select>
                  </td>
                  <td>
                    <Select 
                      style={{ width: '100%' }} 
                      value={index.type}
                      onChange={value => {
                        const newIndexes = [...indexes];
                        newIndexes[i].type = value;
                        setIndexes(newIndexes);
                      }}
                    >
                      <Option value="BTREE">BTREE</Option>
                      <Option value="HASH">HASH</Option>
                    </Select>
                  </td>
                  <td>
                    <Select 
                      style={{ width: '100%' }} 
                      value={index.method}
                      onChange={value => {
                        const newIndexes = [...indexes];
                        newIndexes[i].method = value;
                        setIndexes(newIndexes);
                      }}
                    >
                      <Option value="NORMAL">NORMAL</Option>
                      <Option value="UNIQUE">UNIQUE</Option>
                      <Option value="FULLTEXT">FULLTEXT</Option>
                    </Select>
                  </td>
                  <td>
                    <Input 
                      value={index.comment}
                      onChange={e => {
                        const newIndexes = [...indexes];
                        newIndexes[i].comment = e.target.value;
                        setIndexes(newIndexes);
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )
    },
    {
      key: 'foreignKeys',
      label: '外键',
      children: (
        <>
          <table className="design-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>字段</th>
                <th>被引用的数据库</th>
                <th>被引用的表</th>
                <th>被引用的字段</th>
                <th>删除时</th>
                <th>更新时</th>
              </tr>
            </thead>
            <tbody>
              {foreignKeys.map((fk, i) => (
                <tr key={i}>
                  <td>
                    <Input 
                      value={fk.name} 
                      onChange={e => handleForeignKeyChange(i, 'name', e.target.value)}
                    />
                  </td>
                  <td>
                    <Select 
                      mode="multiple" 
                      style={{ width: '100%' }} 
                      value={fk.sourceColumns}
                      onChange={value => handleForeignKeyChange(i, 'sourceColumns', value)}
                    >
                      {fields.map((field, index) => (
                        <Option key={index} value={field.name}>
                          {field.name}
                        </Option>
                      ))}
                    </Select>
                  </td>
                  <td><Input value={databaseName} disabled /></td>
                  <td>
                    <Select 
                      style={{ width: '100%' }} 
                      value={fk.referenceTable}
                      onChange={value => handleForeignKeyChange(i, 'referenceTable', value)}
                    >
                      {/* 这里需要从API获取可用表列表 */}
                      <Option value="example_table">example_table</Option>
                    </Select>
                  </td>
                  <td>
                    <Select 
                      mode="multiple" 
                      style={{ width: '100%' }} 
                      value={fk.referenceColumns}
                      onChange={value => handleForeignKeyChange(i, 'referenceColumns', value)}
                    >
                      {/* 这里需要从API获取选中表的字段列表 */}
                      <Option value="id">id</Option>
                    </Select>
                  </td>
                  <td>
                    <Select 
                      style={{ width: '100%' }} 
                      value={fk.deleteRule}
                      onChange={value => handleForeignKeyChange(i, 'deleteRule', value)}
                    >
                      <Option value="NO ACTION">NO ACTION</Option>
                      <Option value="CASCADE">CASCADE</Option>
                      <Option value="SET NULL">SET NULL</Option>
                      <Option value="RESTRICT">RESTRICT</Option>
                    </Select>
                  </td>
                  <td>
                    <Select 
                      style={{ width: '100%' }} 
                      value={fk.updateRule}
                      onChange={value => handleForeignKeyChange(i, 'updateRule', value)}
                    >
                      <Option value="NO ACTION">NO ACTION</Option>
                      <Option value="CASCADE">CASCADE</Option>
                      <Option value="SET NULL">SET NULL</Option>
                      <Option value="RESTRICT">RESTRICT</Option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )
    },
    {
      key: 'triggers',
      label: '触发器',
      children: (
        <>
          <table className="design-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>时间</th>
                <th>事件</th>
                <th>语句</th>
                <th>注释</th>
              </tr>
            </thead>
            <tbody>
              {triggers.map((trigger, i) => (
                <tr key={i}>
                  <td>
                    <Input 
                      value={trigger.name} 
                      onChange={e => handleTriggerChange(i, 'name', e.target.value)}
                    />
                  </td>
                  <td>
                    <Select 
                      style={{ width: '100%' }} 
                      value={trigger.timing}
                      onChange={value => handleTriggerChange(i, 'timing', value)}
                    >
                      <Option value="BEFORE">BEFORE</Option>
                      <Option value="AFTER">AFTER</Option>
                    </Select>
                  </td>
                  <td>
                    <Select 
                      style={{ width: '100%' }} 
                      value={trigger.event}
                      onChange={value => handleTriggerChange(i, 'event', value)}
                    >
                      <Option value="INSERT">INSERT</Option>
                      <Option value="UPDATE">UPDATE</Option>
                      <Option value="DELETE">DELETE</Option>
                    </Select>
                  </td>
                  <td>
                    <Input.TextArea 
                      value={trigger.statement} 
                      onChange={e => handleTriggerChange(i, 'statement', e.target.value)}
                      rows={3}
                    />
                  </td>
                  <td>
                    <Input 
                      value={trigger.comment} 
                      onChange={e => handleTriggerChange(i, 'comment', e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )
    },
    {
      key: 'checks',
      label: '检查',
      children: (
        <>
          <table className="design-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>表达式</th>
                <th>不强制实施</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><Input /></td>
                <td><Input /></td>
                <td><Switch /></td>
              </tr>
            </tbody>
          </table>
        </>
      )
    },
    {
      key: 'options',
      label: '选项',
      children: (
        <>
          <div className="options-form">
            <Form layout="vertical">
              <Form.Item label="引擎">
                <Select style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="表空间">
                <Select style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="默认字符集">
                <Select style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="默认排序规则">
                <Select style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="平均行长度">
                <Input type="number" defaultValue="0" />
              </Form.Item>
              <Form.Item label="最小行数">
                <Input type="number" defaultValue="0" />
              </Form.Item>
              <Form.Item label="最大行数">
                <Input type="number" defaultValue="0" />
              </Form.Item>
              <Form.Item label="键块大小">
                <Input type="number" defaultValue="0" />
              </Form.Item>
              <Form.Item label="行格式">
                <Select style={{ width: '100%' }} />
              </Form.Item>
              <Button>分区</Button>
            </Form>
          </div>
        </>
      )
    },
    {
      key: 'comments',
      label: '注释',
      children: (
        <>
          <Form layout="vertical">
            <Form.Item label="表注释">
              <Input.TextArea rows={4} />
            </Form.Item>
          </Form>
        </>
      )
    },
    {
      key: 'sqlPreview',
      label: 'SQL预览',
      children: (
        <>
          <Input.TextArea
            className="sql-preview"
            readOnly
            value={generateSqlPreview()}
            rows={12}
          />
        </>
      )
    },
  ];

  return (
    <div className="table-designer">
      <div className="table-designer-header">
        <div className="toolbar">
          <Tooltip title="保存">
            <Button
              type="text"
              icon={<SaveOutlined />}
              onClick={handleSave}
            />
          </Tooltip>
          <Divider type="vertical" />
          {(() => {
            const buttonStates = getButtonStates();
            return (
              <>
                <Tooltip title={buttonStates.addTooltip}>
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={buttonStates.handleAdd}
                    disabled={buttonStates.addDisabled}
                  />
                </Tooltip>
                <Tooltip title={buttonStates.deleteTooltip}>
                  <Button
                    type="text"
                    icon={<DeleteOutlined />}
                    onClick={buttonStates.handleDelete}
                    disabled={buttonStates.deleteDisabled}
                  />
                </Tooltip>
                <Tooltip title={buttonStates.insertTooltip}>
                  <Button
                    type="text"
                    icon={<VerticalAlignMiddleOutlined />}
                    onClick={buttonStates.handleInsert}
                    disabled={buttonStates.insertDisabled}
                  />
                </Tooltip>
              </>
            );
          })()}
        </div>
        <div className="header-right">
          <span className="database-info">
            {databaseName} / {databaseType}
          </span>
          <Button 
            type="text"
            icon={<CloseOutlined />}
            onClick={onClose}
          />
        </div>
      </div>

      <div className="table-designer-content">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </div>

      {/* 保存对话框 */}
      <Modal
        title="保存表"
        open={saveModalVisible}
        onOk={handleSaveModalOk}
        onCancel={() => {
          setSaveModalVisible(false);
          saveForm.resetFields();
        }}
        destroyOnClose
      >
        <Form
          form={saveForm}
          layout="vertical"
          initialValues={{ tableName: '', comment: '' }}
        >
          <Form.Item
            label="表名"
            name="tableName"
            rules={[
              { required: true, message: '请输入表名' },
              { pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/, message: '表名只能包含字母、数字和下划线，且不能以数字开头' }
            ]}
          >
            <Input placeholder="请输入表名" />
          </Form.Item>
          <Form.Item
            label="表注释"
            name="comment"
          >
            <Input.TextArea rows={4} placeholder="请输入表注释" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 字段编辑对话框 */}
      <Modal
        title={editingField ? "编辑字段" : "新增字段"}
        open={fieldModalVisible}
        onOk={handleFieldModalOk}
        onCancel={() => setFieldModalVisible(false)}
      >
        <Form
          form={fieldForm}
          layout="vertical"
          initialValues={editingField || {
            name: '',
            type: 'varchar',
            length: 255,
            nullable: true,
            defaultValue: '',
            comment: ''
          }}
        >
          <Form.Item
            label="字段名"
            name="name"
            rules={[{ required: true, message: '请输入字段名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="数据类型"
            name="type"
            rules={[{ required: true, message: '请选择数据类型' }]}
          >
            <Select>
              {dataTypes.map(type => (
                <Select.Option key={type} value={type}>{type}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="长度"
            name="length"
            rules={[{ required: true, message: '请输入长度' }]}
          >
            <InputNumber min={1} />
          </Form.Item>
          <Form.Item
            label="允许为空"
            name="nullable"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            label="默认值"
            name="defaultValue"
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="注释"
            name="comment"
          >
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 索引编辑对话框 */}
      <Modal
        title={editingIndex ? "编辑索引" : "新增索引"}
        open={indexModalVisible}
        onOk={handleIndexModalOk}
        onCancel={() => setIndexModalVisible(false)}
      >
        <Form
          form={indexForm}
          layout="vertical"
          initialValues={editingIndex || {
            name: '',
            type: 'normal',
            columns: []
          }}
        >
          <Form.Item
            label="索引名"
            name="name"
            rules={[{ required: true, message: '请输入索引名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="索引类型"
            name="type"
            rules={[{ required: true, message: '请选择索引类型' }]}
          >
            <Select>
              <Select.Option value="normal">普通索引</Select.Option>
              <Select.Option value="unique">唯一索引</Select.Option>
              <Select.Option value="fulltext">全文索引</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="索引列"
            name="columns"
            rules={[{ required: true, message: '请选择索引列' }]}
          >
            <Select mode="multiple">
              {fields.map((field, index) => (
                <Select.Option key={index} value={field.name}>
                  {field.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* 外键编辑对话框 */}
      <Modal
        title={editingForeignKey ? "编辑外键" : "新增外键"}
        open={foreignKeyModalVisible}
        onOk={handleForeignKeyModalOk}
        onCancel={() => setForeignKeyModalVisible(false)}
      >
        <Form
          form={foreignKeyForm}
          layout="vertical"
          initialValues={editingForeignKey || {
            name: '',
            columns: [],
            referenceTable: '',
            referenceColumns: [],
            onDelete: 'RESTRICT',
            onUpdate: 'RESTRICT'
          }}
        >
          <Form.Item
            label="外键名"
            name="name"
            rules={[{ required: true, message: '请输入外键名' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="外键列"
            name="columns"
            rules={[{ required: true, message: '请选择外键列' }]}
          >
            <Select mode="multiple">
              {fields.map((field, index) => (
                <Select.Option key={index} value={field.name}>
                  {field.name}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="引用表"
            name="referenceTable"
            rules={[{ required: true, message: '请选择引用表' }]}
          >
            <Select>
              {tables.map(table => (
                <Select.Option key={table} value={table}>
                  {table}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="引用列"
            name="referenceColumns"
            rules={[{ required: true, message: '请选择引用列' }]}
          >
            <Select mode="multiple">
              {referenceFields.map(field => (
                <Select.Option key={field} value={field}>
                  {field}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            label="删除时"
            name="onDelete"
            rules={[{ required: true, message: '请选择删除时的行为' }]}
          >
            <Select>
              <Select.Option value="RESTRICT">RESTRICT</Select.Option>
              <Select.Option value="CASCADE">CASCADE</Select.Option>
              <Select.Option value="SET NULL">SET NULL</Select.Option>
              <Select.Option value="NO ACTION">NO ACTION</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            label="更新时"
            name="onUpdate"
            rules={[{ required: true, message: '请选择更新时的行为' }]}
          >
            <Select>
              <Select.Option value="RESTRICT">RESTRICT</Select.Option>
              <Select.Option value="CASCADE">CASCADE</Select.Option>
              <Select.Option value="SET NULL">SET NULL</Select.Option>
              <Select.Option value="NO ACTION">NO ACTION</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TableDesigner; 