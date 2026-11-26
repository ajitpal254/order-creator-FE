import React, { useState } from 'react';
import { ListSkeleton } from '../../components/ListSkeleton';
import { useAdminData } from '../../hooks/useAdminData';
import { useOrderStatus } from '../../hooks/useOrderStatus';
import { useProductForm } from '../../hooks/useProductForm';
import { useAttributeForms } from '../../hooks/useAttributeForms';
import { AdminToast } from '../../components/admin/AdminToast';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { AdminStats } from '../../components/admin/AdminStats';
import { AdminTabNav } from '../../components/admin/AdminTabNav';
import { OrdersTab } from '../../components/admin/OrdersTab';
import { InvoicesTab } from '../../components/admin/InvoicesTab';
import { ProductsTab } from '../../components/admin/ProductsTab';
import { AttributesTab } from '../../components/admin/AttributesTab';
import { CustomersTab } from '../../components/admin/CustomersTab';
import { KanbanBoard } from '../../components/admin/KanbanBoard';
import { AuditLogTab } from '../../components/admin/AuditLogTab';
import { OrderStatusModal } from '../../components/admin/OrderStatusModal';
import { ProductModal } from '../../components/admin/ProductModal';

export const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'invoices' | 'products' | 'attributes' | 'customers'

  const {
    stats, orders, setOrders, products, setProducts, attributes, setAttributes,
    customers, setCustomers, loading, toastMessage, downloadingPdfId, showToast, handleDownloadPdf,
  } = useAdminData();

  const {
    selectedOrderForStatus, setSelectedOrderForStatus, newStatus, setNewStatus,
    statusNote, setStatusNote, handleUpdateStatus,
  } = useOrderStatus({ setOrders, showToast });

  const {
    isProductModalOpen, setIsProductModalOpen, editingProduct, setEditingProduct,
    productForm, setProductForm, setUploadedImageFile,
    handleSaveProduct, handleDeleteProduct,
  } = useProductForm({ setProducts, showToast });

  const attributeForms = useAttributeForms({ setAttributes, showToast });

  return (
    <div style={{ padding: '2.5rem 0 4rem' }}>
      <div className="container">
        {/* Toast */}
        <AdminToast toastMessage={toastMessage} />

        {/* Dashboard Header */}
        <AdminHeader />

        {/* Top Analytics Metrics */}
        <AdminStats stats={stats} orders={orders} products={products} />

        {/* Tab Navigation */}
        <AdminTabNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          orders={orders}
          products={products}
          customers={customers}
        />

        {/* Loading skeleton while dashboard data is fetched (FE-16) */}
        {loading && <ListSkeleton rows={4} />}

        {/* TAB 1: ORDERS MANAGEMENT */}
        {!loading && activeTab === 'orders' && (
          <OrdersTab
            orders={orders}
            setOrders={setOrders}
            setSelectedOrderForStatus={setSelectedOrderForStatus}
            setNewStatus={setNewStatus}
            handleDownloadPdf={handleDownloadPdf}
            downloadingPdfId={downloadingPdfId}
            showToast={showToast}
          />
        )}

        {!loading && activeTab === 'board' && (
          <KanbanBoard orders={orders} setOrders={setOrders} showToast={showToast} />
        )}

        {!loading && activeTab === 'audit' && <AuditLogTab />}

        {/* TAB: INVOICES (FE-11) — rows reuse the orders loaded above;
            View opens the same order detail flow as the Orders tab
            (the status modal), Download PDF is the shared handler. */}
        {!loading && activeTab === 'invoices' && (
          <InvoicesTab
            orders={orders}
            onViewOrder={(ord) => {
              setSelectedOrderForStatus(ord);
              setNewStatus(ord.status);
            }}
            handleDownloadPdf={handleDownloadPdf}
            downloadingPdfId={downloadingPdfId}
          />
        )}

        {/* TAB 2: PRODUCTS CATALOG MANAGEMENT */}
        {!loading && activeTab === 'products' && (
          <ProductsTab
            products={products}
            attributes={attributes}
            setEditingProduct={setEditingProduct}
            setProductForm={setProductForm}
            setIsProductModalOpen={setIsProductModalOpen}
            handleDeleteProduct={handleDeleteProduct}
          />
        )}

        {/* TAB 3: DYNAMIC ATTRIBUTES MANAGEMENT */}
        {!loading && activeTab === 'attributes' && (
          <AttributesTab attributes={attributes} {...attributeForms} />
        )}

        {/* TAB 4: REGISTERED CUSTOMERS DIRECTORY */}
        {!loading && activeTab === 'customers' && (
          <CustomersTab customers={customers} setCustomers={setCustomers} showToast={showToast} />
        )}
      </div>

      {/* Modal: Update Order Status */}
      {selectedOrderForStatus && (
        <OrderStatusModal
          selectedOrderForStatus={selectedOrderForStatus}
          setSelectedOrderForStatus={setSelectedOrderForStatus}
          newStatus={newStatus}
          setNewStatus={setNewStatus}
          statusNote={statusNote}
          setStatusNote={setStatusNote}
          handleUpdateStatus={handleUpdateStatus}
          onOrderUpdated={(updated) => {
            setOrders((prev) => prev.map((o) => (o._id === updated._id ? updated : o)));
            setSelectedOrderForStatus(updated);
          }}
        />
      )}

      {/* Modal: Add/Edit Product */}
      {isProductModalOpen && (
        <ProductModal
          isProductModalOpen={isProductModalOpen}
          setIsProductModalOpen={setIsProductModalOpen}
          editingProduct={editingProduct}
          productForm={productForm}
          setProductForm={setProductForm}
          attributes={attributes}
          setUploadedImageFile={setUploadedImageFile}
          handleSaveProduct={handleSaveProduct}
        />
      )}
    </div>
  );
};
