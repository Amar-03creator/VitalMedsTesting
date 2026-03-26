import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { CartProvider } from './context/CartContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';

import Login from './components/Auth/Login.jsx';
import Register from './components/Auth/Register.jsx';

import AdminPages from './pages/AdminPages.jsx';
import ClientPages from './pages/ClientPages.jsx';
import NotFound from './pages/NotFound.jsx';
import Unauthorized from './pages/Unauthorized.jsx';

import AdminDashboard from './components/Admin/Dashboard.jsx';
import CustomerManagement from './components/Admin/CustomerManagement.jsx';
import ProductManagement from './components/Admin/ProductManagement.jsx';
import OrderManagement from './components/Admin/OrderManagement.jsx';
import InventoryManagement from './components/Admin/InventoryManagement.jsx';
import FinancialHub from './components/Admin/FinancialHub.jsx';
import ReportGeneration from './components/Admin/ReportGeneration.jsx';
import SupportManagement from './components/Admin/SupportManagement.jsx';

import ClientDashboard from './components/Client/Dashboard.jsx';
import ProductBrowse from './components/Client/ProductBrowse.jsx';
import CreateInquiry from './components/Client/CreateInquiry.jsx';
import OrderHistory from './components/Client/OrderHistory.jsx';
import InvoiceView from './components/Client/InvoiceView.jsx';
import PaymentTracking from './components/Client/PaymentTracking.jsx';
import SupportTicket from './components/Client/SupportTicket.jsx';

import ProtectedRoute from './components/Common/ProtectedRoute.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <NotificationProvider>
            <Routes>
              {/* Public */}
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/unauthorized" element={<Unauthorized />} />

              {/* Admin */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute role="admin">
                    <AdminPages />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard"  element={<AdminDashboard />} />
                <Route path="customers"  element={<CustomerManagement />} />
                <Route path="products"   element={<ProductManagement />} />
                <Route path="orders"     element={<OrderManagement />} />
                <Route path="inventory"  element={<InventoryManagement />} />
                <Route path="financial"  element={<FinancialHub />} />
                <Route path="reports"    element={<ReportGeneration />} />
                <Route path="support"    element={<SupportManagement />} />
              </Route>

              {/* Client */}
              <Route
                path="/client"
                element={
                  <ProtectedRoute role="client">
                    <ClientPages />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard"  element={<ClientDashboard />} />
                <Route path="products"   element={<ProductBrowse />} />
                <Route path="inquiries"  element={<CreateInquiry />} />
                <Route path="orders"     element={<OrderHistory />} />
                <Route path="invoices"   element={<InvoiceView />} />
                <Route path="payments"   element={<PaymentTracking />} />
                <Route path="support"    element={<SupportTicket />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </NotificationProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
