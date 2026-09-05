import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Item, ItemCondition, ItemStatus } from '../types';
import { 
  Search, 
  Filter, 
  PlusCircle, 
  Grid, 
  List, 
  Clock, 
  QrCode, 
  CheckSquare, 
  Square, 
  Tag, 
  MoreVertical, 
  Trash2, 
  Bookmark, 
  ShoppingCart, 
  Eye, 
  FileSpreadsheet,
  Download,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink
  , Printer
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { getItemImageUrl } from '../data/supabaseSync';

export const ItemsView: React.FC = () => {
  const { 
    activeItems, 
    categories, 
    tags, 
    formatCurrency, 
    getStockAge, 
    currentUser, 
    setSelectedItemForDetail, 
    setSelectedItemForSale, 
    toggleReserveItem, 
    deleteItem, 
    setIsAddItemOpen, 
    selectedLabelItemCodes, 
    toggleLabelSelection, 
    selectAllLabels, 
    clearLabelSelection,
    setActiveTab,
    exportToCSV
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedSubcategory, setSelectedSubcategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCondition, setSelectedCondition] = useState<string>('ALL');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid' | 'aging'>('table');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'code'>('newest');
  const [copyMessage, setCopyMessage] = useState<string | null>(null);

  // Subcategories of selected category
  const currentCategoryObj = categories.find(c => c.id === selectedCategory);
  const availableSubcategories = currentCategoryObj?.subcategories || [];

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return activeItems.filter(item => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches = 
          item.code.toLowerCase().includes(q) ||
          item.name.toLowerCase().includes(q) ||
          item.brand.toLowerCase().includes(q) ||
          item.model.toLowerCase().includes(q) ||
          item.categoryName.toLowerCase().includes(q) ||
          item.tags.some(t => t.toLowerCase().includes(q));
        if (!matches) return false;
      }

      // Category
      if (selectedCategory !== 'ALL' && item.categoryId !== selectedCategory) {
        return false;
      }

      // Subcategory
      if (selectedSubcategory !== 'ALL' && item.subcategoryId !== selectedSubcategory) {
        return false;
      }

      // Status
      if (selectedStatus !== 'ALL' && item.status !== selectedStatus) {
        return false;
      }

      // Condition
      if (selectedCondition !== 'ALL' && item.condition !== selectedCondition) {
        return false;
      }

      // Tag
      if (selectedTag !== 'ALL' && !item.tags.includes(selectedTag)) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      if (sortBy === 'oldest') return new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
      if (sortBy === 'price-desc') return b.sellingPrice - a.sellingPrice;
      if (sortBy === 'price-asc') return a.sellingPrice - b.sellingPrice;
      if (sortBy === 'code') return a.code.localeCompare(b.code);
      return 0;
    });
  }, [activeItems, searchQuery, selectedCategory, selectedSubcategory, selectedStatus, selectedCondition, selectedTag, sortBy]);

  const allVisibleCodes = filteredItems.map(i => i.code);
  const isAllSelected = allVisibleCodes.length > 0 && allVisibleCodes.every(c => selectedLabelItemCodes.includes(c));
  const lowStockCategories = categories.map((category) => ({
    ...category,
    availableUnits: activeItems.filter((item) => item.categoryId === category.id && (item.status === 'AVAILABLE' || item.status === 'RESERVED')).length,
  })).filter((category) => category.availableUnits > 0 && category.availableUnits < 5);

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      clearLabelSelection();
    } else {
      selectAllLabels(Array.from(new Set([...selectedLabelItemCodes, ...allVisibleCodes])));
    }
  };

  const copyItemCode = async (item: Item) => {
    const details = item.code;
    try {
      await navigator.clipboard.writeText(details);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = details;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
    setCopyMessage(`${item.code} copied`);
    window.setTimeout(() => setCopyMessage(null), 1800);
  };

  const handlePrintItemLabel = (code: string) => {
    selectAllLabels([code]);
    setActiveTab('qr-labels');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {copyMessage && <div className="fixed right-5 bottom-5 z-50 rounded-xl bg-slate-900 text-white border border-cyan-400/30 px-4 py-3 text-xs font-semibold shadow-xl animate-in fade-in">{copyMessage}</div>}
      {/* Header Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Inventory Management</span>
            <span className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full font-mono font-bold">
              {filteredItems.length} of {activeItems.length} Items
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Filter by category, status, condition, and manage QR tags</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <button
              id="items-add-new-btn"
              onClick={() => setIsAddItemOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register New Item</span>
            </button>
          )}

          <button
            onClick={() => exportToCSV('items')}
            className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            title="Download CSV of filtered items"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {/* View Mode Switcher */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              title="Table View"
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid Card View"
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-blue-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('aging')}
              title="Stock Age View"
              className={`p-1.5 rounded-lg text-xs transition cursor-pointer ${
                viewMode === 'aging' ? 'bg-white text-amber-600 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {lowStockCategories.length > 0 && (
        <div className="bg-slate-900 text-white p-4 rounded-3xl border border-amber-400/30 shadow-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-300 shrink-0" />
          <div><div className="text-sm font-bold">Low Stock Warning</div><div className="text-xs text-slate-400">{lowStockCategories.map((category) => `${category.name}: ${category.availableUnits} left`).join(' • ')}</div></div>
        </div>
      )}

      {/* Multi-Filter Bar (Bento Filter Card) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs space-y-3.5">
        {/* Search & Main Selects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {/* Search Box */}
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="items-filter-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code, name, brand, model..."
              className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          {/* Category */}
          <div>
            <select
              id="items-filter-category-select"
              value={selectedCategory}
              onChange={(e) => {
                setSelectedCategory(e.target.value);
                setSelectedSubcategory('ALL');
              }}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium transition"
            >
              <option value="ALL">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Subcategory */}
          <div>
            <select
              id="items-filter-subcategory-select"
              value={selectedSubcategory}
              onChange={(e) => setSelectedSubcategory(e.target.value)}
              disabled={selectedCategory === 'ALL' || availableSubcategories.length === 0}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 transition"
            >
              <option value="ALL">All Subcategories</option>
              {availableSubcategories.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <select
              id="items-filter-status-select"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium transition"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">AVAILABLE (In Stock)</option>
              <option value="RESERVED">RESERVED (Hold)</option>
              <option value="SOLD">SOLD (Historical)</option>
            </select>
          </div>

          {/* Condition */}
          <div>
            <select
              id="items-filter-condition-select"
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full py-2.5 px-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer transition"
            >
              <option value="ALL">All Conditions</option>
              <option value="Brand New">Brand New</option>
              <option value="Like New">Like New</option>
              <option value="Used - Excellent">Used - Excellent</option>
              <option value="Used - Good">Used - Good</option>
              <option value="Used - Fair">Used - Fair</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Row (Tags + Sort + Selection Bar) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-400 font-medium mr-1 text-[11px]">Filter Tag:</span>
            <button
              onClick={() => setSelectedTag('ALL')}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition cursor-pointer ${
                selectedTag === 'ALL' ? 'bg-slate-800 text-white shadow-2xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Tags
            </button>
            {tags.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTag(selectedTag === t.name ? 'ALL' : t.name)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition border cursor-pointer ${
                  selectedTag === t.name ? 'bg-blue-600 text-white border-blue-600 shadow-2xs' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-[11px]">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="py-1 px-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 cursor-pointer"
            >
              <option value="newest">Newest Added</option>
              <option value="oldest">Oldest (Stock Age)</option>
              <option value="price-desc">Highest Price</option>
              <option value="price-asc">Lowest Price</option>
              <option value="code">Item Code (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Multi-Selection Bulk Action Banner */}
      {selectedLabelItemCodes.length > 0 && (
        <div className="p-4 bg-blue-50/80 border border-blue-200/80 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2 text-blue-900 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
            <span><strong>{selectedLabelItemCodes.length}</strong> items selected for A4 QR Code Label generation</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('qr-labels')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Generate & Print Labels ({selectedLabelItemCodes.length})</span>
            </button>
            <button
              onClick={clearLabelSelection}
              className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-medium transition cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Main Items Display Area */}
      {filteredItems.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No items match your filter criteria</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Try adjusting your search terms, categories, condition, or status filters.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
              setSelectedSubcategory('ALL');
              setSelectedStatus('ALL');
              setSelectedCondition('ALL');
              setSelectedTag('ALL');
            }}
            className="px-5 py-2.5 bg-slate-900 text-white text-xs font-semibold rounded-2xl hover:bg-slate-800 transition cursor-pointer"
          >
            Reset All Filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Table View */
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
                <tr>
                  <th className="p-3.5 w-10 text-center">
                    <button
                      onClick={handleSelectAllToggle}
                      className="cursor-pointer text-slate-400 hover:text-slate-600"
                      title={isAllSelected ? 'Deselect All' : 'Select All for Labels'}
                    >
                      {isAllSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                    </button>
                  </th>
                  <th className="p-3.5">Item / Code</th>
                  <th className="p-3.5">Category & Brand</th>
                  <th className="p-3.5">Stock</th>
                  <th className="p-3.5">Condition</th>
                  <th className="p-3.5">Selling Price</th>
                  {isAdmin && <th className="p-3.5">Cost & Profit</th>}
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Age</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => {
                  const isSelected = selectedLabelItemCodes.includes(item.code);
                  const age = getStockAge(item.dateAdded);
                  const isOld = (item.status === 'AVAILABLE' || item.status === 'RESERVED') && age > 90;

                  return (
                    <tr 
                      key={item.id} 
                      onClick={(event) => {
                        if (!(event.target as HTMLElement).closest('button, input, select, a')) void copyItemCode(item);
                      }}
                      className={`hover:bg-slate-50/80 transition ${
                        item.status === 'SOLD' ? 'bg-slate-50/40 text-slate-400' : ''
                      }`}
                    >
                      {/* Selection Checkbox */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => toggleLabelSelection(item.code)}
                          className="cursor-pointer text-slate-400 hover:text-blue-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Code & Photo & Name */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => setSelectedItemForDetail(item)}
                            className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 cursor-pointer shadow-2xs group relative"
                          >
                            {item.photo1 ? (
                              <img src={getItemImageUrl(item.photo1)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center p-1">
                                <QRCodeSVG value={`/item/${item.code}`} size={36} />
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={() => copyItemCode(item)} className="font-mono font-bold text-xs bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded-lg border border-blue-200/50 cursor-pointer">
                                {item.code}
                              </button>
                              <button
                                onClick={() => setSelectedItemForDetail(item)}
                                className="font-bold text-slate-900 hover:text-blue-600 transition text-left cursor-pointer truncate max-w-xs block"
                              >
                                {item.name}
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {item.tags.slice(0, 2).map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800">{item.categoryName}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.brand} {item.model ? `• ${item.model}` : ''}
                        </div>
                      </td>

                      {/* Available Quantity */}
                      <td className="p-3.5">
                        <span className={`inline-flex min-w-16 justify-center px-2.5 py-1 rounded-lg font-mono text-xs font-bold border ${(item.quantity ?? 1) > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                          {(item.quantity ?? 1)} in stock
                        </span>
                      </td>

                      {/* Condition */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.condition === 'Brand New' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          item.condition === 'Like New' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' :
                          item.condition.includes('Excellent') ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {item.condition}
                        </span>
                      </td>

                      {/* Selling Price */}
                      <td className="p-3.5">
                        <div className="font-mono font-bold text-slate-900 text-xs">
                          {formatCurrency(item.sellingPrice)}
                        </div>
                        {item.maxDiscount > 0 && (
                          <div className="text-[10px] text-amber-600">
                            Max Disc: {formatCurrency(item.maxDiscount)}
                          </div>
                        )}
                      </td>

                      {/* Cost & Profit (Admin Only) */}
                      {isAdmin && (
                        <td className="p-3.5 font-mono">
                          <div className="text-slate-500 text-[11px]">
                            Cost: {formatCurrency(item.costPrice)}
                          </div>
                          <div className="text-emerald-600 font-semibold text-[11px]">
                            Profit: +{formatCurrency(item.sellingPrice - item.costPrice)}
                          </div>
                        </td>
                      )}

                      {/* Status Badge */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          item.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' :
                          item.status === 'RESERVED' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-200 text-slate-600'
                        }`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Age */}
                      <td className="p-3.5">
                        <span className={`font-mono text-[11px] ${
                          isOld ? 'text-rose-600 font-bold' : 'text-slate-500'
                        }`}>
                          {age}d
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {item.status === 'AVAILABLE' && (
                            <button
                              onClick={() => setSelectedItemForSale(item)}
                              title="Mark as Sold"
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-2xs transition cursor-pointer"
                            >
                              Sell
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedItemForDetail(item)}
                            title="View Full Item Details"
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-blue-600 rounded-xl transition cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handlePrintItemLabel(item.code)}
                            title="Print QR label"
                            className="p-1.5 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-xl transition cursor-pointer"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => toggleReserveItem(item.id)}
                                title={item.status === 'RESERVED' ? 'Unreserve' : 'Reserve'}
                                className={`p-1.5 rounded-xl transition cursor-pointer ${
                                  item.status === 'RESERVED' ? 'bg-amber-100 text-amber-800' : 'hover:bg-slate-100 text-slate-500 hover:text-amber-600'
                                }`}
                              >
                                <Bookmark className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  if (window.confirm(`Move item ${item.code} (${item.name}) to Recycle Bin?`)) {
                                    deleteItem(item.id);
                                  }
                                }}
                                title="Move to Recycle Bin"
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        /* Bento Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredItems.map(item => {
            const isSelected = selectedLabelItemCodes.includes(item.code);
            const age = getStockAge(item.dateAdded);

            return (
              <div 
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition group"
              >
                <div>
                  {/* Photo & Status Header */}
                  <div className="relative aspect-4/3 bg-slate-100 overflow-hidden">
                    {item.photo1 ? (
                      <img src={getItemImageUrl(item.photo1)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-4">
                        <QRCodeSVG value={`/item/${item.code}`} size={80} />
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-slate-900/90 backdrop-blur-xs text-white rounded-lg text-xs font-mono font-bold">
                        {item.code}
                      </span>
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <button
                        onClick={() => toggleLabelSelection(item.code)}
                        className="p-1.5 bg-white/90 backdrop-blur-xs rounded-xl shadow-xs text-slate-700 hover:text-blue-600 transition cursor-pointer"
                        title="Select for Label Printing"
                      >
                        {isSelected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="absolute bottom-2.5 left-2.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'AVAILABLE' ? 'bg-emerald-600 text-white' :
                        item.status === 'RESERVED' ? 'bg-amber-600 text-white' : 'bg-slate-700 text-white'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className="p-4 space-y-2">
                    <div className="text-[11px] text-slate-500 font-medium flex items-center justify-between">
                      <span>{item.categoryName}</span>
                      <span>{item.condition}</span>
                    </div>

                    <div className={`inline-flex px-2 py-1 rounded-lg border font-mono text-[10px] font-bold ${(item.quantity ?? 1) > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                      Stock: {item.quantity ?? 1}
                    </div>

                    <h4 
                      onClick={() => setSelectedItemForDetail(item)}
                      className="text-xs font-bold text-slate-900 hover:text-blue-600 line-clamp-2 cursor-pointer"
                    >
                      {item.name}
                    </h4>

                    <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between font-mono">
                      <span className="text-xs text-slate-500">Retail:</span>
                      <span className="text-sm font-bold text-slate-900">{formatCurrency(item.sellingPrice)}</span>
                    </div>

                    {isAdmin && (
                      <div className="text-[10px] text-emerald-600 font-mono flex items-center justify-between">
                        <span>Net Profit:</span>
                        <span>+{formatCurrency(item.sellingPrice - item.costPrice)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedItemForDetail(item)}
                    className="flex-1 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold rounded-xl text-center cursor-pointer transition"
                  >
                    Details
                  </button>

                  {item.status === 'AVAILABLE' && (
                    <button
                      onClick={() => setSelectedItemForSale(item)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl text-center cursor-pointer transition"
                    >
                      Sell
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Stock Aging Bento Mode */
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Stock Age & Inventory Turnover Timeline
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Track how many days each item has remained unsold in storage</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredItems.map(item => {
              const age = getStockAge(item.dateAdded);
              return (
                <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded-xl">
                      {item.code}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{item.name}</div>
                      <div className="text-[11px] text-slate-500">
                        Added on {item.dateAdded} • {item.categoryName} • Stock: <strong>{item.quantity ?? 1}</strong> • Status: <strong>{item.status}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-slate-900">{formatCurrency(item.sellingPrice)}</div>
                      <div className="text-[10px] text-slate-400">Max Discount: {formatCurrency(item.maxDiscount)}</div>
                    </div>

                    <div className={`px-3 py-1 rounded-xl text-xs font-mono font-bold text-center min-w-[90px] ${
                      age > 120 ? 'bg-red-100 text-red-800 border border-red-200' :
                      age > 60 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                      'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    }`}>
                      {age} Days
                    </div>

                    {item.status === 'AVAILABLE' && (
                      <button
                        onClick={() => setSelectedItemForSale(item)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-500 transition"
                      >
                        Sell
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
