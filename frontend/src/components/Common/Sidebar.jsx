import { NavLink } from 'react-router-dom';
import {
  HomeIcon,
  UsersIcon,
  CubeIcon,
  ShoppingCartIcon,
  ArchiveBoxIcon,
  BanknotesIcon,
  ChartBarIcon,
  LifebuoyIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  CreditCardIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import useAuth from '../../hooks/useAuth.js';

const adminLinks = [
  { to: '/admin/dashboard',  label: 'Dashboard',      Icon: HomeIcon },
  { to: '/admin/customers',  label: 'Customers',       Icon: UsersIcon },
  { to: '/admin/products',   label: 'Products',        Icon: CubeIcon },
  { to: '/admin/orders',     label: 'Orders',          Icon: ShoppingCartIcon },
  { to: '/admin/inventory',  label: 'Inventory',       Icon: ArchiveBoxIcon },
  { to: '/admin/financial',  label: 'Financial Hub',   Icon: BanknotesIcon },
  { to: '/admin/reports',    label: 'Reports',         Icon: ChartBarIcon },
  { to: '/admin/support',    label: 'Support',         Icon: LifebuoyIcon },
];

const clientLinks = [
  { to: '/client/dashboard',  label: 'Dashboard',        Icon: HomeIcon },
  { to: '/client/products',   label: 'Browse Products',  Icon: MagnifyingGlassIcon },
  { to: '/client/inquiries',  label: 'Inquiries',        Icon: DocumentTextIcon },
  { to: '/client/orders',     label: 'My Orders',        Icon: ShoppingCartIcon },
  { to: '/client/invoices',   label: 'Invoices',         Icon: DocumentTextIcon },
  { to: '/client/payments',   label: 'Payments',         Icon: CreditCardIcon },
  { to: '/client/support',    label: 'Support',          Icon: LifebuoyIcon },
];

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const links = user?.role === 'admin' ? adminLinks : clientLinks;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-in-out
          lg:static lg:translate-x-0 lg:flex lg:flex-col
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile close button */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 lg:hidden">
          <span className="font-bold text-teal-700">Menu</span>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Brand (desktop) */}
        <div className="hidden lg:flex items-center gap-3 px-5 py-5 border-b border-gray-200">
          <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-base">V</span>
          </div>
          <div>
            <p className="text-base font-bold text-gray-900">
              Vital<span className="text-teal-600">MEDS</span>
            </p>
            <p className="text-xs text-gray-500 capitalize">{user?.role} Portal</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-0.5">
          <p className="px-3 pt-2 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Navigation
          </p>
          {links.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : ''}`
              }
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-teal-700 font-semibold text-sm">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-800 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
