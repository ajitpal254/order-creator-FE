import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrderProvider } from './context/OrderContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { PageLoader } from './components/PageLoader';
import { NotFound } from './pages/NotFound';

// Eager: common landing + auth paths
import { Home } from './pages/Home';
import { CatalogPage } from './pages/catalog/CatalogPage';
import { LoginPage } from './pages/auth/LoginPage';
import { SignupPage } from './pages/auth/SignupPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Lazy: heavy, less frequently visited routes (FE-06 code splitting)
const OrderCreatorPage = lazy(() =>
  import('./pages/order/OrderCreatorPage').then((m) => ({ default: m.OrderCreatorPage }))
);
const MyOrdersPage = lazy(() =>
  import('./pages/orders/MyOrdersPage').then((m) => ({ default: m.MyOrdersPage }))
);
const AdminDashboard = lazy(() =>
  import('./pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard }))
);

// Route Guard for Authenticated Users
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

// Route Guard for Admin Only
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <OrderProvider>
          <div className="app-wrapper">
            <Navbar />
            <main className="main-content">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/catalog" element={<CatalogPage />} />
                  <Route path="/order-creator" element={<OrderCreatorPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />

                  {/* Protected Buyer Routes */}
                  <Route
                    path="/my-orders"
                    element={
                      <ProtectedRoute>
                        <MyOrdersPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Protected Admin Routes */}
                  <Route
                    path="/admin"
                    element={
                      <AdminRoute>
                        <AdminDashboard />
                      </AdminRoute>
                    }
                  />

                  {/* Fallback: real 404 page (FE-16) */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
          </div>
        </OrderProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
