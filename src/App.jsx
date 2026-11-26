import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient.js';
import { AuthProvider, useAuth } from './context/AuthContext';
import { OrderProvider } from './context/OrderContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AssistantWidget } from './components/assistant/AssistantWidget';
import { InstallBanner } from './components/InstallBanner';
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
const ReportsPage = lazy(() =>
  import('./pages/admin/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const BuyerDashboard = lazy(() =>
  import('./pages/buyer/BuyerDashboard').then((m) => ({ default: m.BuyerDashboard }))
);
const SettingsPage = lazy(() =>
  import('./pages/settings/SettingsPage').then((m) => ({ default: m.SettingsPage }))
);
const TrackPage = lazy(() =>
  import('./pages/track/TrackPage').then((m) => ({ default: m.TrackPage }))
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
    <QueryClientProvider client={queryClient}>
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
                  {/* Public shipment tracking (v0.6 F2): the token in
                      the URL is the credential — no ProtectedRoute. */}
                  <Route path="/track/:token" element={<TrackPage />} />

                  {/* Protected Buyer Routes */}
                  <Route
                    path="/dashboard"
                    element={
                      <ProtectedRoute>
                        <BuyerDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/my-orders"
                    element={
                      <ProtectedRoute>
                        <MyOrdersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <SettingsPage />
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
                  <Route
                    path="/admin/reports"
                    element={
                      <AdminRoute>
                        <ReportsPage />
                      </AdminRoute>
                    }
                  />

                  {/* Fallback: real 404 page (FE-16) */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </main>
            <Footer />
            {/* PWA install prompt (FE-15): renders only when the browser
                fires beforeinstallprompt and it was not dismissed. */}
            <InstallBanner />
            {/* Assistant chat (v0.7 FEAT-16): renders only for
                authenticated users; the drawer itself is lazy-loaded. */}
            <AssistantWidget />
          </div>
        </OrderProvider>
      </AuthProvider>
    </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
