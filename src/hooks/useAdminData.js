import { useState, useEffect } from 'react';
import { orderApi, productApi, attributeApi, userApi } from '../api/client';

// Data loading, toast and PDF download for the admin dashboard.
// Extracted verbatim from AdminDashboard (FE-04): same API calls, same
// fallbacks, same state defaults.
export const useAdminData = () => {
  // Stats
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  // Attributes Tab State
  const [attributes, setAttributes] = useState({
    finishes: [],
    colors: [],
    brands: [],
    sizes: [],
    categories: [],
  });

  // Customers Tab State
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');

  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownloadPdf = async (orderId, orderNumber) => {
    try {
      setDownloadingPdfId(orderId);
      await orderApi.downloadPdf(orderId, orderNumber);
    } catch (err) {
      alert('Error downloading PDF: ' + err.message);
    } finally {
      setDownloadingPdfId(null);
    }
  };

  // Initial Load
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [statsRes, ordersRes, productsRes, attrRes, usersRes] = await Promise.all([
        orderApi.getStats().catch(() => ({ success: false })),
        orderApi.getAllOrders(),
        productApi.getProducts({ limit: 200 }),
        attributeApi.getAll(),
        userApi.getUsers().catch(() => ({ success: false, data: [] })),
      ]);

      if (statsRes.success) setStats(statsRes.stats);
      if (ordersRes.success) setOrders(ordersRes.data);
      if (productsRes.success) setProducts(productsRes.data);
      if (attrRes.success) setAttributes(attrRes.data);
      if (usersRes.success) setCustomers(usersRes.data);
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  return {
    stats, orders, setOrders, products, setProducts, attributes, setAttributes,
    customers, setCustomers, customerSearch, setCustomerSearch, loading, toastMessage,
    downloadingPdfId, showToast, handleDownloadPdf,
  };
};
