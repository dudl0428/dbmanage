import React, { useState } from 'react';
import { Form, Input, Button, Tabs, message, Modal, Select } from 'antd';
import { DatabaseOutlined } from '@ant-design/icons';
import './style.css';

interface ConnectionFormProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (values: any) => void;
}

const { Option } = Select;

const DATABASE_TYPES = [
  { value: 'mysql', label: 'MySQL' },
  { value: 'mariadb', label: 'MariaDB' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'oracle', label: 'Oracle' },
  { value: 'sqlserver', label: 'SQL Server' },
] as const;

type DatabaseType = typeof DATABASE_TYPES[number]['value'];

const DEFAULT_PORTS: Record<DatabaseType, string> = {
  mysql: '3306',
  mariadb: '3306',
  postgresql: '5432',
  oracle: '1521',
  sqlserver: '1433',
};

const ConnectionForm: React.FC<ConnectionFormProps> = ({ visible, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const handleDatabaseTypeChange = (value: DatabaseType) => {
    form.setFieldsValue({ port: DEFAULT_PORTS[value] });
  };

  const handleTest = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      // TODO: 实现测试连接逻辑
      message.success('连接测试成功');
    } catch (error) {
      message.error('请填写完整的连接信息');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      await onSave(values);
      message.success('保存成功');
      onCancel();
    } catch (error) {
      message.error('请填写完整的连接信息');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      className="connection-modal"
      width={600}
    >
      <div className="connection-form">
        <div className="connection-header">
          <div className="connection-logo">
            <DatabaseOutlined className="database-icon" />
            <span className="connection-title">新建连接</span>
          </div>
        </div>
        
        <div className="connection-tabs">
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <Tabs.TabPane tab="基本设置" key="basic">
              <Form
                form={form}
                layout="vertical"
                className="connection-basic-form"
                preserve={false}
                initialValues={{
                  type: 'mysql',
                  port: DEFAULT_PORTS.mysql
                }}
              >
                <Form.Item
                  label="数据库类型"
                  name="type"
                  rules={[{ required: true, message: '请选择数据库类型' }]}
                >
                  <Select onChange={handleDatabaseTypeChange}>
                    {DATABASE_TYPES.map(type => (
                      <Option key={type.value} value={type.value}>{type.label}</Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item
                  label="连接名称"
                  name="name"
                  rules={[{ required: true, message: '请输入连接名称' }]}
                >
                  <Input placeholder="请输入连接名称" />
                </Form.Item>
                
                <Form.Item
                  label="主机"
                  name="host"
                  rules={[{ required: true, message: '请输入主机地址' }]}
                >
                  <Input placeholder="localhost" />
                </Form.Item>
                
                <Form.Item
                  label="端口"
                  name="port"
                  rules={[{ required: true, message: '请输入端口号' }]}
                >
                  <Input />
                </Form.Item>
                
                <Form.Item
                  label="用户名"
                  name="username"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input placeholder="root" />
                </Form.Item>
                
                <Form.Item
                  label="密码"
                  name="password"
                >
                  <Input.Password placeholder="请输入密码" />
                </Form.Item>
              </Form>
            </Tabs.TabPane>
            <Tabs.TabPane tab="高级设置" key="advanced">
              <Form
                form={form}
                layout="vertical"
                className="connection-basic-form"
              >
                <Form.Item
                  label="连接超时(秒)"
                  name="timeout"
                  initialValue={30}
                >
                  <Input type="number" min={1} />
                </Form.Item>
              </Form>
            </Tabs.TabPane>
            <Tabs.TabPane tab="SSL" key="ssl">
              <Form
                form={form}
                layout="vertical"
                className="connection-basic-form"
              >
                <Form.Item
                  label="SSL模式"
                  name="sslMode"
                  initialValue="disable"
                >
                  <Select>
                    <Option value="disable">禁用</Option>
                    <Option value="require">必需</Option>
                    <Option value="verify-ca">验证CA</Option>
                    <Option value="verify-full">完全验证</Option>
                  </Select>
                </Form.Item>
              </Form>
            </Tabs.TabPane>
            <Tabs.TabPane tab="SSH" key="ssh">
              <Form
                form={form}
                layout="vertical"
                className="connection-basic-form"
              >
                <Form.Item
                  label="SSH主机"
                  name="sshHost"
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label="SSH端口"
                  name="sshPort"
                  initialValue="22"
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label="SSH用户名"
                  name="sshUsername"
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label="SSH密码"
                  name="sshPassword"
                >
                  <Input.Password />
                </Form.Item>
              </Form>
            </Tabs.TabPane>
          </Tabs>
        </div>
        
        <div className="connection-footer">
          <Button onClick={handleTest} loading={loading}>
            测试连接
          </Button>
          <div className="right-buttons">
            <Button onClick={onCancel}>
              取消
            </Button>
            <Button type="primary" onClick={handleSave} loading={loading}>
              保存
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConnectionForm; 