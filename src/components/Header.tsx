import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Search, 
  ScanLine, 
  Bell, 
  Menu, 
  ShieldCheck, 
  UserCheck, 
  RotateCcw, 
  Sparkles, 
  AlertTriangle, 
  ImageOff, 
  Clock, 
  CheckCircle,
  ExternalLink,
  ChevronDown,
  Layers
} from 'lucide-react';

interface HeaderProps {
  setMobileOpen: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({ setMobileOpen }) => {
  const { 
    currentUser, 
    setCurrentUser, 
    users, 
    activeItems, 
    getStockAge, 
    setIsGlobalSearchOpen, 
    setIsQRScannerOpen,
    resetAllDataToDefault,
    setSelectedItemForDetail,
    activeTab
  } = useApp();

  const [alertsOpen, setAlertsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setAlertsOpen(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Calculate notifications/alerts
  const slowMovingItems = activeItems.filter(i => (i.status === 'AVAILABLE' || i.status === 'RESERVED') && getStockAge(i.dateAdded) > 90);
  const missingPhotoItems = activeItems.filter(i => !i.photo1);
  const missingPriceItems = activeItems.filter(i => !i.sellingPrice || i.sellingPrice <= 0);

  const totalAlertsCount = slowMovingItems.length + missingPhotoItems.length + missingPriceItems.length;

  const tabTitles: Record<string, string> = {
    dashboard: 'WDJLANKA POS & Business Dashboard',
    items: 'Inventory Management (All Items)',
    sales: 'Sales History & Records',
    customers: 'Customer Directory & History',
    'customer-requests': 'Customer Requests & Special Orders',
    tags: 'Tag & Condition Management',
    reports: 'Business Analytics & Profit Reports',
    'qr-labels': 'A4 QR Code Label Printing Engine',
    settings: 'System & Business Settings',
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          id="header-mobile-menu-button"
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <span>{tabTitles[activeTab] || 'WDJLANKA(PVT)LTD'}</span>
          </h2>
          <div className="text-[11px] text-slate-500 hidden sm:flex items-center gap-2">
            <span>Branch: Maharagama Central</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Database Connected
            </span>
          </div>
        </div>
      </div>

      {/* Right section: Search bar, QR Scanner, Alerts, User Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Search Button */}
        <button
          id="header-global-search-button"
          onClick={() => setIsGlobalSearchOpen(true)}
          className="flex items-center gap-2.5 px-3.5 py-2 bg-slate-100/90 hover:bg-slate-200/90 text-slate-500 hover:text-slate-800 rounded-2xl text-xs transition border border-slate-200/60 cursor-pointer shadow-2xs"
        >
          <Search className="w-4 h-4 text-slate-400" />
          <span className="hidden md:inline">Search item code (e.g. B001), name...</span>
          <span className="md:hidden">Search</span>
          <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-slate-200 rounded-md">
            ⌘K
          </kbd>
        </button>

        {/* Quick QR Scanner Button */}
        <button
          id="header-qr-scanner-button"
          onClick={() => setIsQRScannerOpen(true)}
          title="Scan QR Code via Camera"
          className="p-2 sm:px-3.5 sm:py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-2xl text-xs font-semibold flex items-center gap-2 border border-blue-200/70 transition cursor-pointer shadow-2xs"
        >
          <ScanLine className="w-4 h-4 text-blue-600" />
          <span className="hidden sm:inline">Scan QR</span>
        </button>

        {/* Notifications / Alerts Popover */}
        <div className="relative" ref={alertsRef}>
          <button
            id="header-notifications-button"
            onClick={() => setAlertsOpen(!alertsOpen)}
            className={`p-2 rounded-2xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition relative cursor-pointer ${
              alertsOpen ? 'bg-slate-100' : ''
            }`}
            title="System Alerts & Slow Stock"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {totalAlertsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {alertsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200/90 py-3 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4.5 pb-2.5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Inventory Alerts & Insights
                </h3>
                <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {totalAlertsCount} Notice{totalAlertsCount === 1 ? '' : 's'}
                </span>
              </div>

              <div className="max-h-80 overflow-y-auto p-3 space-y-2 text-xs">
                {slowMovingItems.length > 0 && (
                  <div className="p-3.5 bg-amber-50/70 rounded-2xl border border-amber-200/60">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold mb-1">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>{slowMovingItems.length} Slow-Moving Item{slowMovingItems.length > 1 ? 's' : ''} (&gt;90 Days)</span>
                    </div>
                    <p className="text-[11px] text-amber-700 mb-2">Items held in warehouse without sale. Consider setting discount tags.</p>
                    <div className="flex flex-wrap gap-1.5">
                      {slowMovingItems.slice(0, 4).map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setSelectedItemForDetail(item);
                            setAlertsOpen(false);
                          }}
                          className="px-2.5 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-[10px] font-mono font-bold cursor-pointer transition"
                        >
                          {item.code} ({getStockAge(item.dateAdded)}d)
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {missingPhotoItems.length > 0 && (
                  <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200/60">
                    <div className="flex items-center gap-2 text-blue-900 font-semibold mb-1">
                      <ImageOff className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>{missingPhotoItems.length} Item{missingPhotoItems.length > 1 ? 's' : ''} Missing Photos</span>
                    </div>
                    <p className="text-[11px] text-blue-700">Add physical photos for employee search clarity.</p>
                  </div>
                )}

                {totalAlertsCount === 0 && (
                  <div className="py-6 text-center text-slate-400">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-1.5" />
                    <p className="text-xs font-medium text-slate-600">All inventory in healthy status</p>
                    <p className="text-[10px] text-slate-400">No warnings or aging alerts found.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Administrator Profile Dropdown */}
        <div className="relative" ref={userRef}>
          <button
            id="header-user-menu-button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 p-1.5 sm:px-3.5 sm:py-1.5 rounded-2xl hover:bg-slate-100 transition border border-slate-200/70 cursor-pointer shadow-2xs"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden ring-1 ring-blue-300">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                'A'
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[140px]">{currentUser?.name || 'WDJLANKA Admin'}</div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <span className="font-semibold text-blue-600">Administrator</span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-3xl shadow-2xl border border-slate-200/90 py-2.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-3.5 py-2 border-b border-slate-100">
                <div className="text-xs font-bold text-slate-800">{currentUser?.name || 'WDJLANKA Admin'}</div>
                <div className="text-[11px] text-slate-500">@{currentUser?.username || 'admin'} • {currentUser?.phone || '+94 77 123 4567'}</div>
                <div className="mt-1">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold">
                    <ShieldCheck className="w-3 h-3" />
                    Full Admin Access
                  </span>
                </div>
              </div>

              <div className="mt-1 pt-1 px-1.5">
                <button
                  onClick={() => {
                    if (window.confirm('Reset all demo inventory and sales back to default initial seed data?')) {
                      resetAllDataToDefault();
                      setUserMenuOpen(false);
                    }
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Demo Inventory &amp; Sales</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
