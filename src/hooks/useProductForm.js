import { useState } from 'react';
import { productApi } from '../api/client';

// Product modal form state + save/delete actions, extracted verbatim from
// AdminDashboard (FE-04).
export const useProductForm = ({ setProducts, showToast }) => {
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    sku: '',
    category: 'Grease Guns & Lubrication',
    description: '',
    basePrice: 10,
    moq: 50,
    leadTimeDays: '',
    stockQuantity: '',
    availabilityNote: '',
    weightKg: 1.0,
    pcsPerCarton: 20,
    allowedSizes: [],
    allowedFinishes: [],
    allowedColors: [],
    allowedBrands: [],
    images: [],
  });
  const [uploadedImageFile, setUploadedImageFile] = useState(null);

  // Add or Edit Product Action
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append('name', productForm.name);
      formData.append('sku', productForm.sku);
      formData.append('category', productForm.category);
      formData.append('description', productForm.description);
      formData.append('basePrice', productForm.basePrice);
      formData.append('moq', productForm.moq);
      // Inventory fields (FEAT-09): optional — appended only when set,
      // mirroring the conditional append used for the image upload below.
      if (productForm.leadTimeDays !== '' && productForm.leadTimeDays != null) {
        formData.append('leadTimeDays', productForm.leadTimeDays);
      }
      if (productForm.stockQuantity !== '' && productForm.stockQuantity != null) {
        formData.append('stockQuantity', productForm.stockQuantity);
      }
      if (productForm.availabilityNote) {
        formData.append('availabilityNote', productForm.availabilityNote);
      }
      formData.append('weightKg', productForm.weightKg);
      formData.append('pcsPerCarton', productForm.pcsPerCarton);
      formData.append('allowedSizes', JSON.stringify(productForm.allowedSizes));
      formData.append('allowedFinishes', JSON.stringify(productForm.allowedFinishes));
      formData.append('allowedColors', JSON.stringify(productForm.allowedColors));
      formData.append('allowedBrands', JSON.stringify(productForm.allowedBrands));

      if (uploadedImageFile) {
        formData.append('images', uploadedImageFile);
      }

      if (editingProduct) {
        await productApi.updateProduct(editingProduct._id, formData);
        showToast(`Product ${productForm.name} updated!`);
      } else {
        await productApi.createProduct(formData);
        showToast(`New Product ${productForm.name} added to catalog!`);
      }

      setIsProductModalOpen(false);
      setEditingProduct(null);
      setUploadedImageFile(null);
      const res = await productApi.getProducts({ limit: 200 });
      if (res.success) setProducts(res.data);
    } catch (err) {
      alert('Error saving product: ' + err.message);
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await productApi.deleteProduct(id);
      showToast(`Product "${name}" deleted.`);
      setProducts(products.filter((p) => p._id !== id));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return {
    isProductModalOpen, setIsProductModalOpen, editingProduct, setEditingProduct,
    productForm, setProductForm, uploadedImageFile, setUploadedImageFile,
    handleSaveProduct, handleDeleteProduct,
  };
};
