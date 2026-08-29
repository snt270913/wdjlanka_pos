import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  ShoppingCart, 
  Users, 
  Tag, 
  BarChart3, 
  QrCode, 
  Settings, 
  Trash2, 
  FileSpreadsheet, 
  ShieldCheck, 
  Building2,
  ScanLine,
  LogOut
  , ClipboardList
} from 'lucide-react';

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, setMobileOpen }) => {
  const { 
    currentUser, 
    activeTab, 
    setActiveTab, 
    setIsAddItemOpen, 
    setIsQRScannerOpen,
    activeItems, 
    recycleBinItems, 
    setIsRecycleBinOpen,
    setIsGoogleSheetsModalOpen,
    logout
  } = useApp();

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard & POS',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'items',
      label: 'Items Catalog',
      icon: Package,
      badge: activeItems.length,
    },
    {
      id: 'add-item',
      label: 'Add New Item',
      icon: PlusCircle,
      badge: null,
      isAction: true,
      action: () => setIsAddItemOpen(true),
    },
    {
      id: 'sales',
      label: 'Sales History',
      icon: ShoppingCart,
      badge: null,
    },
    {
      id: 'customers',
      label: 'Customers',
      icon: Users,
      badge: null,
    },
    {
      id: 'customer-requests',
      label: 'Customer Requests',
      icon: ClipboardList,
      badge: null,
    },
    {
      id: 'tags',
      label: 'Tags Manager',
      icon: Tag,
      badge: null,
    },
    {
      id: 'reports',
      label: 'Financial Reports',
      icon: BarChart3,
      badge: null,
    },
    {
      id: 'qr-labels',
      label: 'A4 QR Labels',
      icon: QrCode,
      badge: null,
    },
    {
      id: 'settings',
      label: 'Settings & Config',
      icon: Settings,
      badge: null,
    },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.isAction && item.action) {
      item.action();
    } else {
      setActiveTab(item.id);
    }
    setMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 bottom-0 w-64 bg-[#0F172A] text-slate-300 border-r border-slate-800/90 z-50 flex flex-col transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Company Header */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-white tracking-tight text-sm truncate">WDJLANKA<span className="text-blue-400">(PVT)LTD</span></h1>
              <p className="text-[11px] text-slate-400 truncate font-medium">Admin POS &amp; Inventory</p>
            </div>
          </div>
        </div>

        {/* User Role Bento Card */}
        <div className="p-3 mx-3 mt-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden ring-1 ring-blue-400/30">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                'A'
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{currentUser?.name || 'Administrator'}</div>
              <div className="flex items-center gap-1 mt-0.5">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 text-[9px] font-bold rounded-md uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  <ShieldCheck className="w-2.5 h-2.5 text-blue-400" />
                  Admin Only
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Camera Scanner Shortcut */}
        <div className="px-3 pt-3">
          <button
            id="sidebar-quick-scan-button"
            onClick={() => setIsQRScannerOpen(true)}
            className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-md shadow-blue-900/30 transition cursor-pointer"
          >
            <ScanLine className="w-4 h-4" />
            <span>Scan QR / Barcode</span>
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleNavClick(item)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-2xl text-xs font-medium transition cursor-pointer group
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold' 
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'}
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span>{item.label}</span>
                </div>
                
                {item.badge !== null && (
                  <span className={`px-2 py-0.5 text-[10px] rounded-lg font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Utility Actions */}
        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <button
            id="sidebar-google-sheets-button"
            onClick={() => setIsGoogleSheetsModalOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-emerald-300 hover:bg-emerald-950/30 rounded-xl transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Google Sheets Sync</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </button>

          <button
            id="sidebar-recycle-bin-button"
            onClick={() => setIsRecycleBinOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Recycle Bin</span>
            </div>
            {recycleBinItems.length > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] bg-rose-500/20 text-rose-300 rounded-full font-mono">
                {recycleBinItems.length}
              </span>
            )}
          </button>

          <button
            id="sidebar-logout-button"
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-400 hover:text-red-300 hover:bg-red-950/30 rounded-xl transition cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
