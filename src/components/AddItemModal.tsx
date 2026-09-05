import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ItemCondition } from '../types';
import { 
  X, 
  PlusCircle, 
  Sparkles, 
  Image, 
  DollarSign, 
  Layers, 
  Check, 
  AlertCircle,
  HelpCircle,
  Camera,
  QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { readAndCompressImage } from '../utils/imageUtils';
import { getItemImageUrl, uploadItemImage } from '../data/supabaseSync';

export const AddItemModal: React.FC = () => {
  const { 
    isAddItemOpen, 
    setIsAddItemOpen, 
    categories, 
    tags, 
    addCategory,
    addSubcategory,
    addItemType,
    generateCategoryCode,
    addItem, 
    generateNextItemCode, 
    formatCurrency 
  } = useApp();

  // Form State
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [itemTypeId, setItemTypeId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newItemTypeName, setNewItemTypeName] = useState('');
  
  const [customCode, setCustomCode] = useState('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [condition, setCondition] = useState<ItemCondition>('Used - Good');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>(['Japan Import']);
  
  const [costPrice, setCostPrice] = useState<number>(50000);
  const [sellingPrice, setSellingPrice] = useState<number>(75000);
  const [maxDiscount, setMaxDiscount] = useState<number>(5000);

  const [photo1, setPhoto1] = useState('');
  const [photo2, setPhoto2] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Update auto-generated code when category changes
  useEffect(() => {
    if (categoryId) {
      const generated = generateNextItemCode(categoryId);
      setCustomCode(generated);

    }
  }, [categoryId, isAddItemOpen]);

  if (!isAddItemOpen) return null;

  const currentCategory = categories.find(c => c.id === categoryId);
  const currentSubcategories = currentCategory?.subcategories || [];
  const currentSubcategory = currentSubcategories.find(s => s.id === subcategoryId);
  const currentItemTypes = currentSubcategory?.itemTypes || [];
  const newCategoryCode = generateCategoryCode(newCategoryName);

  const handleAddCategoryInline = () => {
    if (!newCategoryName.trim()) return;
    const id = addCategory(newCategoryName.trim());
    setCategoryId(id);
    setSubcategoryId('');
    setItemTypeId('');
    setNewCategoryName('');
  };

  const handleAddSubcategoryInline = () => {
    if (!categoryId || !newSubcategoryName.trim()) return;
    const id = addSubcategory(categoryId, newSubcategoryName.trim());
    setSubcategoryId(id);
    setItemTypeId('');
    setNewSubcategoryName('');
  };

  const handleAddItemTypeInline = () => {
    if (!categoryId || !subcategoryId || !newItemTypeName.trim()) return;
    const id = addItemType(categoryId, subcategoryId, newItemTypeName.trim());
    setItemTypeId(id);
    setNewItemTypeName('');
  };

  const estimatedProfit = sellingPrice - costPrice;
  const minNetProfit = (sellingPrice - maxDiscount) - costPrice;

  const handleTagToggle = (tagName: string) => {
    setSelectedTags(prev => 
      prev.includes(tagName) ? prev.filter(t => t !== tagName) : [...prev, tagName]
    );
  };

  const handlePhotoChange = async (file: File | undefined, setPhoto: (value: string) => void) => {
    if (!file) return;
    try {
      setPhoto(await uploadItemImage(file) || await readAndCompressImage(file));
    } catch {
      setPhoto('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !name.trim()) return;
    setIsSubmitting(true);
    setSubmitError(null);

    const catObj = categories.find(c => c.id === categoryId);
    const subObj = currentSubcategories.find(s => s.id === subcategoryId);
    const typeObj = currentItemTypes.find(t => t.id === itemTypeId);

    try {
      await addItem({
      customCode: customCode.trim() || undefined,
      name: name.trim(),
      categoryId,
      categoryName: catObj?.name || 'General',
      subcategoryId: subcategoryId || undefined,
      subcategoryName: subObj?.name || undefined,
      itemTypeId: itemTypeId || undefined,
      itemTypeName: typeObj?.name || undefined,
      brand: brand.trim() || 'Imported',
      model: model.trim(),
      condition,
      description: description.trim(),
      tags: selectedTags,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      maxDiscount: Number(maxDiscount) || 0,
      photo1: photo1.trim() || undefined,
      photo2: photo2.trim() || undefined,
      });
      setIsAddItemOpen(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save the item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Register Incoming Item</h2>
              <p className="text-xs text-slate-500">Auto-generate short code, QR label, and cost/pricing rules</p>
            </div>
          </div>

          <button
            onClick={() => setIsAddItemOpen(false)}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form id="add-item-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {submitError && (
            <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-xs font-medium text-rose-700" role="alert">
              {submitError}
            </div>
          )}
          {/* Step 1, 2, 3: Dynamic Category Selector per Blueprint Section 12 & 13 */}
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-3">
            <div className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              Category Hierarchy (3-Step Selection)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Step 1: Category */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Step 1: Category <span className="text-rose-500">*</span>
                </label>
                <select
                  id="add-item-category-select"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategoryId('');
                    setItemTypeId('');
                  }}
                  className="w-full py-2 px-2.5 bg-white border border-blue-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  required
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} (Prefix: {cat.prefix})
                    </option>
                  ))}
                </select>
                <div className="flex gap-1 mt-1.5">
                  <input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name" className="min-w-0 flex-1 px-2 py-1 bg-white border border-blue-200 rounded-lg text-[10px]" />
                  <span className="px-1.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-mono self-center">{newCategoryName ? newCategoryCode : 'AUTO'}</span>
                  <button type="button" onClick={handleAddCategoryInline} className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer">Add</button>
                </div>
              </div>

              {/* Step 2: Subcategory (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Step 2: Subcategory <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  id="add-item-subcategory-select"
                  value={subcategoryId}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value);
                    setItemTypeId('');
                  }}
                  disabled={currentSubcategories.length === 0}
                  className="w-full py-2 px-2.5 bg-white border border-blue-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="">[ Skip Subcategory ]</option>
                  {currentSubcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
                <div className="flex gap-1 mt-1.5">
                  <input value={newSubcategoryName} onChange={(e) => setNewSubcategoryName(e.target.value)} placeholder="New subcategory" disabled={!categoryId} className="min-w-0 flex-1 px-2 py-1 bg-white border border-blue-200 rounded-lg text-[10px] disabled:opacity-50" />
                  <button type="button" onClick={handleAddSubcategoryInline} disabled={!categoryId} className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50">Add</button>
                </div>
              </div>

              {/* Step 3: Item Type (Optional) */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Step 3: Item Type <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <select
                  id="add-item-type-select"
                  value={itemTypeId}
                  onChange={(e) => setItemTypeId(e.target.value)}
                  disabled={!subcategoryId || currentItemTypes.length === 0}
                  className="w-full py-2 px-2.5 bg-white border border-blue-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50"
                >
                  <option value="">[ Skip Item Type ]</option>
                  {currentItemTypes.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <div className="flex gap-1 mt-1.5">
                  <input value={newItemTypeName} onChange={(e) => setNewItemTypeName(e.target.value)} placeholder="New item type" disabled={!subcategoryId} className="min-w-0 flex-1 px-2 py-1 bg-white border border-blue-200 rounded-lg text-[10px] disabled:opacity-50" />
                  <button type="button" onClick={handleAddItemTypeInline} disabled={!subcategoryId} className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50">Add</button>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Basic Item Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Basic Product Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Item Code Display / Custom override */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Code <span className="text-blue-600 font-bold">(Auto)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    id="add-item-code-input"
                    value={customCode}
                    readOnly
                    aria-readonly="true"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-blue-700 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. B007"
                    required
                  />
                  <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                    <QRCodeSVG value={`/item/${customCode}`} size={20} />
                  </div>
                </div>
              </div>

              {/* Item Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  id="add-item-name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="e.g. Bianchi Via Nirone 7 Celeste Road Bike"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Brand */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                <input
                  type="text"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Bianchi / Yamaha / Herman Miller"
                />
              </div>

              {/* Model */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Model / Edition</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Tiagra 10-Speed / MIJ ST-57"
                />
              </div>

              {/* Condition */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Condition <span className="text-rose-500">*</span>
                </label>
                <select
                  id="add-item-condition-select"
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as ItemCondition)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                >
                  <option value="Brand New">Brand New</option>
                  <option value="Like New">Like New (Mint)</option>
                  <option value="Used - Excellent">Used - Excellent</option>
                  <option value="Used - Good">Used - Good</option>
                  <option value="Used - Fair">Used - Fair</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Specs</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Key components, Japan auction origin, cosmetic notes..."
              />
            </div>

            {/* Tags Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Business Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => {
                  const isSelected = selectedTags.includes(tag.name);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleTagToggle(tag.name)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}{tag.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section: Financial & Pricing Rules (Section 16, 17, 18) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              Financial Information & Discount Limits
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cost Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Acquisition Cost (Rs.) <span className="text-slate-400 font-normal">(Admin only)</span>
                </label>
                <input
                  type="number"
                  id="add-item-cost-input"
                  value={costPrice}
                  onChange={(e) => setCostPrice(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Selling Price */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Retail Selling Price (Rs.) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  id="add-item-selling-price-input"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Max Discount Limit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Employee Discount (Rs.)
                </label>
                <input
                  type="number"
                  id="add-item-max-discount-input"
                  value={maxDiscount}
                  onChange={(e) => setMaxDiscount(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-mono font-bold text-xs text-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Profit preview banner */}
            <div className="p-2.5 bg-white rounded-xl border border-slate-200/80 flex items-center justify-between text-xs font-mono">
              <div>
                <span className="text-slate-500">Gross Potential Profit: </span>
                <strong className="text-emerald-600 font-bold">+{formatCurrency(estimatedProfit)}</strong>
              </div>
              <div>
                <span className="text-slate-500">Min Profit with Max Discount: </span>
                <strong className="text-slate-800 font-bold">+{formatCurrency(minNetProfit)}</strong>
              </div>
            </div>
          </div>

          {/* Section: Photos (Section 19) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-purple-600" />
                Physical Item Photos (Up to 2)
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Photo 1</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e.target.files?.[0], setPhoto1)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {photo1 && (
                  <div className="mt-2 w-full h-28 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                    <img src={getItemImageUrl(photo1)} alt="Preview 1" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Photo 2 (Optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handlePhotoChange(e.target.files?.[0], setPhoto2)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                {photo2 && (
                  <div className="mt-2 w-full h-28 rounded-xl bg-slate-100 overflow-hidden border border-slate-200">
                    <img src={getItemImageUrl(photo2)} alt="Preview 2" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Short Code <strong>{customCode}</strong> &amp; QR label generated instantly</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddItemOpen(false)}
              className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="add-item-form"
              id="add-item-submit-btn"
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save & Register Item'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
