import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { getItemImageUrl } from '../data/supabaseSync';
import { 
  Search, 
  X, 
  Package, 
  Users, 
  ArrowRight, 
  Tag, 
  QrCode, 
  ShieldCheck, 
  Layers,
  Sparkles
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const GlobalSearchModal: React.FC = () => {
  const { 
    isGlobalSearchOpen, 
    setIsGlobalSearchOpen, 
    activeItems, 
    customers, 
    categories, 
    setSelectedItemForDetail,
    setSelectedItemForSale,
    setActiveTab,
    currentUser,
    formatCurrency
  } = useApp();

  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (isGlobalSearchOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isGlobalSearchOpen]);

  // Keyboard shortcut Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(true);
      }
      if (e.key === 'Escape' && isGlobalSearchOpen) {
        setIsGlobalSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGlobalSearchOpen, setIsGlobalSearchOpen]);

  if (!isGlobalSearchOpen) return null;

  const cleanQuery = query.trim().toLowerCase();

  // Search Items
  const matchedItems = cleanQuery ? activeItems.filter(item => {
    return (
      item.code.toLowerCase().includes(cleanQuery) ||
      item.name.toLowerCase().includes(cleanQuery) ||
      item.brand.toLowerCase().includes(cleanQuery) ||
      item.model.toLowerCase().includes(cleanQuery) ||
      item.categoryName.toLowerCase().includes(cleanQuery) ||
      (item.subcategoryName && item.subcategoryName.toLowerCase().includes(cleanQuery)) ||
      item.tags.some(t => t.toLowerCase().includes(cleanQuery))
    );
  }) : activeItems.slice(0, 6);

  // Exact code match
  const exactCodeMatch = cleanQuery ? activeItems.find(i => i.code.toLowerCase() === cleanQuery) : null;

  // Search Customers
  const matchedCustomers = cleanQuery ? customers.filter(c => {
    return (
      c.name.toLowerCase().includes(cleanQuery) ||
      c.phone.includes(cleanQuery) ||
      c.purchases.some(p => p.toLowerCase().includes(cleanQuery))
    );
  }) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 flex items-center gap-3 bg-slate-50/50">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            id="global-search-input-field"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type item code (e.g. B001, M002), brand (Yamaha), customer, or keyword..."
            className="w-full bg-transparent text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setIsGlobalSearchOpen(false)}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 px-2 py-1 bg-slate-200/70 rounded-md cursor-pointer"
          >
            ESC
          </button>
        </div>

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 divide-y divide-slate-100">
          {/* Exact Match Spotlight Banner */}
          {exactCodeMatch && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-lg border border-blue-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
                  <QRCodeSVG value={`/item/${exactCodeMatch.code}`} size={40} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-mono font-bold">
                      {exactCodeMatch.code}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">{exactCodeMatch.name}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Selling Price: <strong className="text-blue-700">{formatCurrency(exactCodeMatch.sellingPrice)}</strong>
                    {' • '}
                    <span className={`font-semibold ${
                      exactCodeMatch.status === 'AVAILABLE' ? 'text-emerald-600' : 'text-slate-500'
                    }`}>
                      {exactCodeMatch.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {exactCodeMatch.status === 'AVAILABLE' && (
                  <button
                    onClick={() => {
                      setSelectedItemForSale(exactCodeMatch);
                      setIsGlobalSearchOpen(false);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm transition cursor-pointer"
                  >
                    Add to Cart
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedItemForDetail(exactCodeMatch);
                    setIsGlobalSearchOpen(false);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition cursor-pointer"
                >
                  Open Item
                </button>
              </div>
            </div>
          )}

          {/* Items Category List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-500" />
                Inventory Items ({matchedItems.length})
              </span>
              <button
                onClick={() => {
                  setActiveTab('items');
                  setIsGlobalSearchOpen(false);
                }}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                View all in inventory
              </button>
            </div>

            {matchedItems.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400">No items match your search term.</div>
            ) : (
              <div className="space-y-1.5">
                {matchedItems.map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setSelectedItemForDetail(item);
                      setIsGlobalSearchOpen(false);
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between gap-3 cursor-pointer group transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                        {item.photo1 ? (
                          <img src={getItemImageUrl(item.photo1)} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                            {item.code}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/50">
                            {item.code}
                          </span>
                          <span className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-600 transition">
                            {item.name}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                          <span>{item.brand}</span>
                          <span>•</span>
                          <span>{item.categoryName}</span>
                          <span>•</span>
                          <span className={`px-1 rounded text-[10px] font-semibold ${
                            item.status === 'AVAILABLE' ? 'text-emerald-700 bg-emerald-50' : 
                            item.status === 'SOLD' ? 'text-slate-500 bg-slate-100' : 'text-amber-700 bg-amber-50'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {formatCurrency(item.sellingPrice)}
                      </div>
                      {isAdmin && (
                        <div className="text-[10px] text-emerald-600 font-medium">
                          Profit: {formatCurrency(item.sellingPrice - item.costPrice)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Customers search results */}
          {matchedCustomers.length > 0 && (
            <div className="pt-3">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                Matched Customers ({matchedCustomers.length})
              </div>
              <div className="space-y-1.5">
                {matchedCustomers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      setActiveTab('customers');
                      setIsGlobalSearchOpen(false);
                    }}
                    className="p-2.5 rounded-xl hover:bg-slate-50 border border-slate-100 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">{c.name}</div>
                      <div className="text-[11px] text-slate-500">Phone: {c.phone} • Purchases: {c.purchases.join(', ')}</div>
                    </div>
                    <div className="text-xs font-bold text-emerald-600 font-mono">
                      {formatCurrency(c.totalSpent)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">↑↓</span>
            <span>Navigate</span>
            <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 ml-2">↵</span>
            <span>Select</span>
          </div>
          <span>WDJLANKA Global Index</span>
        </div>
      </div>
    </div>
  );
};
