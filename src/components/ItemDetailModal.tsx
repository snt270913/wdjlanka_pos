import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Item, ItemCondition, ItemStatus } from '../types';
import { 
  X, 
  ShoppingCart, 
  Bookmark, 
  Trash2, 
  Edit3, 
  Check, 
  QrCode, 
  Printer, 
  Clock, 
  DollarSign, 
  Tag, 
  Layers, 
  ShieldCheck, 
  ExternalLink,
  Camera
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { readAndCompressImage } from '../utils/imageUtils';
import { getItemImageUrl, uploadItemImage } from '../data/supabaseSync';

export const ItemDetailModal: React.FC = () => {
  const { 
    selectedItemForDetail, 
    setSelectedItemForDetail, 
    setSelectedItemForSale, 
    toggleReserveItem, 
    deleteItem, 
    updateItem, 
    currentUser, 
    formatCurrency, 
    getStockAge,
    setSelectedLabelItemCodes,
    setActiveTab
    , categories, tags, addCategory, generateCategoryCode, addSubcategory, addItemType
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [activePhoto, setActivePhoto] = useState<string | null>(null);

  // Edit fields state
  const [editName, setEditName] = useState('');
  const [editBrand, setEditBrand] = useState('');
  const [editModel, setEditModel] = useState('');
  const [editCondition, setEditCondition] = useState<ItemCondition>('Used - Good');
  const [editCostPrice, setEditCostPrice] = useState(0);
  const [editSellingPrice, setEditSellingPrice] = useState(0);
  const [editMaxDiscount, setEditMaxDiscount] = useState(0);
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState<ItemStatus>('AVAILABLE');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editPhoto1, setEditPhoto1] = useState('');
  const [editPhoto2, setEditPhoto2] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editSubcategoryId, setEditSubcategoryId] = useState('');
  const [editItemTypeId, setEditItemTypeId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [newItemTypeName, setNewItemTypeName] = useState('');

  if (!selectedItemForDetail) return null;
  const item = selectedItemForDetail;
  const isAdmin = currentUser?.role === 'ADMIN';
  const age = getStockAge(item.dateAdded);

  const startEditing = () => {
    setEditName(item.name);
    setEditBrand(item.brand);
    setEditModel(item.model || '');
    setEditCondition(item.condition);
    setEditCostPrice(item.costPrice);
    setEditSellingPrice(item.sellingPrice);
    setEditMaxDiscount(item.maxDiscount);
    setEditDescription(item.description || '');
    setEditStatus(item.status);
    setEditTags(item.tags);
    setEditPhoto1(item.photo1 || '');
    setEditPhoto2(item.photo2 || '');
    setEditCategoryId(item.categoryId);
    setEditSubcategoryId(item.subcategoryId || '');
    setEditItemTypeId(item.itemTypeId || '');
    setIsEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const category = categories.find((entry) => entry.id === editCategoryId);
    const subcategory = category?.subcategories.find((entry) => entry.id === editSubcategoryId);
    const itemType = subcategory?.itemTypes.find((entry) => entry.id === editItemTypeId);
    updateItem(item.id, {
      name: editName,
      brand: editBrand,
      model: editModel,
      condition: editCondition,
      costPrice: Number(editCostPrice),
      sellingPrice: Number(editSellingPrice),
      maxDiscount: Number(editMaxDiscount),
      description: editDescription,
      status: editStatus,
      tags: editTags,
      photo1: editPhoto1 || undefined,
      photo2: editPhoto2 || undefined,
      categoryId: editCategoryId,
      categoryName: category?.name || item.categoryName,
      subcategoryId: editSubcategoryId || undefined,
      subcategoryName: subcategory?.name,
      itemTypeId: editItemTypeId || undefined,
      itemTypeName: itemType?.name,
    });
    setIsEditing(false);
  };

  const editCategory = categories.find((entry) => entry.id === editCategoryId);
  const editSubcategories = editCategory?.subcategories || [];
  const editSubcategory = editSubcategories.find((entry) => entry.id === editSubcategoryId);
  const editItemTypes = editSubcategory?.itemTypes || [];
  const newCategoryCode = generateCategoryCode(newCategoryName);

  const handleAddEditCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const id = await addCategory(newCategoryName.trim());
      setEditCategoryId(id);
      setEditSubcategoryId('');
      setEditItemTypeId('');
      setNewCategoryName('');
    } catch {
      // Keep the inline form open so the user can retry after a database failure.
    }
  };

  const handleAddEditSubcategory = async () => {
    if (!editCategoryId || !newSubcategoryName.trim()) return;
    try {
      const id = await addSubcategory(editCategoryId, newSubcategoryName.trim());
      setEditSubcategoryId(id);
      setEditItemTypeId('');
      setNewSubcategoryName('');
    } catch {
      // Keep the inline form open so the user can retry after a database failure.
    }
  };

  const handleAddEditItemType = async () => {
    if (!editCategoryId || !editSubcategoryId || !newItemTypeName.trim()) return;
    try {
      const id = await addItemType(editCategoryId, editSubcategoryId, newItemTypeName.trim());
      setEditItemTypeId(id);
      setNewItemTypeName('');
    } catch {
      // Keep the inline form open so the user can retry after a database failure.
    }
  };

  const handlePhotoChange = async (file: File | undefined, setPhoto: (value: string) => void) => {
    if (!file) return;
    try {
      setPhoto(await uploadItemImage(file) || await readAndCompressImage(file));
    } catch {
      setPhoto('');
    }
  };

  const handlePrintSingleLabel = () => {
    setSelectedLabelItemCodes([item.code]);
    setSelectedItemForDetail(null);
    setActiveTab('qr-labels');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono font-bold text-sm bg-blue-600 text-white px-2.5 py-1 rounded-xl shadow-xs">
              {item.code}
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 truncate max-w-sm sm:max-w-md">
                {item.name}
              </h2>
              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                <span>{item.categoryName}</span>
                <span>•</span>
                <span>Age: <strong className="text-slate-700">{age} Days</strong></span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedItemForDetail(null)}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!isEditing ? (
            <>
              {/* Media & QR Code Spotlight */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Photo Gallery (2 cols) */}
                <div className="sm:col-span-2 space-y-2">
                  <div className="aspect-16/10 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shadow-2xs relative">
                    {item.photo1 || item.photo2 ? (
                      <img 
                        src={activePhoto || getItemImageUrl(item.photo1) || getItemImageUrl(item.photo2)}
                        alt={item.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-4">
                        <Camera className="w-8 h-8 mb-2" />
                        <span className="text-xs">No physical photo uploaded</span>
                      </div>
                    )}

                    <div className="absolute top-2 left-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold shadow-xs ${
                        item.status === 'AVAILABLE' ? 'bg-emerald-600 text-white' :
                        item.status === 'RESERVED' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Thumbnail Selector */}
                  {(item.photo1 && item.photo2) && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActivePhoto(getItemImageUrl(item.photo1) || item.photo1!)}
                        className={`w-16 h-12 rounded-lg border overflow-hidden cursor-pointer ${
                          (activePhoto === item.photo1 || !activePhoto) ? 'ring-2 ring-blue-500' : 'opacity-70'
                        }`}
                      >
                        <img src={getItemImageUrl(item.photo1)} alt="Photo 1" className="w-full h-full object-cover" />
                      </button>
                      <button
                        onClick={() => setActivePhoto(getItemImageUrl(item.photo2) || item.photo2!)}
                        className={`w-16 h-12 rounded-lg border overflow-hidden cursor-pointer ${
                          activePhoto === item.photo2 ? 'ring-2 ring-blue-500' : 'opacity-70'
                        }`}
                      >
                        <img src={getItemImageUrl(item.photo2)} alt="Photo 2" className="w-full h-full object-cover" />
                      </button>
                    </div>
                  )}
                </div>

                {/* QR Code & Label Box */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-between text-center space-y-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                    <QRCodeSVG 
                      value={`/item/${item.code}`} 
                      size={110} 
                      level="H" 
                      includeMargin={false}
                    />
                  </div>

                  <div>
                    <div className="font-mono font-bold text-xs text-slate-800 uppercase tracking-wider">
                      {item.code}
                    </div>
                    <div className="text-[10px] text-slate-500">Scan via Mobile Camera</div>
                  </div>

                  <button
                    onClick={handlePrintSingleLabel}
                    className="w-full py-1.5 px-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print A4 Label</span>
                  </button>
                </div>
              </div>

              {/* Price & Financial Overview */}
              <div className="p-4 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 rounded-2xl border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Retail Selling Price</span>
                  <div className="text-2xl sm:text-3xl font-black text-blue-900 font-mono">
                    {formatCurrency(item.sellingPrice)}
                  </div>
                  {item.maxDiscount > 0 && (
                    <div className="text-xs text-amber-700 font-medium mt-0.5">
                      Permitted Employee Discount: up to {formatCurrency(item.maxDiscount)}
                    </div>
                  )}
                </div>

              </div>

              {/* Technical Specs & Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{item.categoryName}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Subcategory</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{item.subcategoryName || '—'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Item Type</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{item.itemTypeName || '—'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Brand</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{item.brand}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Model</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{item.model || '—'}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Condition</span>
                  <div className="font-semibold text-slate-800 mt-0.5">{item.condition}</div>
                </div>
              </div>

              {/* Description */}
              {item.description && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">Description / Notes</h4>
                  <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {item.tags.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Tags</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[11px] font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Editing Form */
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-3">
                <div className="text-xs font-bold text-blue-950 uppercase tracking-wider">Category Hierarchy</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                    <select value={editCategoryId} onChange={(e) => { setEditCategoryId(e.target.value); setEditSubcategoryId(''); setEditItemTypeId(''); }} className="w-full px-2.5 py-2 bg-white border border-blue-200 rounded-xl text-xs" required>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    <div className="flex gap-1 mt-1.5"><input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="New category name" className="min-w-0 flex-1 px-2 py-1 border border-blue-200 rounded-lg text-[10px]" /><span className="px-1.5 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-mono self-center">{newCategoryName ? newCategoryCode : 'AUTO'}</span><button type="button" onClick={handleAddEditCategory} className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer">Add</button></div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Subcategory</label>
                    <select value={editSubcategoryId} onChange={(e) => { setEditSubcategoryId(e.target.value); setEditItemTypeId(''); }} disabled={editSubcategories.length === 0} className="w-full px-2.5 py-2 bg-white border border-blue-200 rounded-xl text-xs disabled:opacity-50"><option value="">None</option>{editSubcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}</select>
                    <div className="flex gap-1 mt-1.5"><input value={newSubcategoryName} onChange={(e) => setNewSubcategoryName(e.target.value)} placeholder="New subcategory" disabled={!editCategoryId} className="min-w-0 flex-1 px-2 py-1 border border-blue-200 rounded-lg text-[10px] disabled:opacity-50" /><button type="button" onClick={handleAddEditSubcategory} disabled={!editCategoryId} className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50">Add</button></div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Item Type</label>
                    <select value={editItemTypeId} onChange={(e) => setEditItemTypeId(e.target.value)} disabled={!editSubcategoryId} className="w-full px-2.5 py-2 bg-white border border-blue-200 rounded-xl text-xs disabled:opacity-50"><option value="">None</option>{editItemTypes.map((itemType) => <option key={itemType.id} value={itemType.id}>{itemType.name}</option>)}</select>
                    <div className="flex gap-1 mt-1.5"><input value={newItemTypeName} onChange={(e) => setNewItemTypeName(e.target.value)} placeholder="New item type" disabled={!editSubcategoryId} className="min-w-0 flex-1 px-2 py-1 border border-blue-200 rounded-lg text-[10px] disabled:opacity-50" /><button type="button" onClick={handleAddEditItemType} disabled={!editSubcategoryId} className="px-2 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-bold cursor-pointer disabled:opacity-50">Add</button></div>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Item Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Model</label>
                  <input
                    type="text"
                    value={editModel}
                    onChange={(e) => setEditModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Cost Price (Rs.)</label>
                  <input
                    type="number"
                    value={editCostPrice}
                    onChange={(e) => setEditCostPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Selling Price (Rs.)</label>
                  <input
                    type="number"
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-700"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Max Discount (Rs.)</label>
                  <input
                    type="number"
                    value={editMaxDiscount}
                    onChange={(e) => setEditMaxDiscount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Condition</label>
                <select
                  value={editCondition}
                  onChange={(e) => setEditCondition(e.target.value as ItemCondition)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium"
                >
                  <option value="Brand New">Brand New</option>
                  <option value="Like New">Like New</option>
                  <option value="Used - Excellent">Used - Excellent</option>
                  <option value="Used - Good">Used - Good</option>
                  <option value="Used - Fair">Used - Fair</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Status</label>
                  <select value={editStatus} onChange={(e) => setEditStatus(e.target.value as ItemStatus)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900">
                    <option value="AVAILABLE">AVAILABLE</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="SOLD">SOLD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Business Tags</label>
                  <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto">
                    {tags.map((tag) => <button key={tag.id} type="button" onClick={() => setEditTags((current) => current.includes(tag.name) ? current.filter((name) => name !== tag.name) : [...current, tag.name])} className={`px-2 py-1 rounded-lg border text-[10px] font-semibold cursor-pointer ${editTags.includes(tag.name) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}>{tag.name}</button>)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Replace Photo 1</label>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoChange(e.target.files?.[0], setEditPhoto1)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700" />
                  {editPhoto1 && <div className="relative mt-2"><img src={getItemImageUrl(editPhoto1)} alt="Photo 1 preview" className="w-full h-20 rounded-xl object-cover border border-slate-200" /><button type="button" onClick={() => setEditPhoto1('')} className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow cursor-pointer" title="Remove photo 1"><X className="w-3 h-3" /></button></div>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Replace Photo 2</label>
                  <input type="file" accept="image/*" onChange={(e) => handlePhotoChange(e.target.files?.[0], setEditPhoto2)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700" />
                  {editPhoto2 && <div className="relative mt-2"><img src={getItemImageUrl(editPhoto2)} alt="Photo 2 preview" className="w-full h-20 rounded-xl object-cover border border-slate-200" /><button type="button" onClick={() => setEditPhoto2('')} className="absolute top-1 right-1 p-1 rounded-full bg-rose-600 text-white shadow cursor-pointer" title="Remove photo 2"><X className="w-3 h-3" /></button></div>}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs"
                >
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isAdmin && !isEditing && (
              <>
                <button
                  onClick={startEditing}
                  className="px-3 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  onClick={() => toggleReserveItem(item.id)}
                  className={`px-3 py-2 border rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    item.status === 'RESERVED' 
                      ? 'bg-amber-100 text-amber-900 border-amber-300' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  <Bookmark className="w-3.5 h-3.5" />
                  <span>{item.status === 'RESERVED' ? 'Unreserve' : 'Reserve Hold'}</span>
                </button>

                <button
                  onClick={() => {
                    if (window.confirm(`Move item ${item.code} to Recycle Bin?`)) {
                      deleteItem(item.id);
                      setSelectedItemForDetail(null);
                    }
                  }}
                  className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                  title="Move to Recycle Bin"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {item.status === 'AVAILABLE' && (
              <button
                id="item-detail-sell-btn"
                onClick={() => {
                  setSelectedItemForDetail(null);
                  setSelectedItemForSale(item);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Mark as SOLD</span>
              </button>
            )}

            <button
              onClick={() => setSelectedItemForDetail(null)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
