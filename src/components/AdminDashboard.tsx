import React, { useState, useMemo } from 'react';
import { getItemImageUrl } from '../data/supabaseSync';
import { useApp } from '../context/AppContext';
import { DateFilterOption, Item } from '../types';
import { 
  TrendingUp, 
  DollarSign, 
  PackageCheck, 
  Package, 
  Clock, 
  Layers, 
  AlertTriangle, 
  ArrowUpRight, 
  Calendar, 
  Filter, 
  CheckCircle, 
  PlusCircle, 
  QrCode, 
  FileSpreadsheet, 
  ChevronRight,
  Flame,
  PieChart as PieIcon,
  Sparkles,
  BarChart2,
  Search,
  ScanLine,
  ShoppingCart,
  Tag,
  Eye,
  ArrowRight
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const { 
    activeItems, 
    sales, 
    categories, 
    formatCurrency, 
    getStockAge, 
    setSelectedItemForDetail, 
    setSelectedItemForSale,
    setIsAddItemOpen, 
    setIsQRScannerOpen,
    getItemByCode,
    setActiveTab, 
    setSelectedLabelItemCodes
  } = useApp();

  const [dateFilter, setDateFilter] = useState<DateFilterOption>('This Month');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // POS / Cashier quick lookup state
  const [searchCodeInput, setSearchCodeInput] = useState('');
  const [searchedItem, setSearchedItem] = useState<Item | null>(null);
  const [lookupMessage, setLookupMessage] = useState<string | null>(null);

  const handleLookup = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLookupMessage(null);
    if (!searchCodeInput.trim()) {
      setSearchedItem(null);
      return;
    }
    const found = getItemByCode(searchCodeInput.trim());
    if (found) {
      setSearchedItem(found);
      setLookupMessage(null);
    } else {
      setSearchedItem(null);
      setLookupMessage(`No active item found with code "${searchCodeInput.toUpperCase()}"`);
    }
  };

  // Filter sales by date and category
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    return sales.filter(sale => {
      // Category filter
      if (selectedCategoryFilter !== 'ALL' && sale.categoryId !== selectedCategoryFilter) {
        return false;
      }

      // Date filter
      const saleDate = new Date(sale.saleDate);
      const saleDateStr = sale.saleDate.split('T')[0];

      if (dateFilter === 'Today') {
        return saleDateStr === todayStr;
      }
      if (dateFilter === 'Yesterday') {
        const yest = new Date(now);
        yest.setDate(yest.getDate() - 1);
        return saleDateStr === yest.toISOString().split('T')[0];
      }
      if (dateFilter === 'This Week') {
        const oneWeekAgo = new Date(now);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return saleDate >= oneWeekAgo;
      }
      if (dateFilter === 'This Month') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }
      if (dateFilter === 'Last Month') {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return saleDate.getMonth() === lastMonth.getMonth() && saleDate.getFullYear() === lastMonth.getFullYear();
      }
      if (dateFilter === 'This Year') {
        return saleDate.getFullYear() === now.getFullYear();
      }
      return true; // All / Custom
    });
  }, [sales, dateFilter, selectedCategoryFilter]);

  // Metric calculations
  const totalSalesRevenue = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.soldPrice, 0);
  }, [filteredSales]);

  const totalProfit = useMemo(() => {
    return filteredSales.reduce((acc, s) => acc + s.profit, 0);
  }, [filteredSales]);

  const itemsSold = filteredSales.length;

  const availableItems = useMemo(() => {
    return activeItems.filter(i => {
      const catMatch = selectedCategoryFilter === 'ALL' || i.categoryId === selectedCategoryFilter;
      return i.status === 'AVAILABLE' && catMatch;
    });
  }, [activeItems, selectedCategoryFilter]);

  const reservedItems = useMemo(() => {
    return activeItems.filter(i => {
      const catMatch = selectedCategoryFilter === 'ALL' || i.categoryId === selectedCategoryFilter;
      return i.status === 'RESERVED' && catMatch;
    });
  }, [activeItems, selectedCategoryFilter]);

  const stockCost = useMemo(() => {
    return availableItems.reduce((acc, i) => acc + i.costPrice * (i.quantity ?? 1), 0) + reservedItems.reduce((acc, i) => acc + i.costPrice * (i.quantity ?? 1), 0);
  }, [availableItems, reservedItems]);

  const stockSellingValue = useMemo(() => {
    return availableItems.reduce((acc, i) => acc + i.sellingPrice * (i.quantity ?? 1), 0) + reservedItems.reduce((acc, i) => acc + i.sellingPrice * (i.quantity ?? 1), 0);
  }, [availableItems, reservedItems]);

  const potentialUnrealizedProfit = stockSellingValue - stockCost;

  // Category breakdown for sales & profit
  const categoryStats = useMemo(() => {
    const map: Record<string, { name: string; sales: number; profit: number; count: number }> = {};
    
    categories.forEach(c => {
      map[c.id] = { name: c.name, sales: 0, profit: 0, count: 0 };
    });

    filteredSales.forEach(s => {
      if (map[s.categoryId]) {
        map[s.categoryId].sales += s.soldPrice;
        map[s.categoryId].profit += s.profit;
        map[s.categoryId].count += 1;
      } else {
        map[s.categoryId] = { name: s.categoryName, sales: s.soldPrice, profit: s.profit, count: 1 };
      }
    });

    return Object.values(map).filter(c => c.sales > 0 || c.count > 0);
  }, [categories, filteredSales]);

  // Slow moving stock (>90 days)
  const slowMovingStock = useMemo(() => {
    return activeItems
      .filter(i => (i.status === 'AVAILABLE' || i.status === 'RESERVED') && getStockAge(i.dateAdded) > 60)
      .sort((a, b) => getStockAge(b.dateAdded) - getStockAge(a.dateAdded));
  }, [activeItems, getStockAge]);

  const lowStockCategories = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      availableUnits: activeItems.filter((item) => item.categoryId === category.id && (item.status === 'AVAILABLE' || item.status === 'RESERVED')).reduce((sum, item) => sum + (item.quantity ?? 1), 0),
    })).filter((category) => category.availableUnits > 0 && category.availableUnits < 5);
  }, [categories, activeItems]);

  // Most profitable items
  const mostProfitableSales = useMemo(() => {
    return [...filteredSales].sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [filteredSales]);

  // Recent sales
  const recentSales = useMemo(() => {
    return [...sales].sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime()).slice(0, 5);
  }, [sales]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Bento Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4.5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mr-1">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Period:</span>
          </div>
          {(['Today', 'This Week', 'This Month', 'Last Month', 'This Year'] as DateFilterOption[]).map(df => (
            <button
              key={df}
              id={`filter-date-${df.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => setDateFilter(df)}
              className={`px-3 py-1.5 text-xs font-medium rounded-xl transition cursor-pointer ${
                dateFilter === df
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {df}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-slate-500" />
            <span>Category:</span>
          </div>
          <select
            id="admin-category-filter-select"
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          <button
            id="admin-dashboard-add-item-btn"
            onClick={() => setIsAddItemOpen(true)}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>New Item</span>
          </button>
        </div>
      </div>

      {lowStockCategories.length > 0 && (
        <div className="bg-slate-900 text-white p-5 rounded-3xl border border-amber-400/30 shadow-xs shadow-amber-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/15 text-amber-300 flex items-center justify-center"><AlertTriangle className="w-5 h-5" /></div>
            <div><h2 className="text-sm font-bold">Low Stock Alert</h2><p className="text-xs text-slate-400">Categories below the 5-unit threshold need attention.</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockCategories.map((category) => <span key={category.id} className="px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/25 text-xs font-semibold text-amber-200">{category.name}: {category.availableUnits} left</span>)}
          </div>
        </div>
      )}

      {/* Integrated POS / Cashier & Quick Code Lookup Bento Tile */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Integrated POS &amp; Quick Code Lookup</span>
              </h2>
              <p className="text-xs text-slate-500">Scan QR codes, check selling prices, apply discounts, and complete sales directly</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="admin-pos-scan-qr-btn"
              onClick={() => setIsQRScannerOpen(true)}
              className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-2xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <ScanLine className="w-4 h-4" />
              <span>Camera QR Scanner</span>
            </button>
          </div>
        </div>

        {/* Search Bar & Scanner Trigger */}
        <form onSubmit={handleLookup} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="admin-pos-code-lookup-input"
              value={searchCodeInput}
              onChange={(e) => setSearchCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter Short Code or Scan Barcode (e.g. B001, M002, H003)..."
              className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
            {searchCodeInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchCodeInput('');
                  setSearchedItem(null);
                  setLookupMessage(null);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
          <button
            type="submit"
            id="admin-pos-code-lookup-btn"
            className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0 shadow-xs"
          >
            <Search className="w-4 h-4" />
            <span>Check Selling Price</span>
          </button>
        </form>

        {/* Lookup Feedback or No Item Message */}
        {lookupMessage && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{lookupMessage}</span>
          </div>
        )}

        {/* Price-only item lookup and checkout card */}
        {searchedItem && (
          <div className="p-4.5 bg-slate-50/80 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs">
                {searchedItem.photo1 ? (
                  <img src={getItemImageUrl(searchedItem.photo1)} alt={searchedItem.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-mono font-bold text-xs text-slate-400">{searchedItem.code}</span>
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                    {searchedItem.code}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 truncate">{searchedItem.name}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    searchedItem.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {searchedItem.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  {searchedItem.categoryName} • {searchedItem.brand} • Condition: <strong>{searchedItem.condition}</strong>
                </div>
              </div>
            </div>

            {/* Cashier-facing price and discount status only */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 shadow-2xs text-center min-w-[100px]">
                <div className="text-[10px] text-slate-400 font-semibold uppercase">Selling Price</div>
                <div className="font-mono font-bold text-blue-900 text-xs mt-0.5">
                  {formatCurrency(searchedItem.sellingPrice)}
                </div>
              </div>
              <span className={`px-3 py-2 rounded-xl text-xs font-bold ${searchedItem.maxDiscount > 0 || searchedItem.tags.some((tag) => /sale|promo|offer|discount|quick/i.test(tag)) ? 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                {searchedItem.maxDiscount > 0 ? `Discount Available: up to ${formatCurrency(searchedItem.maxDiscount)}` : 'Standard Price'}
              </span>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedItemForDetail(searchedItem)}
                  className="p-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
                  title="View Specs & Photos"
                >
                  <Eye className="w-4 h-4" />
                </button>
                {searchedItem.status === 'AVAILABLE' && (
                  <button
                    onClick={() => setSelectedItemForSale(searchedItem)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shadow-emerald-600/20"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    <span>Add to Cart</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Bento Grid Container */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Bento Tile 1: Total Sales Revenue (Wide Hero Tile) */}
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl border border-slate-800/80 shadow-md flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">Total Sales Revenue</span>
            </div>
            <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-xs border border-white/10">
              <DollarSign className="w-5 h-5 text-blue-400" />
            </div>
          </div>
          <div className="mt-6 relative z-10">
            <div className="text-3xl sm:text-4xl font-black tracking-tight font-mono text-white">
              {formatCurrency(totalSalesRevenue)}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-300 mt-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/20 text-blue-300 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                {itemsSold} Item{itemsSold === 1 ? '' : 's'} Sold
              </span>
              <span className="text-slate-400">in selected period</span>
            </div>
          </div>
        </div>

        {/* Bento Tile 2: Net Realized Profit */}
        <div className="bg-white border border-slate-200/90 p-6 rounded-3xl shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Realized Profit</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">
              {formatCurrency(totalProfit)}
            </div>
            <div className="text-xs text-slate-500 mt-2 flex items-center gap-1">
              <span>Margin:</span>
              <strong className="text-slate-800 font-bold px-1.5 py-0.5 bg-slate-100 rounded-md">
                {totalSalesRevenue > 0 ? `${((totalProfit / totalSalesRevenue) * 100).toFixed(1)}%` : '0%'}
              </strong>
            </div>
          </div>
        </div>

        {/* Bento Tile 3: Physical Stock Count */}
        <div className="bg-white border border-slate-200/90 p-6 rounded-3xl shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Stock Count</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl border border-amber-100">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div>
              <div className="text-2xl font-black text-slate-900 font-mono">{availableItems.reduce((sum, item) => sum + (item.quantity ?? 1), 0)}</div>
              <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Available
              </div>
            </div>
            <div className="text-right border-l border-slate-100 pl-4">
              <div className="text-xl font-bold text-amber-600 font-mono">{reservedItems.length}</div>
              <div className="text-xs text-amber-600 font-semibold mt-0.5">Reserved</div>
            </div>
          </div>
        </div>

        {/* Bento Tile 4: Active Stock Inventory Value */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 p-6 rounded-3xl shadow-xs flex flex-col justify-between hover:border-slate-300 transition">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Inventory Valuation</span>
              <p className="text-xs text-slate-400 mt-0.5">Total retail and acquisition cost breakdown</p>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
            <div>
              <span className="text-xs text-slate-400 font-medium">Selling Value:</span>
              <div className="text-xl font-black text-slate-900 font-mono">{formatCurrency(stockSellingValue)}</div>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-medium">Acquisition Cost:</span>
              <div className="text-sm font-bold text-slate-600 font-mono">{formatCurrency(stockCost)}</div>
            </div>
          </div>
          <div className="text-xs text-purple-700 font-semibold pt-2 mt-2 border-t border-purple-50 flex items-center justify-between bg-purple-50/50 p-2.5 rounded-xl">
            <span>Potential Unrealized Profit:</span>
            <span className="font-mono font-bold">+{formatCurrency(potentialUnrealizedProfit)}</span>
          </div>
        </div>

        {/* Bento Tile 5: Category Performance */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-blue-600" />
                  Category Performance
                </h3>
                <p className="text-xs text-slate-400">Revenue & margins across imported categories</p>
              </div>
            </div>

            <div className="space-y-3">
              {categoryStats.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs">No sales recorded for this filter range yet.</div>
              ) : (
                categoryStats.map(cat => {
                  const salesPct = totalSalesRevenue > 0 ? (cat.sales / totalSalesRevenue) * 100 : 0;

                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600" />
                          <span>{cat.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({cat.count} sold)</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="font-bold text-slate-900">{formatCurrency(cat.sales)}</span>
                          <span className="text-emerald-600 text-[11px] font-semibold">(+{formatCurrency(cat.profit)})</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${Math.max(salesPct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bento Tile 6: Most Profitable Sold Items */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-slate-800">Most Profitable Sold Items</h3>
            </div>
            <button
              onClick={() => setActiveTab('sales')}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              View all sales
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {mostProfitableSales.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No sold items recorded yet.</div>
            ) : (
              mostProfitableSales.map(sale => (
                <div key={sale.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 shrink-0">
                      {sale.itemCode}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{sale.itemName}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        By {sale.employeeName} to {sale.customerName}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 font-mono">
                    <div className="text-xs font-bold text-emerald-600">
                      +{formatCurrency(sale.profit)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {formatCurrency(sale.soldPrice)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Bento Tile 7: Slow-Moving Stock */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-amber-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Slow-Moving Stock Warning</span>
            </div>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-mono">
              {slowMovingStock.length} Items &gt;60d
            </span>
          </div>

          <p className="text-xs text-amber-800/80 mb-3">
            Items requiring faster turnover or promotional discount adjustments:
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {slowMovingStock.length === 0 ? (
              <div className="p-4 bg-emerald-50 rounded-2xl text-center text-xs text-emerald-700">
                <CheckCircle className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
                No slow-moving items detected!
              </div>
            ) : (
              slowMovingStock.map(item => {
                const age = getStockAge(item.dateAdded);
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedItemForDetail(item)}
                    className="p-2.5 bg-amber-50/60 hover:bg-amber-100/70 rounded-2xl border border-amber-200/70 flex items-center justify-between gap-2 cursor-pointer transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-900">{item.code}</span>
                        <span className="text-xs font-semibold text-slate-800 truncate">{item.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {formatCurrency(item.sellingPrice)} • {item.brand}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold ${
                        age > 120 ? 'bg-red-100 text-red-800' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {age} Days
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Bento Tile 8: Quick Operations */}
        <div className="lg:col-span-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            Quick Management & Label Engine Actions
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <button
              onClick={() => {
                setSelectedLabelItemCodes(availableItems.map(i => i.code));
                setActiveTab('qr-labels');
              }}
              className="p-3.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-2xl text-left text-xs font-medium transition flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30">
                  <QrCode className="w-4 h-4" />
                </div>
                <span>Print A4 Labels for Stock</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => setActiveTab('reports')}
              className="p-3.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-2xl text-left text-xs font-medium transition flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30">
                  <BarChart2 className="w-4 h-4" />
                </div>
                <span>Financial Excel/CSV Reports</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className="p-3.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-2xl text-left text-xs font-medium transition flex items-center justify-between cursor-pointer group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 group-hover:bg-purple-500/30">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <span>Customer Purchase Histories</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
