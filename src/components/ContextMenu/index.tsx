import React, { useEffect, useState, useRef } from 'react';
import { Menu } from 'antd';
import './style.css';

export interface ContextMenuItem {
  key: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  children?: ContextMenuItem[];
  onClick?: () => void;
}

interface ContextMenuProps {
  items: ContextMenuItem[];
  visible: boolean;
  x: number;
  y: number;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ items, visible, x, y, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  // 处理点击菜单外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // 处理窗口大小调整
    const handleResize = () => {
      onClose();
    };

    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', handleResize);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [visible, onClose]);

  // 调整位置，避免菜单超出视窗
  useEffect(() => {
    if (visible && menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > windowWidth) {
        adjustedX = windowWidth - rect.width;
      }

      if (y + rect.height > windowHeight) {
        adjustedY = windowHeight - rect.height;
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [visible, x, y]);

  if (!visible) return null;

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{
        position: 'fixed',
        top: position.y,
        left: position.x,
        zIndex: 1000,
      }}
    >
      <Menu
        items={items}
        onClick={({ key, domEvent }) => {
          // 阻止事件冒泡
          domEvent.stopPropagation();
          // 查找并执行点击回调
          const findAndExecute = (items: ContextMenuItem[]) => {
            for (const item of items) {
              if (item.key === key && item.onClick) {
                item.onClick();
                return true;
              }
              if (item.children && findAndExecute(item.children)) {
                return true;
              }
            }
            return false;
          };
          
          findAndExecute(items);
          onClose();
        }}
      />
    </div>
  );
};

export default ContextMenu; 