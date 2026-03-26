import { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now().toString();
    const newNotif = {
      id,
      read:      false,
      createdAt: new Date(),
      ...notification,
    };
    setNotifications(prev => [newNotif, ...prev]);

    switch (notification.type) {
      case 'success': toast.success(notification.message); break;
      case 'error':   toast.error(notification.message);   break;
      case 'warning':
        toast(notification.message, { icon: '⚠️' });
        break;
      default:
        toast(notification.message, { icon: '🔔' });
    }
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        removeNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotificationContext must be used within NotificationProvider');
  return ctx;
}

export default NotificationContext;
