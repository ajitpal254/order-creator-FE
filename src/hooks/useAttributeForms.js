import { useState } from 'react';
import { attributeApi } from '../api/client';

// Attribute (finish/color/brand/size) form state + add/delete actions,
// extracted verbatim from AdminDashboard (FE-04).
export const useAttributeForms = ({ setAttributes, showToast }) => {
  const [newFinish, setNewFinish] = useState({ name: '', code: '', description: '' });
  const [newColor, setNewColor] = useState({ name: '', hexCode: '#DC2626', description: '' });
  const [newBrand, setNewBrand] = useState({ name: '', isCustom: false, description: '' });
  const [newSize, setNewSize] = useState({ label: '', unit: '', categoryType: 'General' });

  // Attribute Handlers
  const handleAddFinish = async (e) => {
    e.preventDefault();
    if (!newFinish.name) return;
    try {
      await attributeApi.addFinish(newFinish);
      setNewFinish({ name: '', code: '', description: '' });
      showToast('Finish added!');
      const res = await attributeApi.getAll();
      if (res.success) setAttributes(res.data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteFinish = async (id) => {
    try {
      await attributeApi.deleteFinish(id);
      showToast('Finish removed');
      const res = await attributeApi.getAll();
      if (res.success) setAttributes(res.data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddColor = async (e) => {
    e.preventDefault();
    if (!newColor.name) return;
    try {
      await attributeApi.addColor(newColor);
      setNewColor({ name: '', hexCode: '#DC2626', description: '' });
      showToast('Color added!');
      const res = await attributeApi.getAll();
      if (res.success) setAttributes(res.data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteColor = async (id) => {
    try {
      await attributeApi.deleteColor(id);
      showToast('Color removed');
      const res = await attributeApi.getAll();
      if (res.success) setAttributes(res.data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (!newBrand.name) return;
    try {
      await attributeApi.addBrand(newBrand);
      setNewBrand({ name: '', isCustom: false, description: '' });
      showToast('Brand added!');
      const res = await attributeApi.getAll();
      if (res.success) setAttributes(res.data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteBrand = async (id) => {
    try {
      await attributeApi.deleteBrand(id);
      showToast('Brand removed');
      const res = await attributeApi.getAll();
      if (res.success) setAttributes(res.data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddSize = async (e) => {
    e.preventDefault();
    if (!newSize.label) return;
    try {
      await attributeApi.addSize(newSize);
      setNewSize({ label: '', unit: '', categoryType: 'General' });
      showToast('Size option added!');
      const res = await attributeApi.getAll();
      if (res.success) setAttributes(res.data);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteSize = async (id) => {
    try {
      await attributeApi.deleteSize(id);
      showToast('Size option removed');
      const res = await attributeApi.getAll();
      if (res.success) setAttributes(res.data);
    } catch (err) {
      alert(err.message);
    }
  };

  return {
    newFinish, setNewFinish, newColor, setNewColor, newBrand, setNewBrand,
    newSize, setNewSize, handleAddFinish, handleDeleteFinish, handleAddColor,
    handleDeleteColor, handleAddBrand, handleDeleteBrand, handleAddSize,
    handleDeleteSize,
  };
};
