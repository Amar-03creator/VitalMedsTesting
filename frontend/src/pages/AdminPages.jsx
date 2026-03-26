import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Common/Navbar.jsx';
import Sidebar from '../components/Common/Sidebar.jsx';

export default function AdminPages() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-col flex-1 overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(v => !v)} />

        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
