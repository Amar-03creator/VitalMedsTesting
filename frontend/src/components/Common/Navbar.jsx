import { Fragment, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Transition } from '@headlessui/react';
import {
  BellIcon,
  ChevronDownIcon,
  ArrowRightOnRectangleIcon,
  UserCircleIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';
import useAuth from '../../hooks/useAuth.js';
import { useNotificationContext } from '../../context/NotificationContext.jsx';

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { notifications, unreadCount, markAllAsRead } = useNotificationContext();
  const navigate = useNavigate();
  const [showNotifs, setShowNotifs] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleColors = {
    admin:  'bg-purple-100 text-purple-700',
    client: 'bg-teal-100 text-teal-700',
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6">
        {/* Left: hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 lg:hidden"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <Link to="/" className="flex items-center gap-2 select-none">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">V</span>
            </div>
            <span className="hidden sm:block text-xl font-bold text-gray-900">
              Vital<span className="text-teal-600">MEDS</span>
            </span>
          </Link>
        </div>

        {/* Right: notifications + user menu */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifs(v => !v); if (unreadCount > 0) markAllAsRead(); }}
              className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              aria-label="Notifications"
            >
              <BellIcon className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                <div className="p-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="font-semibold text-sm text-gray-800">Notifications</span>
                  <button onClick={() => setShowNotifs(false)} className="text-xs text-teal-600 hover:underline">
                    Close
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto scrollbar-thin">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500 text-center">No notifications</p>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-gray-50 text-sm ${n.read ? 'text-gray-500' : 'text-gray-800 bg-teal-50/40'}`}>
                        <p className="font-medium">{n.title || 'Notification'}</p>
                        <p className="text-xs mt-0.5">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User menu */}
          <Menu as="div" className="relative">
            <Menu.Button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <UserCircleIcon className="w-7 h-7 text-gray-400" />
              <div className="hidden sm:block text-left">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.name || 'User'}</p>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${roleColors[user?.role] || 'bg-gray-100 text-gray-600'}`}>
                  {user?.role || 'user'}
                </span>
              </div>
              <ChevronDownIcon className="w-4 h-4 text-gray-400 hidden sm:block" />
            </Menu.Button>

            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-200 z-50 focus:outline-none">
                <div className="p-1">
                  <div className="px-3 py-2 border-b border-gray-100 mb-1">
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${active ? 'bg-gray-50' : ''}`}
                      >
                        <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
                        Account Settings
                      </button>
                    )}
                  </Menu.Item>
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-600 ${active ? 'bg-red-50' : ''}`}
                      >
                        <ArrowRightOnRectangleIcon className="w-4 h-4" />
                        Sign out
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
}
