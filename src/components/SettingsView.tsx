import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Category } from '../types';
import { 
  Building2, 
  Layers, 
  Trash2, 
  FileSpreadsheet, 
  PlusCircle, 
  RotateCcw, 
  Check, 
  Download,
  LockKeyhole
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    categories, 
    addCategory, 
    generateCategoryCode,
    deleteCategory, 
    updateCategory,
    deleteSubcategory,
    deleteItemType,
    recycleBinItems, 
    restoreItem, 
    permanentlyDeleteItem, 
    resetAllDataToDefault, 
    exportToCSV, 
    formatCurrency 
  } = useApp();

  const [activeSection, setActiveSection] = useState<'business' | 'security' | 'categories' | 'sheets' | 'recycle'>('business');

  // Business settings state
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [address, setAddress] = useState(settings.address);
  const [currency, setCurrency] = useState(settings.currency);
  const [businessSavedMessage, setBusinessSavedMessage] = useState(false);

  // New category state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinMessage, setPinMessage] = useState<string | null>(null);
  const [pinError, setPinError] = useState(false);
  const newCategoryCode = generateCategoryCode(newCatName);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [editingSubcategoryKey, setEditingSubcategoryKey] = useState<string | null>(null);
  const [editingSubcategoryName, setEditingSubcategoryName] = useState('');

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      companyName,
      tagline,
      phone,
      email,
      address,
      currency,
    });
    setBusinessSavedMessage(true);
    setTimeout(() => setBusinessSavedMessage(false), 3000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    addCategory(newCatName.trim(), undefined, newCatDesc.trim() || undefined);
    setNewCatName('');
    setNewCatDesc('');
  };

  const startCategoryEdit = (categoryId: string, currentName: string) => {
    setEditingCategoryId(categoryId);
    setEditingCategoryName(currentName);
  };

  const saveCategoryEdit = (categoryId: string) => {
    const name = editingCategoryName.trim();
    if (name) updateCategory(categoryId, { name });
    setEditingCategoryId(null);
  };

  const saveSubcategoryEdit = (categoryId: string, subcategoryId: string) => {
    const name = editingSubcategoryName.trim();
    if (!name) return;
    const category = categories.find((entry) => entry.id === categoryId);
    if (category) updateCategory(categoryId, { subcategories: category.subcategories.map((entry) => entry.id === subcategoryId ? { ...entry, name } : entry) });
    setEditingSubcategoryKey(null);
  };

  const handleRenameItemType = (categoryId: string, subcategoryId: string, typeId: string, currentName: string) => {
    const name = window.prompt('Item type name', currentName)?.trim();
    if (!name || name === currentName) return;
    const category = categories.find((entry) => entry.id === categoryId);
    if (category) updateCategory(categoryId, { subcategories: category.subcategories.map((subcategory) => subcategory.id === subcategoryId ? { ...subcategory, itemTypes: subcategory.itemTypes.map((type) => type.id === typeId ? { ...type, name } : type) } : subcategory) });
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinMessage(null);
    setPinError(false);
    const storedPin = localStorage.getItem('wdj_admin_pin') || '1234';
    if (currentPin !== storedPin || newPin.length < 4 || newPin !== confirmPin) {
      setPinError(true);
      setPinMessage(
        currentPin !== storedPin
          ? 'Current PIN is incorrect.'
          : newPin.length < 4
            ? 'New PIN must be at least 4 characters long.'
            : 'New PINs do not match.'
      );
      return;
    }
    localStorage.setItem('wdj_admin_pin', newPin);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setPinMessage('Admin PIN updated successfully.');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">System &amp; Business Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">Control company credentials, custom categories, Google Sheets database &amp; recycle bin</p>
      </div>

      {/* Nav Tabs Bento Bar */}
      <div className="bg-white p-2 rounded-3xl border border-slate-200/90 shadow-xs flex flex-wrap gap-1.5">
        <button
          onClick={() => setActiveSection('business')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSection === 'business' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Business Info</span>
        </button>

        <button
          onClick={() => setActiveSection('categories')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSection === 'categories' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Category Management ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveSection('security')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSection === 'security' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <LockKeyhole className="w-4 h-4" />
          <span>Security &amp; Admin PIN</span>
        </button>

        <button
          onClick={() => setActiveSection('sheets')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSection === 'sheets' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Google Sheets Database</span>
        </button>

        <button
          onClick={() => setActiveSection('recycle')}
          className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
            activeSection === 'recycle' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Recycle Bin ({recycleBinItems.length})</span>
        </button>
      </div>

      {/* Section 1: Business Details */}
      {activeSection === 'business' && (
        <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-slate-800">Company &amp; Invoice Credentials</h3>
            {businessSavedMessage && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Changes Saved!
              </span>
            )}
          </div>

          <form onSubmit={handleSaveBusiness} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Company Registered Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Tagline / Motto</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Official Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Currency Code</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Showroom / Warehouse Address</label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition cursor-pointer shadow-xs"
              >
                Save Business Profile
              </button>
            </div>
          </form>
        </div>
      )}

      {activeSection === 'security' && (
        <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 text-cyan-300 flex items-center justify-center"><LockKeyhole className="w-5 h-5" /></div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Security &amp; Admin PIN</h3>
              <p className="text-xs text-slate-500">Update the PIN used for the WDJLANKA admin login.</p>
            </div>
          </div>
          {pinMessage && <div className={`rounded-xl border p-3 text-xs font-semibold ${pinError ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{pinMessage}</div>}
          <form onSubmit={handleChangePin} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Current PIN</label>
              <input type="password" inputMode="numeric" value={currentPin} onChange={(e) => setCurrentPin(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">New PIN</label>
                <input type="password" inputMode="numeric" minLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" required />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Confirm New PIN</label>
                <input type="password" inputMode="numeric" minLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition" required />
              </div>
            </div>
            <button type="submit" className="px-5 py-2.5 bg-slate-900 hover:bg-slate-700 text-white rounded-2xl font-bold transition cursor-pointer shadow-xs">Update Admin PIN</button>
          </form>
        </div>
      )}

      {/* Section 2: Category Management */}
      {activeSection === 'categories' && (
        <div className="space-y-5">
          {/* Add Category Form Bento Card */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs max-w-2xl">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <PlusCircle className="w-4 h-4 text-blue-600" />
              Add Custom Category (Non-Hardcoded Hierarchy)
            </h3>
            <form onSubmit={handleAddCategory} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Category Name</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Camping Gear"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                  required
                />
                <div className="mt-1 text-[10px] font-mono text-blue-600">Auto code: {newCatName ? newCategoryCode : 'Generated from name'}</div>
              </div>

              <div className="sm:flex items-end">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition cursor-pointer"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>

          {/* Categories Bento List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono font-bold text-xs bg-blue-50 text-blue-800 px-2 py-0.5 rounded-lg border border-blue-200">
                      Prefix: {cat.prefix}
                    </span>
                    {editingCategoryId === cat.id ? (
                      <div className="flex items-center gap-1 mt-1">
                        <input autoFocus value={editingCategoryName} onChange={(e) => setEditingCategoryName(e.target.value)} className="w-full px-2 py-1 rounded-lg border border-blue-300 text-xs font-bold text-slate-900" />
                        <button onClick={() => saveCategoryEdit(cat.id)} className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold cursor-pointer">Save</button>
                        <button onClick={() => setEditingCategoryId(null)} className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-bold cursor-pointer">Cancel</button>
                      </div>
                    ) : <h4 className="text-sm font-bold text-slate-900 mt-1">{cat.name}</h4>}
                  </div>
                  <div className="flex items-center gap-1">
                    {editingCategoryId !== cat.id && <button onClick={() => startCategoryEdit(cat.id, cat.name)} className="px-2 py-1 text-[10px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer">Edit</button>}
                    <button onClick={() => { if (window.confirm(`Delete category "${cat.name}"?`)) deleteCategory(cat.id); }} className="p-1.5 hover:bg-rose-50 text-slate-300 hover:text-rose-600 rounded-xl transition cursor-pointer" title="Delete category"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>

                {cat.subcategories.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Subcategories:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {cat.subcategories.map(sub => (
                        <span key={sub.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px]">
                          {editingSubcategoryKey === `${cat.id}:${sub.id}` ? (
                            <><input autoFocus value={editingSubcategoryName} onChange={(e) => setEditingSubcategoryName(e.target.value)} className="w-24 px-1 py-0.5 rounded border border-blue-300 text-[10px]" /><button onClick={() => saveSubcategoryEdit(cat.id, sub.id)} className="text-emerald-600 font-bold cursor-pointer">Save</button><button onClick={() => setEditingSubcategoryKey(null)} className="text-slate-500 font-bold cursor-pointer">Cancel</button></>
                          ) : <><span>{sub.name}</span><button onClick={() => { setEditingSubcategoryKey(`${cat.id}:${sub.id}`); setEditingSubcategoryName(sub.name); }} className="text-blue-600 font-bold cursor-pointer" title="Edit subcategory">Edit</button></>}
                          <button onClick={() => { if (window.confirm(`Delete subcategory "${sub.name}"?`)) deleteSubcategory(cat.id, sub.id); }} className="text-rose-500 cursor-pointer" title="Delete subcategory">×</button>
                        </span>
                      ))}
                    </div>
                    <div className="pt-2 space-y-1.5">
                      {cat.subcategories.flatMap((sub) => sub.itemTypes.map((type) => ({ sub, type }))).map(({ sub, type }) => <div key={type.id} className="flex items-center justify-between text-[10px] text-slate-500 pl-2"><span>↳ {sub.name} / {type.name}</span><span className="flex gap-2"><button onClick={() => handleRenameItemType(cat.id, sub.id, type.id, type.name)} className="text-blue-600 font-bold cursor-pointer">Edit</button><button onClick={() => { if (window.confirm(`Delete item type "${type.name}"?`)) deleteItemType(cat.id, sub.id, type.id); }} className="text-rose-500 cursor-pointer">Delete</button></span></div>)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section 3: Google Sheets Real Database Layer */}
      {activeSection === 'sheets' && (
        <div className="bg-white p-7 rounded-3xl border border-slate-200/90 shadow-xs max-w-3xl space-y-6">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Google Sheets Database Layer</h3>
              <p className="text-xs text-slate-500">Initial database architecture syncing Items Sheet, Sales Sheet &amp; Customers</p>
            </div>
          </div>

          <div className="p-4.5 bg-emerald-50/60 rounded-2xl border border-emerald-200 text-xs text-emerald-950 space-y-2">
            <div className="font-bold flex items-center gap-2 text-emerald-900">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected Google Spreadsheet: "WDJLANKA_DATABASE_2025"
            </div>
            <p className="text-[11px] text-emerald-800">
              All inventory items, sales records, and timestamps persist securely in browser storage and are fully exportable to CSV/Excel formats.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <button
              onClick={() => exportToCSV('items')}
              className="p-4.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left space-y-1 transition cursor-pointer"
            >
              <div className="font-bold text-xs text-slate-900">Export Items Sheet</div>
              <div className="text-[10px] text-slate-500">Download complete inventory CSV</div>
            </button>

            <button
              onClick={() => exportToCSV('sales')}
              className="p-4.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left space-y-1 transition cursor-pointer"
            >
              <div className="font-bold text-xs text-slate-900">Export Sales Sheet</div>
              <div className="text-[10px] text-slate-500">Download sales audit transactions</div>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Reset all demo data back to default initial seed items?')) {
                  resetAllDataToDefault();
                }
              }}
              className="p-4.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-2xl text-left space-y-1 transition cursor-pointer"
            >
              <div className="font-bold text-xs text-rose-900">Reset Demo Database</div>
              <div className="text-[10px] text-rose-700">Restore factory sample seed items</div>
            </button>
          </div>
        </div>
      )}

      {/* Section 5: Recycle Bin per Section 41 */}
      {activeSection === 'recycle' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Recycle Bin &amp; Soft Deleted Items</h3>
              <p className="text-xs text-slate-500">
                Safe deletion: Deleted items remain in recycle bin so historical sales records are never corrupted.
              </p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full">
              {recycleBinItems.length} Deleted Items
            </span>
          </div>

          {recycleBinItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Recycle bin is empty. No deleted items.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recycleBinItems.map(item => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-lg">
                      {item.code}
                    </span>
                    <div>
                      <div className="font-bold text-slate-800">{item.name}</div>
                      <div className="text-[11px] text-slate-500">{item.brand} • {item.categoryName}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => restoreItem(item.id)}
                      className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold rounded-xl transition cursor-pointer"
                    >
                      Restore to Inventory
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Permanently destroy item ${item.code}?`)) {
                          permanentlyDeleteItem(item.id);
                        }
                      }}
                      className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
                      title="Permanently Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
