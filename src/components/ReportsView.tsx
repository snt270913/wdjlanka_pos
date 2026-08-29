import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  BarChart2, 
  TrendingUp, 
  DollarSign, 
  Download, 
  Calendar, 
  Users, 
  Package, 
  PieChart as PieIcon, 
  Clock, 
  FileSpreadsheet,
  Award,
  Sparkles
  , Layers
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { 
    activeItems, 
    sales, 
    categories, 
    users, 
    formatCurrency, 
    getStockAge, 
    exportToCSV 
  } = useApp();

  const [activeReportTab, setActiveReportTab] = useState<'financial' | 'category' | 'employee' | 'aging'>('financial');
  const [dateRange, setDateRange] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'CUSTOM' | 'ALL'>('MONTH');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [subcategoryFilter, setSubcategoryFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState<'ALL' | 'Cash' | 'Card' | 'Credit' | 'Bank Transfer'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [trendGranularity, setTrendGranularity] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const availableMonths = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return Array.from(new Set([currentMonth, ...sales.map((sale) => sale.saleDate.slice(0, 7))])).sort().reverse();
  }, [sales]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const filteredSales = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return sales.filter((sale) => {
      const saleDate = new Date(sale.saleDate);
      const saleDateOnly = sale.saleDate.split('T')[0];
      const dateMatches = dateRange === 'ALL'
        || (dateRange === 'TODAY' && saleDateOnly === today)
        || (dateRange === 'WEEK' && saleDate >= weekStart)
        || (dateRange === 'MONTH' && saleDate >= monthStart)
        || (dateRange === 'CUSTOM' && (!customStartDate || saleDateOnly >= customStartDate) && (!customEndDate || saleDateOnly <= customEndDate));
      const categoryMatches = categoryFilter === 'ALL' || sale.categoryId === categoryFilter;
      const saleItem = activeItems.find((item) => item.id === sale.itemId);
      const subcategoryMatches = subcategoryFilter === 'ALL' || saleItem?.subcategoryId === subcategoryFilter;
      const paymentMatches = paymentFilter === 'ALL' || (sale.paymentType || 'Cash') === paymentFilter;
      return dateMatches && categoryMatches && subcategoryMatches && paymentMatches;
    });
  }, [sales, activeItems, dateRange, categoryFilter, subcategoryFilter, paymentFilter, customStartDate, customEndDate]);

  const availableSubcategories = useMemo(() => categories
    .filter((category) => categoryFilter === 'ALL' || category.id === categoryFilter)
    .flatMap((category) => category.subcategories), [categories, categoryFilter]);

  const monthlySales = useMemo(() => sales.filter((sale) => {
    return sale.saleDate.slice(0, 7) === selectedMonth
      && (categoryFilter === 'ALL' || sale.categoryId === categoryFilter)
      && (subcategoryFilter === 'ALL' || activeItems.find((item) => item.id === sale.itemId)?.subcategoryId === subcategoryFilter)
      && (paymentFilter === 'ALL' || (sale.paymentType || 'Cash') === paymentFilter);
  }), [sales, activeItems, selectedMonth, categoryFilter, subcategoryFilter, paymentFilter]);

  const monthlySummary = useMemo(() => {
    const revenue = monthlySales.reduce((sum, sale) => sum + sale.soldPrice, 0);
    const profit = monthlySales.reduce((sum, sale) => sum + sale.profit, 0);
    const categoryTotals = monthlySales.reduce<Record<string, { name: string; revenue: number }>>((totals, sale) => {
      if (!totals[sale.categoryId]) totals[sale.categoryId] = { name: sale.categoryName, revenue: 0 };
      totals[sale.categoryId].revenue += sale.soldPrice;
      return totals;
    }, {});
    const topCategory = (Object.values(categoryTotals) as { name: string; revenue: number }[]).sort((a, b) => b.revenue - a.revenue)[0]?.name || 'No sales';
    return { revenue, profit, quantity: monthlySales.length, topCategory };
  }, [monthlySales]);

  const selectedMonthLabel = new Date(`${selectedMonth}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const downloadMonthlyReport = () => {
    const rows = [
      ['WDJLANKA Monthly Financial Report', selectedMonthLabel],
      ['Category Filter', categoryFilter === 'ALL' ? 'All Categories' : categories.find((category) => category.id === categoryFilter)?.name || categoryFilter],
      ['Payment Filter', paymentFilter],
      [],
      ['Metric', 'Value'],
      ['Total Revenue', monthlySummary.revenue.toString()],
      ['Total Profit', monthlySummary.profit.toString()],
      ['Total Items Sold', monthlySummary.quantity.toString()],
      ['Top Performing Category', monthlySummary.topCategory],
      [],
      ['Sale ID', 'Date', 'Item', 'Category', 'Revenue', 'Profit', 'Payment Type'],
      ...monthlySales.map((sale) => [sale.id, sale.saleDate, sale.itemName, sale.categoryName, sale.soldPrice.toString(), sale.profit.toString(), sale.paymentType || 'Cash']),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
    link.download = `WDJLANKA_Monthly_Report_${selectedMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Overall financial totals
  const totalRevenue = filteredSales.reduce((a, s) => a + s.soldPrice, 0);
  const totalProfit = filteredSales.reduce((a, s) => a + s.profit, 0);
  const totalDiscount = filteredSales.reduce((a, s) => a + s.discount, 0);
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : '0';

  // Inventory valuation
  const totalInventoryCost = activeItems.reduce((a, i) => a + (i.status !== 'SOLD' && (categoryFilter === 'ALL' || i.categoryId === categoryFilter) ? i.costPrice : 0), 0);
  const totalInventoryRetail = activeItems.reduce((a, i) => a + (i.status !== 'SOLD' && (categoryFilter === 'ALL' || i.categoryId === categoryFilter) ? i.sellingPrice : 0), 0);

  // Category breakdown
  const categoryReports = useMemo(() => {
    const map: Record<string, { id: string; name: string; salesCount: number; revenue: number; profit: number; stockCount: number }> = {};
    
    categories.forEach(c => {
      map[c.id] = { id: c.id, name: c.name, salesCount: 0, revenue: 0, profit: 0, stockCount: 0 };
    });

    // Count stock
    activeItems.forEach(i => {
      if (i.status !== 'SOLD' && map[i.categoryId]) {
        map[i.categoryId].stockCount += 1;
      }
    });

    // Count sales
    filteredSales.forEach(s => {
      if (map[s.categoryId]) {
        map[s.categoryId].salesCount += 1;
        map[s.categoryId].revenue += s.soldPrice;
        map[s.categoryId].profit += s.profit;
      }
    });

    return Object.values(map);
  }, [categories, activeItems, filteredSales]);

  // Employee sales leaderboard
  const employeeReports = useMemo(() => {
    const map: Record<string, { name: string; role: string; salesCount: number; totalSold: number; totalProfit: number }> = {};

    users.forEach(u => {
      map[u.name] = { name: u.name, role: u.role, salesCount: 0, totalSold: 0, totalProfit: 0 };
    });

    filteredSales.forEach(s => {
      if (!map[s.employeeName]) {
        map[s.employeeName] = { name: s.employeeName, role: 'Staff', salesCount: 0, totalSold: 0, totalProfit: 0 };
      }
      map[s.employeeName].salesCount += 1;
      map[s.employeeName].totalSold += s.soldPrice;
      map[s.employeeName].totalProfit += s.profit;
    });

    return Object.values(map).sort((a, b) => b.totalSold - a.totalSold);
  }, [users, filteredSales]);

  const trendData = useMemo(() => {
    const grouped: Record<string, { revenue: number; expenses: number }> = {};
    filteredSales.forEach((sale) => {
      const date = new Date(sale.saleDate);
      const day = trendGranularity === 'MONTHLY'
        ? sale.saleDate.slice(0, 7)
        : trendGranularity === 'WEEKLY'
          ? `${date.getFullYear()}-W${String(Math.ceil((date.getDate() + new Date(date.getFullYear(), date.getMonth(), 1).getDay()) / 7)).padStart(2, '0')}`
          : sale.saleDate.split('T')[0];
      if (!grouped[day]) grouped[day] = { revenue: 0, expenses: 0 };
      grouped[day].revenue += sale.soldPrice;
      grouped[day].expenses += sale.cost;
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-8);
  }, [filteredSales, trendGranularity]);

  const topCategories = useMemo(() => {
    return categoryReports.filter((category) => category.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [categoryReports]);

  const paymentBreakdown = useMemo(() => {
    const totals: Record<'Cash' | 'Card' | 'Credit' | 'Bank Transfer', number> = {
      Cash: 0,
      Card: 0,
      Credit: 0,
      'Bank Transfer': 0,
    };
    filteredSales.forEach((sale) => {
      totals[sale.paymentType || 'Cash'] += sale.soldPrice;
    });
    return Object.entries(totals).filter(([, value]) => value > 0) as [string, number][];
  }, [filteredSales]);

  const categoryAnalytics = useMemo(() => {
    const totalQuantity = categoryReports.reduce((sum, category) => sum + category.salesCount, 0);
    const totalCategoryProfit = categoryReports.reduce((sum, category) => sum + category.profit, 0);
    return categoryReports
      .filter((category) => category.salesCount > 0)
      .sort((a, b) => b.salesCount - a.salesCount)
      .map((category) => ({
        ...category,
        quantityShare: totalQuantity > 0 ? (category.salesCount / totalQuantity) * 100 : 0,
        profitShare: totalCategoryProfit > 0 ? (category.profit / totalCategoryProfit) * 100 : 0,
      }));
  }, [categoryReports]);

  const subcategoryAnalytics = useMemo(() => {
    const map: Record<string, { name: string; categoryName: string; quantity: number; revenue: number; profit: number }> = {};
    filteredSales.forEach((sale) => {
      const item = activeItems.find((entry) => entry.id === sale.itemId);
      const name = item?.subcategoryName || 'Unassigned';
      const key = `${sale.categoryId}:${name}`;
      if (!map[key]) map[key] = { name, categoryName: sale.categoryName, quantity: 0, revenue: 0, profit: 0 };
      map[key].quantity += 1;
      map[key].revenue += sale.soldPrice;
      map[key].profit += sale.profit;
    });
    return Object.values(map).map((entry) => ({ ...entry, revenueShare: totalRevenue ? (entry.revenue / totalRevenue) * 100 : 0 })).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, activeItems, totalRevenue]);

  const trendMax = Math.max(...trendData.flatMap(([, values]) => [values.revenue, values.expenses]), 1);
  const trendPoints = trendData.map(([day, values], index) => ({
    day,
    revenue: values.revenue,
    expenses: values.expenses,
    x: trendData.length === 1 ? 50 : (index / (trendData.length - 1)) * 100,
    revenueY: 100 - (values.revenue / trendMax) * 88,
    expensesY: 100 - (values.expenses / trendMax) * 88,
  }));

  const comparison = useMemo(() => {
    if (dateRange === 'ALL' || dateRange === 'CUSTOM') return null;
    const now = new Date();
    const periodDays = dateRange === 'TODAY' ? 1 : dateRange === 'WEEK' ? 7 : 30;
    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - periodDays);
    const previousStart = new Date(currentStart);
    previousStart.setDate(currentStart.getDate() - periodDays);
    const previousRevenue = sales.filter((sale) => {
      const date = new Date(sale.saleDate);
      return date >= previousStart && date < currentStart && (categoryFilter === 'ALL' || sale.categoryId === categoryFilter);
    }).reduce((sum, sale) => sum + sale.soldPrice, 0);
    return previousRevenue ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : null;
  }, [dateRange, sales, categoryFilter, totalRevenue]);

  const itemVelocity = useMemo(() => {
    const map: Record<string, { name: string; quantity: number; revenue: number; profit: number }> = {};
    filteredSales.forEach((sale) => {
      if (!map[sale.itemId]) map[sale.itemId] = { name: sale.itemName, quantity: 0, revenue: 0, profit: 0 };
      map[sale.itemId].quantity += 1;
      map[sale.itemId].revenue += sale.soldPrice;
      map[sale.itemId].profit += sale.profit;
    });
    return Object.values(map).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  }, [filteredSales]);

  const topProfitItems = useMemo(() => [...itemVelocity].sort((a, b) => b.profit - a.profit).slice(0, 5), [itemVelocity]);

  // Aging items (>90 days)
  const agingItems = activeItems
    .filter(i => (i.status === 'AVAILABLE' || i.status === 'RESERVED') && getStockAge(i.dateAdded) > 60)
    .sort((a, b) => getStockAge(b.dateAdded) - getStockAge(a.dateAdded));

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Executive Business Analytics &amp; Reports</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Comprehensive audit reports for imports, revenue, margins, and staff</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV('sales')}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download All Data CSV</span>
          </button>
          <button
            onClick={downloadMonthlyReport}
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold rounded-2xl shadow-md shadow-cyan-500/20 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Monthly Report</span>
          </button>
        </div>
      </div>

      {/* Tabs & Range Bar (Bento Tile) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setActiveReportTab('financial')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeReportTab === 'financial' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Financial &amp; Revenue
          </button>
          <button
            onClick={() => setActiveReportTab('category')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeReportTab === 'category' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Category Margins
          </button>
          <button
            onClick={() => setActiveReportTab('employee')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeReportTab === 'employee' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Employee Leaderboard
          </button>
          <button
            onClick={() => setActiveReportTab('aging')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              activeReportTab === 'aging' ? 'bg-white text-amber-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Aging Stock Audit
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 items-center gap-2.5 w-full md:w-auto">
          <select
            aria-label="Date range"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="py-2 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 cursor-pointer transition"
          >
            <option value="TODAY">Today</option>
            <option value="WEEK">This Week</option>
            <option value="MONTH">This Month</option>
            <option value="CUSTOM">Custom Range</option>
            <option value="ALL">All Time</option>
          </select>
          <select aria-label="Category filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="py-2 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 cursor-pointer transition">
            <option value="ALL">All Categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select aria-label="Subcategory filter" value={subcategoryFilter} onChange={(e) => setSubcategoryFilter(e.target.value)} className="py-2 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 cursor-pointer transition">
            <option value="ALL">All Subcategories</option>
            {availableSubcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
          </select>
          <select aria-label="Payment type filter" value={paymentFilter} onChange={(e) => setPaymentFilter(e.target.value as typeof paymentFilter)} className="py-2 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 cursor-pointer transition">
            <option value="ALL">All Payment Types</option>
            <option value="Cash">Cash</option>
            <option value="Card">Card</option>
            <option value="Credit">Credit</option>
            <option value="Bank Transfer">Bank Transfer</option>
          </select>
          {dateRange === 'CUSTOM' && <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <input aria-label="Start date" type="date" value={customStartDate} onChange={(e) => setCustomStartDate(e.target.value)} className="min-w-0 w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800" />
            <input aria-label="End date" type="date" value={customEndDate} onChange={(e) => setCustomEndDate(e.target.value)} className="min-w-0 w-full py-2 px-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800" />
          </div>}
        </div>
      </div>

      {/* Report Tab Contents */}
      {activeReportTab === 'financial' && (
        <div className="space-y-5">
          <div className="bg-slate-900 text-white rounded-3xl border border-cyan-400/25 p-6 shadow-xs shadow-cyan-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-sm font-bold">Monthly Report Export &amp; Summary</h2>
                <p className="text-[11px] text-slate-400 mt-1">Accounting-ready results for the selected month</p>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-300" />
                <select aria-label="Monthly report month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-100 outline-none focus:border-cyan-400">
                  {availableMonths.map((month) => <option key={month} value={month}>{new Date(`${month}-01T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option>)}
                </select>
                <button onClick={downloadMonthlyReport} className="p-2 rounded-xl bg-cyan-400 text-slate-950 hover:bg-cyan-300 cursor-pointer" title="Download selected monthly report"><Download className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4"><div className="text-[10px] uppercase tracking-wider text-slate-500">Revenue</div><div className="text-lg font-black font-mono text-cyan-300 mt-1">{formatCurrency(monthlySummary.revenue)}</div></div>
              <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4"><div className="text-[10px] uppercase tracking-wider text-slate-500">Profit</div><div className="text-lg font-black font-mono text-emerald-300 mt-1">+{formatCurrency(monthlySummary.profit)}</div></div>
              <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4"><div className="text-[10px] uppercase tracking-wider text-slate-500">Items Sold</div><div className="text-lg font-black font-mono text-white mt-1">{monthlySummary.quantity}</div></div>
              <div className="rounded-2xl bg-slate-800/80 border border-slate-700 p-4"><div className="text-[10px] uppercase tracking-wider text-slate-500">Top Category</div><div className="text-sm font-bold text-amber-300 mt-2 truncate" title={monthlySummary.topCategory}>{monthlySummary.topCategory}</div></div>
            </div>
          </div>
          {/* 4 Financial Highlight Bento Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5.5 rounded-3xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Sales Revenue</span>
              <div className="text-2xl font-black text-blue-900 font-mono mt-1">{formatCurrency(totalRevenue)}</div>
              <div className="text-xs text-slate-500 mt-1">{filteredSales.length} items sold</div>
            </div>

            <div className="bg-white p-5.5 rounded-3xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Realized Profit</span>
              <div className="text-2xl font-black text-emerald-600 font-mono mt-1">+{formatCurrency(totalProfit)}</div>
              <div className="text-xs text-emerald-700 mt-1">Overall margin: {profitMargin}%</div>
            </div>

            <div className="bg-white p-5.5 rounded-3xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Inventory Cost</span>
              <div className="text-2xl font-black text-purple-900 font-mono mt-1">{formatCurrency(totalInventoryCost)}</div>
              <div className="text-xs text-slate-500 mt-1">Total physical goods tied up</div>
            </div>

            <div className="bg-white p-5.5 rounded-3xl border border-slate-200/90 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Potential Inventory Value</span>
              <div className="text-2xl font-black text-slate-900 font-mono mt-1">{formatCurrency(totalInventoryRetail)}</div>
              <div className="text-xs text-purple-600 mt-1">Unrealized profit: +{formatCurrency(totalInventoryRetail - totalInventoryCost)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 shadow-xs overflow-hidden">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-sm font-bold">Revenue vs Expenses</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Daily performance for the active filters</p>
                </div>
                <div className="flex items-center gap-2">
                  {comparison !== null && <span className={`text-[10px] font-bold ${comparison >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{comparison >= 0 ? '+' : ''}{comparison.toFixed(1)}% vs prior</span>}
                  <select aria-label="Trend grouping" value={trendGranularity} onChange={(e) => setTrendGranularity(e.target.value as typeof trendGranularity)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-slate-200">
                    <option value="DAILY">Daily</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 text-[10px] font-semibold mb-2">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Revenue</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Expenses</span>
              </div>
              {trendData.length === 0 ? <div className="h-40 flex items-center justify-center text-xs text-slate-500">No sales match these filters.</div> : <div className="relative h-48">
                <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-40" role="img" aria-label="Revenue versus expenses trend chart">
                  <defs>
                    <linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                    </linearGradient>
                    <linearGradient id="expense-fill" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.22" />
                      <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[25, 50, 75].map((line) => <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="#334155" strokeWidth="0.5" strokeDasharray="2 2" />)}
                  <polygon points={`0,100 ${trendPoints.map((point) => `${point.x},${point.revenueY}`).join(' ')} 100,100`} fill="url(#revenue-fill)" />
                  <polygon points={`0,100 ${trendPoints.map((point) => `${point.x},${point.expensesY}`).join(' ')} 100,100`} fill="url(#expense-fill)" />
                  <polyline points={trendPoints.map((point) => `${point.x},${point.revenueY}`).join(' ')} fill="none" stroke="#22d3ee" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                  <polyline points={trendPoints.map((point) => `${point.x},${point.expensesY}`).join(' ')} fill="none" stroke="#fbbf24" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="absolute left-0 right-0 bottom-0 flex justify-between gap-2 border-b border-slate-700 pb-1">
                  {trendPoints.map((point) => <span key={point.day} className="text-[9px] text-slate-500 truncate">{point.day.slice(5)}</span>)}
                </div>
              </div>}
            </div>

            <div className="lg:col-span-2 bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 shadow-xs">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-sm font-bold">Top Categories Performance</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Revenue by category</p>
                </div>
                <PieIcon className="w-5 h-5 text-blue-600" />
              </div>
              {topCategories.length === 0 ? <div className="h-40 flex items-center justify-center text-xs text-slate-500">No category data.</div> : <div className="space-y-4">
                {topCategories.map((category) => {
                  const maxRevenue = topCategories[0].revenue || 1;
                  return <div key={category.id}>
                    <div className="flex justify-between gap-3 text-xs mb-1.5"><span className="font-semibold text-slate-200 truncate">{category.name}</span><span className="font-mono font-bold text-cyan-300">{formatCurrency(category.revenue)}</span></div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" style={{ width: `${(category.revenue / maxRevenue) * 100}%` }} /></div>
                  </div>;
                })}
              </div>}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 shadow-xs">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold">Payment Method Breakdown</h3>
                <p className="text-[11px] text-slate-400 mt-1">Revenue share across the active selection</p>
              </div>
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
            {paymentBreakdown.length === 0 ? <div className="h-16 flex items-center text-xs text-slate-500">No payment data matches these filters.</div> : <div className="space-y-3">
              <div className="h-4 flex overflow-hidden rounded-full bg-slate-800">
                {paymentBreakdown.map(([method, value], index) => <div key={method} title={`${method}: ${formatCurrency(value)}`} className={`h-full ${index % 2 === 0 ? 'bg-cyan-400' : 'bg-amber-400'}`} style={{ width: `${(value / totalRevenue) * 100}%` }} />)}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {paymentBreakdown.map(([method, value], index) => <div key={method} className="text-xs"><div className="flex items-center gap-1.5 text-slate-300"><span className={`w-2 h-2 rounded-full ${index % 2 === 0 ? 'bg-cyan-400' : 'bg-amber-400'}`} />{method}</div><div className="font-mono font-bold text-white mt-1">{((value / totalRevenue) * 100).toFixed(1)}%</div></div>)}
              </div>
            </div>}
          </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 shadow-xs">
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h3 className="text-sm font-bold">Category Revenue Share</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Distribution of filtered sales</p>
                  </div>
                  <PieIcon className="w-5 h-5 text-cyan-300" />
                </div>
                {topCategories.length === 0 ? <div className="h-40 flex items-center justify-center text-xs text-slate-500">No category data.</div> : <div className="flex items-center gap-5">
                  <div className="relative w-36 h-36 shrink-0 rounded-full" style={{ background: `conic-gradient(${topCategories.map((category, index) => {
                    const start = (topCategories.slice(0, index).reduce((sum, item) => sum + item.revenue, 0) / totalRevenue) * 100;
                    const end = (topCategories.slice(0, index + 1).reduce((sum, item) => sum + item.revenue, 0) / totalRevenue) * 100;
                    return `${['#22d3ee', '#3b82f6', '#a78bfa', '#fbbf24', '#34d399'][index % 5]} ${start}% ${end}%`;
                  }).join(', ')})` }}>
                    <div className="absolute inset-5 rounded-full bg-slate-900 flex flex-col items-center justify-center"><span className="text-[10px] text-slate-400">Revenue</span><span className="text-sm font-black text-white">100%</span></div>
                  </div>
                  <div className="space-y-2 min-w-0">
                    {topCategories.map((category, index) => <div key={category.id} className="flex items-center gap-2 text-[10px] min-w-0"><span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ['#22d3ee', '#3b82f6', '#a78bfa', '#fbbf24', '#34d399'][index % 5] }} /><span className="text-slate-300 truncate">{category.name}</span><span className="font-mono text-white ml-auto">{((category.revenue / totalRevenue) * 100).toFixed(0)}%</span></div>)}
                  </div>
                </div>}
              </div>

              <div className="lg:col-span-2 bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 shadow-xs">
                <div className="mb-5">
                  <h3 className="text-sm font-bold">Category Profitability Signals</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Quantity leadership and profit margin share</p>
                </div>
                {categoryAnalytics.length === 0 ? <div className="h-32 flex items-center justify-center text-xs text-slate-500">No category data.</div> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Top Selling Categories by Quantity</div>
                    {categoryAnalytics.slice(0, 4).map((category, index) => <div key={category.id} className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full shrink-0" style={{ background: `conic-gradient(#22d3ee ${category.quantityShare}%, #1e293b 0)` }}><div className="absolute inset-1 rounded-full bg-slate-900 flex items-center justify-center text-[9px] font-mono text-cyan-300">{category.quantityShare.toFixed(0)}%</div></div>
                      <div className="min-w-0"><div className="text-xs font-semibold text-slate-200 truncate">{category.name}</div><div className="text-[10px] text-slate-500">{category.salesCount} units sold</div></div>
                      {index === 0 && <span className="ml-auto text-[9px] font-bold text-cyan-300 border border-cyan-400/30 rounded-full px-2 py-1">TOP</span>}
                    </div>)}
                  </div>
                  <div className="space-y-3">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Profit Margin Share per Category</div>
                    {categoryAnalytics.slice().sort((a, b) => b.profitShare - a.profitShare).slice(0, 4).map((category) => <div key={category.id} className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full shrink-0" style={{ background: `conic-gradient(#34d399 ${Math.min(category.profitShare, 100)}%, #1e293b 0)` }}><div className="absolute inset-1 rounded-full bg-slate-900 flex items-center justify-center text-[9px] font-mono text-emerald-300">{category.profitShare.toFixed(0)}%</div></div>
                      <div className="min-w-0"><div className="text-xs font-semibold text-slate-200 truncate">{category.name}</div><div className="text-[10px] text-slate-500">+{formatCurrency(category.profit)} profit</div></div>
                    </div>)}
                  </div>
                </div>}
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl border border-cyan-400/20 p-6 shadow-xs">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-sm font-bold">Category Quantity &amp; Profitability Breakdown</h3>
                  <p className="text-[11px] text-slate-400 mt-1">A filtered view of category contribution</p>
                </div>
                <TrendingUp className="w-5 h-5 text-cyan-300" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-left text-xs">
                  <thead className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-800"><tr><th className="pb-3">Category Name</th><th className="pb-3">Total Quantity Sold</th><th className="pb-3">Total Revenue Generated</th><th className="pb-3">Net Profit Contribution</th></tr></thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {categoryAnalytics.map((category, index) => <tr key={category.id} className={index === 0 ? 'bg-cyan-400/[0.06]' : ''}><td className="py-3 font-semibold text-slate-200">{category.name} {index === 0 && <span className="ml-2 inline-flex rounded-full border border-cyan-400/40 px-2 py-0.5 text-[9px] font-bold text-cyan-300">TOP PERFORMER</span>}</td><td className="py-3 font-mono text-cyan-300">{category.salesCount}</td><td className="py-3 font-mono text-white">{formatCurrency(category.revenue)}</td><td className="py-3 font-mono font-bold text-emerald-300">{category.profitShare.toFixed(1)}%</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 shadow-xs">
              <div className="flex items-start justify-between mb-5"><div><h3 className="text-sm font-bold">Category &amp; Subcategory Deep-Dive</h3><p className="text-[11px] text-slate-400 mt-1">Sales volume and revenue share of filtered inventory</p></div><Layers className="w-5 h-5 text-cyan-300" /></div>
              <div className="space-y-4">
                {categoryAnalytics.map((category) => <div key={category.id}><div className="flex justify-between text-xs mb-1.5"><span className="font-semibold text-slate-200">{category.name}</span><span className="font-mono text-cyan-300">{category.salesCount} sold · {((category.revenue / Math.max(totalRevenue, 1)) * 100).toFixed(1)}%</span></div><div className="h-2 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${(category.revenue / Math.max(totalRevenue, 1)) * 100}%` }} /></div></div>)}
                {subcategoryAnalytics.slice(0, 6).map((subcategory) => <div key={`${subcategory.categoryName}-${subcategory.name}`} className="pl-3 border-l border-slate-700"><div className="flex justify-between text-[11px] gap-3"><span className="text-slate-400 truncate">{subcategory.categoryName} / {subcategory.name}</span><span className="font-mono text-slate-300 shrink-0">{subcategory.quantity} · {subcategory.revenueShare.toFixed(1)}% rev · {((subcategory.profit / Math.max(totalProfit, 1)) * 100).toFixed(1)}% profit</span></div><div className="h-1.5 mt-1 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full bg-indigo-400" style={{ width: `${subcategory.revenueShare}%` }} /></div></div>)}
                {categoryAnalytics.length === 0 && <p className="text-xs text-slate-500">No sales match the active filters.</p>}
              </div>
            </div>

            <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 shadow-xs">
              <div className="flex items-start justify-between mb-5"><div><h3 className="text-sm font-bold">Fast-Moving vs Slow-Moving Stock</h3><p className="text-[11px] text-slate-400 mt-1">Ranked by quantity sold and revenue contribution</p></div><Package className="w-5 h-5 text-amber-300" /></div>
              {itemVelocity.length === 0 ? <p className="text-xs text-slate-500">No sales match the active filters.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><div className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold mb-3">Fast-moving</div><div className="space-y-3">{itemVelocity.slice(0, 4).map((item, index) => <div key={item.name}><div className="flex justify-between gap-2 text-xs"><span className="text-slate-200 truncate">{index + 1}. {item.name}</span><span className="font-mono text-emerald-300">{item.quantity}</span></div><div className="h-1.5 mt-1 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(item.revenue / Math.max(totalRevenue, 1)) * 100}%` }} /></div></div>)}</div></div><div><div className="text-[10px] uppercase tracking-wider text-amber-300 font-bold mb-3">Slow-moving</div><div className="space-y-3">{itemVelocity.slice(-4).reverse().map((item) => <div key={item.name}><div className="flex justify-between gap-2 text-xs"><span className="text-slate-300 truncate">{item.name}</span><span className="font-mono text-amber-300">{item.quantity}</span></div><div className="h-1.5 mt-1 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${(item.revenue / Math.max(totalRevenue, 1)) * 100}%` }} /></div></div>)}</div></div></div>}
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl border border-emerald-400/20 p-6 shadow-xs">
            <div className="flex items-start justify-between mb-5"><div><h3 className="text-sm font-bold">Top-Performing Items by Profitability</h3><p className="text-[11px] text-slate-400 mt-1">Highest net profit contribution in the active selection</p></div><Award className="w-5 h-5 text-amber-300" /></div>
            {topProfitItems.length === 0 ? <p className="text-xs text-slate-500">No sales match the active filters.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">{topProfitItems.map((item, index) => <div key={item.name} className={`rounded-2xl border p-4 ${index === 0 ? 'border-amber-300/50 bg-amber-300/[0.08]' : 'border-slate-800 bg-slate-800/60'}`}><div className="text-[10px] text-slate-500 font-mono">#{index + 1}</div><div className="text-xs font-bold text-slate-200 mt-2 line-clamp-2">{item.name}</div><div className="text-sm font-black font-mono text-emerald-300 mt-3">+{formatCurrency(item.profit)}</div><div className="text-[10px] text-slate-500 mt-1">{item.quantity} sale{item.quantity === 1 ? '' : 's'} · {((item.profit / Math.max(totalProfit, 1)) * 100).toFixed(1)}% share</div></div>)}</div>}
          </div>

          {/* Detailed Financial Summary Bento Card */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800">Financial Audit Breakdown</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2 border-r border-slate-100 pr-4">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Gross Goods Selling Price Total:</span>
                  <span className="font-mono font-bold">{formatCurrency(totalRevenue + totalDiscount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Total Customer Discounts Absorbed:</span>
                  <span className="font-mono font-bold text-amber-700">-{formatCurrency(totalDiscount)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 font-semibold text-slate-900">
                  <span>Net Cash Inflow:</span>
                  <span className="font-mono font-bold text-blue-700">{formatCurrency(totalRevenue)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Total Acquisition Cost of Sold Items:</span>
                  <span className="font-mono font-bold text-slate-700">{formatCurrency(totalRevenue - totalProfit)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">Average Profit per Unit Sold:</span>
                  <span className="font-mono font-bold text-emerald-600">
                    +{formatCurrency(filteredSales.length > 0 ? Math.round(totalProfit / filteredSales.length) : 0)}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100 font-semibold text-slate-900">
                  <span>Net Business Profit:</span>
                  <span className="font-mono font-bold text-emerald-600">+{formatCurrency(totalProfit)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeReportTab === 'category' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4 overflow-hidden">
          <h3 className="text-sm font-bold text-slate-800">Category Sales &amp; Margin Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Category</th>
                  <th className="p-3">In Stock Units</th>
                  <th className="p-3">Units Sold</th>
                  <th className="p-3">Total Sales Revenue</th>
                  <th className="p-3">Net Profit</th>
                  <th className="p-3">Profit Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {categoryReports.map(cat => {
                  const margin = cat.revenue > 0 ? ((cat.profit / cat.revenue) * 100).toFixed(1) : '0';
                  return (
                    <tr key={cat.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-sans font-bold text-slate-900">{cat.name}</td>
                      <td className="p-3 text-slate-600">{cat.stockCount} Available</td>
                      <td className="p-3 text-blue-700 font-bold">{cat.salesCount} Sold</td>
                      <td className="p-3 font-bold text-slate-900">{formatCurrency(cat.revenue)}</td>
                      <td className="p-3 font-bold text-emerald-600">+{formatCurrency(cat.profit)}</td>
                      <td className="p-3 font-bold text-slate-700">{margin}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeReportTab === 'employee' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Employee Sales &amp; Transaction Leaderboard
            </h3>
          </div>

          <div className="divide-y divide-slate-100">
            {employeeReports.map((emp, index) => (
              <div key={emp.name} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                    index === 0 ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    index === 1 ? 'bg-slate-200 text-slate-800' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    #{index + 1}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">{emp.name}</div>
                    <div className="text-[11px] text-slate-500">{emp.role} • {emp.salesCount} Deals Closed</div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <div className="text-xs font-bold text-slate-900">{formatCurrency(emp.totalSold)}</div>
                  <div className="text-[10px] text-emerald-600 font-semibold">Profit: +{formatCurrency(emp.totalProfit)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeReportTab === 'aging' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-xs space-y-4 overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                Slow-Moving Stock Audit (&gt;60 Days in Warehouse)
              </h3>
              <p className="text-xs text-slate-500">Unsold items tying up working capital in storage</p>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg">
              {agingItems.length} Flagged Items
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Acquisition Cost</th>
                  <th className="p-3">Retail Price</th>
                  <th className="p-3">Stock Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {agingItems.map(item => {
                  const age = getStockAge(item.dateAdded);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-blue-700">{item.code}</td>
                      <td className="p-3 font-sans font-bold text-slate-900">{item.name}</td>
                      <td className="p-3 font-sans text-slate-600">{item.categoryName}</td>
                      <td className="p-3 text-slate-600">{formatCurrency(item.costPrice)}</td>
                      <td className="p-3 text-slate-900 font-bold">{formatCurrency(item.sellingPrice)}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          age > 120 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {age} Days
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
