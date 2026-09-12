import { LayoutDashboard, Package, Plus, ShoppingBag, Menu } from 'lucide-react';
import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { AdminDashboard } from './components/AdminDashboard';
import { ItemsView } from './components/ItemsView';
import { SalesHistoryView } from './components/SalesHistoryView';
import { CustomerDirectoryView } from './components/CustomerDirectoryView';
import { QRLabelGeneratorView } from './components/QRLabelGeneratorView';
import { ReportsView } from './components/ReportsView';
import { TagManagementView } from './components/TagManagementView';
import { SettingsView } from './components/SettingsView';
import { LoginScreen } from './components/LoginScreen';
import { CustomerRequestsView } from './components/CustomerRequestsView';

// Modals
import { AddItemModal } from './components/AddItemModal';
import { MarkSoldModal } from './components/MarkSoldModal';
import { ItemDetailModal } from './components/ItemDetailModal';
import { QRScannerModal } from './components/QRScannerModal';
import { GlobalSearchModal } from './components/GlobalSearchModal';

const AppContent: React.FC = () => {
  const { activeTab, setActiveTab, setIsAddItemOpen, currentUser, authLoading, dataError } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (authLoading) return <main className="min-h-screen grid place-items-center bg-slate-950 text-white">Checking session...</main>;

  if (!currentUser) {
    return <LoginScreen />;
  }

  // Render tab views in Admin-Only portal
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'items':
        return <ItemsView />;
      case 'sales':
        return <SalesHistoryView />;
      case 'customers':
        return <CustomerDirectoryView />;
      case 'customer-requests':
        return <CustomerRequestsView />;
      case 'tags':
        return <TagManagementView />;
      case 'reports':
        return <ReportsView />;
      case 'qr-labels':
        return <QRLabelGeneratorView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <AdminDashboard />;
    }
  };

  return (
    <div className="pos-shell min-h-screen bg-slate-100 text-slate-900 flex font-sans antialiased selection:bg-blue-500 selection:text-white">
      {/* Navigation Sidebar */}
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      {/* Main Content Area */}
      <div className="pos-workspace flex-1 flex flex-col min-w-0 lg:pl-64 bg-[#F8FAFC] min-h-screen">
        <Header setMobileOpen={setMobileOpen} />
        
        <main className="pos-content flex-1 overflow-y-auto pb-16 lg:pb-8">
          {dataError ? <div role="alert" className="p-6 text-red-700">{dataError}<button className="block mt-4 underline" onClick={() => window.location.reload()}>Reload</button></div> : <div key={activeTab} className="pos-page">{renderTabContent()}</div>}
        </main>
      </div>

      <nav className="mobile-dock" aria-label="Quick navigation">
        <button aria-current={activeTab === 'dashboard' ? 'page' : undefined} onClick={() => setActiveTab('dashboard')}><LayoutDashboard size={20} /><span>Overview</span></button>
        <button aria-current={activeTab === 'items' ? 'page' : undefined} onClick={() => setActiveTab('items')}><Package size={20} /><span>Items</span></button>
        <button className="dock-add" onClick={() => setIsAddItemOpen(true)}><Plus size={24} /><span>Add item</span></button>
        <button aria-current={activeTab === 'sales' ? 'page' : undefined} onClick={() => setActiveTab('sales')}><ShoppingBag size={20} /><span>Sales</span></button>
        <button aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}><Menu size={20} /><span>More</span></button>
      </nav>
      {/* Universal Global Modals */}
      <AddItemModal />
      <MarkSoldModal />
      <ItemDetailModal />
      <QRScannerModal />
      <GlobalSearchModal />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
