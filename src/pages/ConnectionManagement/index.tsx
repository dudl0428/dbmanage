import React, { useState, useEffect } from 'react';
import { Layout, Card, Button, message, Modal, Form, Input, Select, InputNumber } from 'antd';
import { PlusOutlined, DatabaseOutlined } from '@ant-design/icons';
import ConnectionTree from '../../components/ConnectionTree';
import ConnectionService, { 
  ConnectionResponse, 
  ConnectionRequest,
  ConnectionTestRequest
} from '../../services/connectionService';
import './style.css';

const { Content, Sider } = Layout;
const { Option } = Select;

// 数据库类型
const DB_TYPES = [
  { label: 'MySQL', value: 'mysql', defaultPort: 3306 },
  { label: 'PostgreSQL', value: 'postgresql', defaultPort: 5432 },
  { label: 'SQLite', value: 'sqlite', defaultPort: null },
  { label: 'SQL Server', value: 'sqlserver', defaultPort: 1433 },
  { label: 'Oracle', value: 'oracle', defaultPort: 1521 },
];

interface ConnectionManagementProps {
  visible?: boolean;
  onClose?: () => void;
}

const ConnectionManagement: React.FC<ConnectionManagementProps> = ({ visible, onClose }) => {
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('新建连接');
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [editingConnection, setEditingConnection] = useState<ConnectionResponse | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<ConnectionResponse | null>(null);
  const [selectedDatabase, setSelectedDatabase] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [form] = Form.useForm();

  // 当选择数据库类型时自动设置默认端口
  const handleDbTypeChange = (value: string) => {
    const selectedType = DB_TYPES.find(type => type.value === value);
    if (selectedType && selectedType.defaultPort) {
      form.setFieldsValue({ port: selectedType.defaultPort });
    }
  };

  // 处理连接选择
  const handleSelectConnection = (connection: ConnectionResponse) => {
    setSelectedConnection(connection);
    setSelectedDatabase(null);
    setSelectedTable(null);
  };

  // 处理数据库选择
  const handleSelectDatabase = (database: string, connectionId: number) => {
  //  setSelectedDatabase(database);
    setSelectedTable(database);
  };

  // 处理表选择
  const handleSelectTable = (table: string, database: string, connectionId: number) => {
    setSelectedTable(table);
  };

  // 打开新建连接模态框
  const showCreateModal = () => {
    setEditingConnection(null);
    setModalTitle('新建连接');
    form.resetFields();
    // 设置默认值
    form.setFieldsValue({
      type: 'mysql',
      port: 3306
    });
    setModalVisible(true);
  };

  // 打开编辑连接模态框
  const showEditModal = (connection: ConnectionResponse) => {
    setEditingConnection(connection);
    setModalTitle('编辑连接');
    form.resetFields();
    form.setFieldsValue({
      name: connection.name,
      type: connection.type,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      username: connection.username,
      // 为安全考虑，密码不回填
      password: '********',
      parameters: connection.parameters
    });
    setModalVisible(true);
  };

  // 测试连接
  const handleTestConnection = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      setTestLoading(true);
      
      const testData: ConnectionTestRequest = {
        type: values.type,
        host: values.host,
        port: values.port,
        database: values.database || '',
        username: values.username,
        password: values.password,
        parameters: values.parameters
      };
      
      const result = await ConnectionService.testConnection(testData);
      
      if (result.success) {
        message.success('连接测试成功');
      } else {
        message.error(`连接测试失败: ${result.message}`);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
      message.error('请填写所有必填字段');
    } finally {
      setTestLoading(false);
    }
  };

  // 保存连接
  const handleSaveConnection = async () => {
    try {
      await form.validateFields();
      const values = form.getFieldsValue();
      
      setLoading(true);
      
      const connectionData: ConnectionRequest = {
        name: values.name,
        type: values.type,
        host: values.host,
        port: values.port,
        database: values.database || '',
        username: values.username,
        password: values.password,
        parameters: values.parameters
      };
      
      if (editingConnection) {
        // 更新现有连接
        await ConnectionService.updateConnection(editingConnection.id, connectionData);
        message.success('连接已更新');
      } else {
        // 创建新连接
        await ConnectionService.createConnection(connectionData);
        message.success('连接已创建');
      }
      
      setModalVisible(false);
      // 刷新连接列表
      // 通过重新渲染ConnectionTree组件来实现
      if (onClose) {
        onClose();
      }
      
    } catch (error) {
      console.error('保存连接错误:', error);
      message.error('保存连接失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除连接
  const handleDeleteConnection = async (connection: ConnectionResponse) => {
    Modal.confirm({
      title: '删除连接',
      content: `确定要删除连接 "${connection.name}" 吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true);
          await ConnectionService.deleteConnection(connection.id);
          message.success('连接已删除');
          
          // 如果删除的是当前选中的连接，清除选中状态
          if (selectedConnection && selectedConnection.id === connection.id) {
            setSelectedConnection(null);
            setSelectedDatabase(null);
            setSelectedTable(null);
          }
          
          // 刷新连接列表
          // 通过重新渲染ConnectionTree组件来实现
          
        } catch (error) {
          console.error('删除连接错误:', error);
          message.error('删除连接失败');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  // 作为独立页面渲染
  if (!visible) {
    return (
      <Layout className="connection-management">
        <Sider 
          width={280} 
          collapsible 
          collapsed={siderCollapsed}
          onCollapse={setSiderCollapsed}
          className="connection-sider"
        >
          <ConnectionTree 
            onSelectConnection={handleSelectConnection}
            onSelectDatabase={handleSelectDatabase}
            onSelectTable={handleSelectTable}
            onAddConnection={showCreateModal}
          />
        </Sider>
        <Content className="connection-content">
          {selectedConnection ? (
            // 显示选中的连接/数据库/表信息
            <Card 
              title={selectedConnection.name}
              extra={
                <div>
                  <Button 
                    type="link" 
                    onClick={() => showEditModal(selectedConnection)}
                  >
                    编辑
                  </Button>
                  <Button 
                    type="link" 
                    danger
                    onClick={() => handleDeleteConnection(selectedConnection)}
                  >
                    删除
                  </Button>
                </div>
              }
            >
              <div className="connection-details">
                <p><strong>类型:</strong> {selectedConnection.type}</p>
                <p><strong>主机:</strong> {selectedConnection.host}</p>
                <p><strong>端口:</strong> {selectedConnection.port}</p>
                <p><strong>数据库:</strong> {selectedConnection.database}</p>
                <p><strong>用户名:</strong> {selectedConnection.username}</p>
                {selectedDatabase && (
                  <div className="selected-database">
                    <h3>当前数据库: {selectedDatabase}</h3>
                    {selectedTable && <p>当前表: {selectedTable}</p>}
                  </div>
                )}
              </div>
            </Card>
          ) : (
            // 显示空状态
            <div className="empty-state">
              <DatabaseOutlined className="empty-icon" />
              <h2>数据库管理</h2>
              <p>请选择一个连接或创建新连接</p>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={showCreateModal}
              >
                新建连接
              </Button>
            </div>
          )}
        </Content>

        {/* 新建/编辑连接模态框 */}
        <Modal
          title={modalTitle}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={[
            <Button key="test" onClick={handleTestConnection} loading={testLoading}>
              测试连接
            </Button>,
            <Button key="cancel" onClick={() => setModalVisible(false)}>
              取消
            </Button>,
            <Button key="save" type="primary" onClick={handleSaveConnection} loading={loading}>
              保存
            </Button>,
          ]}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{
              type: 'mysql',
              port: 3306
            }}
          >
            <Form.Item
              name="name"
              label="连接名称"
              rules={[{ required: true, message: '请输入连接名称' }]}
            >
              <Input placeholder="例如: 本地MySQL" />
            </Form.Item>

            <Form.Item
              name="type"
              label="数据库类型"
              rules={[{ required: true, message: '请选择数据库类型' }]}
            >
              <Select onChange={handleDbTypeChange}>
                {DB_TYPES.map(type => (
                  <Option key={type.value} value={type.value}>{type.label}</Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="host"
              label="主机"
              rules={[{ required: true, message: '请输入主机地址' }]}
            >
              <Input placeholder="例如: localhost 或 127.0.0.1" />
            </Form.Item>

            <Form.Item
              name="port"
              label="端口"
              rules={[{ required: true, message: '请输入端口号' }]}
            >
              <InputNumber min={1} max={65535} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              name="database"
              label="数据库名"
            >
              <Input placeholder="默认数据库名称 (可选)" />
            </Form.Item>

            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input placeholder="数据库用户名" />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password placeholder="数据库密码" />
            </Form.Item>

            <Form.Item
              name="parameters"
              label="附加参数"
            >
              <Input placeholder="例如: charset=utf8&useSSL=false (可选)" />
            </Form.Item>
          </Form>
        </Modal>
      </Layout>
    );
  }

  // 作为模态框渲染
  return (
    <Modal
      title="新建数据库连接"
      open={visible}
      onCancel={onClose}
      footer={null} // 使用模态框中的按钮组
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          type: 'mysql',
          port: 3306
        }}
      >
        <Form.Item
          name="name"
          label="连接名称"
          rules={[{ required: true, message: '请输入连接名称' }]}
        >
          <Input placeholder="例如: 本地MySQL" />
        </Form.Item>

        <Form.Item
          name="type"
          label="数据库类型"
          rules={[{ required: true, message: '请选择数据库类型' }]}
        >
          <Select onChange={handleDbTypeChange}>
            {DB_TYPES.map(type => (
              <Option key={type.value} value={type.value}>{type.label}</Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          name="host"
          label="主机"
          rules={[{ required: true, message: '请输入主机地址' }]}
        >
          <Input placeholder="例如: localhost 或 127.0.0.1" />
        </Form.Item>

        <Form.Item
          name="port"
          label="端口"
          rules={[{ required: true, message: '请输入端口号' }]}
        >
          <InputNumber min={1} max={65535} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="database"
          label="数据库名"
        >
          <Input placeholder="默认数据库名称 (可选)" />
        </Form.Item>

        <Form.Item
          name="username"
          label="用户名"
          rules={[{ required: true, message: '请输入用户名' }]}
        >
          <Input placeholder="数据库用户名" />
        </Form.Item>

        <Form.Item
          name="password"
          label="密码"
          rules={[{ required: true, message: '请输入密码' }]}
        >
          <Input.Password placeholder="数据库密码" />
        </Form.Item>

        <Form.Item
          name="parameters"
          label="附加参数"
        >
          <Input placeholder="例如: charset=utf8&useSSL=false (可选)" />
        </Form.Item>

        <div style={{ textAlign: 'right', marginTop: '16px' }}>
          <Button 
            onClick={handleTestConnection} 
            loading={testLoading}
            style={{ marginRight: '8px' }}
          >
            测试连接
          </Button>
          <Button
            onClick={onClose}
            style={{ marginRight: '8px' }}
          >
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleSaveConnection}
            loading={loading}
          >
            保存
          </Button>
        </div>
      </Form>
    </Modal>
  );
};

export default ConnectionManagement; 