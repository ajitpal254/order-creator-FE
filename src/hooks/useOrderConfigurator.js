import { useState, useEffect } from 'react';
import { productApi, attributeApi } from '../api/client';

// Master-data loading + configurator form state for the order creator.
// Extracted verbatim from OrderCreatorPage (FE-04): same API calls, same
// defaults, same line-item payload. No pricing/total computation lives
// here (totals come from OrderContext, unchanged).
export const useOrderConfigurator = ({ addItem, locationState }) => {
  // Master Data States
  const [products, setProducts] = useState([]);
  const [attributes, setAttributes] = useState({
    finishes: [],
    colors: [],
    brands: [],
    sizes: [],
    categories: [],
  });
  const [loading, setLoading] = useState(true);
  // Configurator Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedFinish, setSelectedFinish] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedPackaging, setSelectedPackaging] = useState('Master Carton (Standard Export)');
  const [customMarking, setCustomMarking] = useState('');
  const [quantity, setQuantity] = useState(100);
  const [unitPriceOverride, setUnitPriceOverride] = useState('');
  // Load initial products & master attributes
  useEffect(() => {
    const loadMasterData = async () => {
      setLoading(false);
      try {
        const [prodRes, attrRes] = await Promise.all([
          productApi.getProducts(),
          attributeApi.getAll(),
        ]);

        if (prodRes.success && prodRes.data.length > 0) {
          setProducts(prodRes.data);

          // Check if there was a preselected product from catalog navigation
          const preSelected = locationState?.preSelectedProduct;
          const initialProduct = preSelected || prodRes.data[0];

          if (initialProduct) {
            applyProductDefaults(initialProduct, attrRes.data);
          }
        }

        if (attrRes.success) {
          setAttributes(attrRes.data);
        }
      } catch (err) {
        console.error('Error loading master data:', err);
      }
    };

    loadMasterData();
  }, [locationState]);
  const applyProductDefaults = (prod, attrData = attributes) => {
    setSelectedProductId(prod._id);
    setSelectedSize(prod.allowedSizes?.[0] || attrData?.sizes?.[0]?.label || 'Standard');
    setSelectedFinish(prod.allowedFinishes?.[0] || attrData?.finishes?.[0]?.name || 'Chrome Plated');
    setSelectedColor(prod.allowedColors?.[0] || attrData?.colors?.[0]?.name || 'Industrial Red');
    setSelectedBrand(prod.allowedBrands?.[0] || attrData?.brands?.[0]?.name || 'H.A. Overseas');
    setQuantity(prod.moq || 50);
    setUnitPriceOverride(prod.basePrice?.toString() || '');
  };

  const handleProductChange = (e) => {
    const prodId = e.target.value;
    const prod = products.find((p) => p._id === prodId);
    if (prod) {
      applyProductDefaults(prod);
    }
  };

  const currentProduct = products.find((p) => p._id === selectedProductId);
  // Add Item to Matrix Sheet
  const handleAddLineItem = (e) => {
    e.preventDefault();
    if (!currentProduct) return;

    const unitPrice = parseFloat(unitPriceOverride) || currentProduct.basePrice || 0;
    const qty = parseInt(quantity) || currentProduct.moq || 50;

    addItem({
      product: currentProduct._id,
      productName: currentProduct.name,
      sku: currentProduct.sku,
      size: selectedSize,
      finish: selectedFinish,
      color: selectedColor,
      brand: selectedBrand,
      packaging: selectedPackaging,
      customMarking: customMarking,
      quantity: qty,
      unitPrice: unitPrice,
      weightKg: currentProduct.weightKg || 1.0,
      pcsPerCarton: currentProduct.pcsPerCarton || 20,
    });

    setCustomMarking('');
  };

  return {
    products, attributes, loading, selectedProductId, selectedSize,
    setSelectedSize, selectedFinish, setSelectedFinish, selectedColor,
    setSelectedColor, selectedBrand, setSelectedBrand, selectedPackaging,
    setSelectedPackaging, customMarking, setCustomMarking, quantity,
    setQuantity, unitPriceOverride, setUnitPriceOverride, currentProduct,
    handleProductChange, handleAddLineItem,
  };
};
