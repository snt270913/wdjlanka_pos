import { MetricGrid, SalesWidgets } from './WorkspaceWidgets';
import { ReceiptHeader } from './ReceiptHeader';
import { ModalLayer } from './ModalLayer';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { downloadReceiptPdf } from '../utils/receiptPdf';
import { useApp } from '../context/AppContext';
import { Sale } from '../types';
import { 
  Search, 
  Download, 
  Calendar, 
  Filter, 
  DollarSign, 
  TrendingUp, 
  User, 
  Phone, 
  FileText, 
  Printer, 
  X,
  CheckCircle,
  Clock
} from 'lucide-react';

export const SalesHistoryView: React.FC = () => {
  const { 
    sales,
    restoreSale, 
    currentUser, 
    formatCurrency, 
    exportToCSV, 
    settings 
  } = useApp();

  const isAdmin = currentUser?.role === 'ADMIN';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('ALL');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('ALL');
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Sale | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState('');
  const [notice, setNotice] = useState('');
  const restoreDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (restoreTarget) restoreDialog.current?.showModal();
    else restoreDialog.current?.close();
  }, [restoreTarget]);
  const confirmRestore = async () => {
    if (!restoreTarget || restoring) return;
    setRestoring(true); setRestoreError('');
    try {
      await restoreSale(restoreTarget.id);
      setNotice(`${restoreTarget.itemCode} restored to available stock.`);
      setRestoreTarget(null);
    } catch (error) {
      setRestoreError(error instanceof Error ? error.message : 'Unable to restore. Please try again.');
    } finally { setRestoring(false); }
  };
  const receiptRef = useRef<HTMLDivElement>(null);

  const [downloading, setDownloading] = useState(false);
  const [receiptError, setReceiptError] = useState('');
  const downloadReceipt = async () => {
    if (!activeReceiptSale || downloading) return;
    setDownloading(true); setReceiptError('');
    try { downloadReceiptPdf([activeReceiptSale], settings); }
    catch { setReceiptError('Unable to download receipt. Please try again.'); }
    finally { setDownloading(false); }
  };

  // Filter sales
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    return sales.filter(s => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = 
          s.itemCode.toLowerCase().includes(q) ||
          s.itemName.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.customerPhone.includes(q) ||
          s.employeeName.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Employee
      if (selectedEmployee !== 'ALL' && s.employeeName !== selectedEmployee) {
        return false;
      }

      // Period
      const saleDate = new Date(s.saleDate);
      const saleDateStr = s.saleDate.split('T')[0];

      if (selectedPeriod === 'TODAY') {
        return saleDateStr === todayStr;
      }
      if (selectedPeriod === 'WEEK') {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return saleDate >= weekAgo;
      }
      if (selectedPeriod === 'MONTH') {
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      }

      return true;
    }).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, searchQuery, selectedPeriod, selectedEmployee]);

  const totalRevenue = useMemo(() => filteredSales.filter(s => !s.restoredAt).reduce((acc, s) => acc + s.soldPrice, 0), [filteredSales]);
  const totalProfit = useMemo(() => filteredSales.filter(s => !s.restoredAt).reduce((acc, s) => acc + s.profit, 0), [filteredSales]);
  const totalDiscount = useMemo(() => filteredSales.filter(s => !s.restoredAt).reduce((acc, s) => acc + s.discount, 0), [filteredSales]);

  // Unique employees from sales
  const employeeNames = Array.from(new Set(sales.map(s => s.employeeName)));

  return (
    <div className="widget-page transactions-page p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex flex-wrap items-center gap-2">
            <span>Sales history</span>
            <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-mono font-bold">
              {filteredSales.length} Transactions
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Review sales, download receipts, or restore items to stock.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportToCSV('sales')}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-2xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Sales CSV</span>
          </button>
        </div>
      </div>

      <MetricGrid metrics={[
        { label: 'Sales revenue', value: formatCurrency(totalRevenue), note: `${filteredSales.filter(s => !s.restoredAt).length} completed sale records`, tone: 'ink' },
        { label: 'Units sold', value: filteredSales.filter(s => !s.restoredAt).reduce((sum,s) => sum + (s.quantity ?? 1),0), note: 'Quantity across completed sales', tone: 'lilac' },
        ...(isAdmin ? [{ label: 'Net profit', value: formatCurrency(totalProfit), note: 'After item acquisition costs', tone: 'mint' as const }] : []),
        { label: 'Discounts', value: formatCurrency(totalDiscount), note: `${filteredSales.filter(s => s.restoredAt).length} restored records excluded`, tone: 'peach' },
      ]}/>
      <SalesWidgets sales={filteredSales} formatCurrency={formatCurrency}/>
      {/* Filters Bar */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center gap-3">
        <div className="w-full md:flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, phone, item code (B001), or item name..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full md:w-auto py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 cursor-pointer transition"
          >
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="WEEK">Past 7 Days</option>
            <option value="MONTH">This Month</option>
          </select>

          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full md:w-auto py-2.5 px-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 cursor-pointer transition"
          >
            <option value="ALL">All Employees</option>
            {employeeNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {notice && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div>}
      <div className="sales-mobile-list">
        {filteredSales.length === 0 && <p className="p-6 text-center text-slate-500">No sales match these filters.</p>}
        {filteredSales.map(sale => <article key={sale.id} className="sale-card">
          <div className="flex justify-between gap-3"><span className="text-xs font-bold text-teal-700">{sale.itemCode}</span><span className={sale.restoredAt ? 'sale-restored' : 'sale-completed'}>{sale.restoredAt ? 'Restored' : 'Completed'}</span></div>
          <h2 className="font-bold text-slate-900 mt-2 break-words">{sale.itemName}</h2>
          <p className="text-sm text-slate-500 mt-1">{sale.customerName} · Qty {sale.quantity || 1}</p>
          <div className="flex justify-between gap-3 my-4"><strong>{formatCurrency(sale.soldPrice)}</strong><span className="text-xs text-slate-500">{new Date(sale.saleDate).toLocaleDateString()}</span></div>
          <div className="flex gap-2"><button className="sale-secondary" onClick={() => setActiveReceiptSale(sale)}>Receipt</button>
          {isAdmin && !sale.restoredAt && <button className="sale-restore" onClick={() => { setRestoreError(''); setRestoreTarget(sale); }}>Restore</button>}</div>
        </article>)}
      </div>
      {/* Sales Records Table */}
      <div className="sales-desktop-table bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/80">
              <tr>
                <th className="p-3.5">Sale ID</th>
                <th className="p-3.5">Item / Code</th>
                <th className="p-3.5">Customer</th>
                <th className="p-3.5">Sold Price</th>
                <th className="p-3.5">Discount</th>
                {isAdmin && <th className="p-3.5">Profit</th>}
                <th className="p-3.5">Handled By</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 8} className="p-8 text-center text-slate-400 font-sans">
                    No sales records found matching the filter.
                  </td>
                </tr>
              ) : (
                filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 text-slate-400 text-[11px]">{sale.id}{sale.restoredAt && <span className="sale-restored block mt-2">Restored</span>}</td>
                    <td className="p-3.5 font-sans">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-slate-100 text-blue-800 px-2 py-0.5 rounded-lg border border-slate-200">
                          {sale.itemCode}
                        </span>
                        <span className="font-bold text-slate-900 text-xs truncate max-w-xs">{sale.itemName}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-sans">
                      <div className="font-semibold text-slate-800">{sale.customerName}</div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900 text-xs">
                      {formatCurrency(sale.soldPrice)}
                    </td>
                    <td className="p-3.5">
                      {sale.discount > 0 ? (
                        <span className="text-amber-700 font-semibold text-[11px]">-{formatCurrency(sale.discount)}</span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="p-3.5 font-bold text-emerald-600 text-xs">
                        +{formatCurrency(sale.profit)}
                      </td>
                    )}
                    <td className="p-3.5 font-sans text-slate-700 text-xs">
                      {sale.employeeName}
                    </td>
                    <td className="p-3.5 text-slate-500 text-[11px]">
                      {new Date(sale.saleDate).toLocaleDateString()}
                    </td>
                    <td className="p-3.5 text-right font-sans">
                      <button
                        onClick={() => setActiveReceiptSale(sale)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                      >
                        Receipt
                      </button>
                      {isAdmin && !sale.restoredAt && <button className="sale-restore mt-2" onClick={() => { setRestoreError(''); setRestoreTarget(sale); }}>Restore</button>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <dialog ref={restoreDialog} className="restore-dialog" onCancel={event => { if (restoring) event.preventDefault(); else setRestoreTarget(null); }} aria-labelledby="restore-title">
        <h2 id="restore-title" className="text-xl font-bold">Restore item?</h2>
        <p className="mt-3 text-sm text-slate-600">Restore <strong>{restoreTarget?.quantity || 1} × {restoreTarget?.itemName}</strong> to available stock. This sale will be excluded from sales and profit totals. Its original record will remain in history.</p>
        <p className="mt-3 text-xs text-slate-500">This does not send a payment or issue a refund.</p>
        {restoreError && <p role="alert" className="mt-4 text-sm text-red-700">{restoreError}</p>}
        <div className="flex gap-3 mt-6"><button className="sale-secondary" disabled={restoring} onClick={() => setRestoreTarget(null)}>Cancel</button><button className="sale-restore" disabled={restoring} onClick={() => void confirmRestore()}>{restoring ? 'Restoring…' : 'Restore item'}</button></div>
      </dialog>
      {/* Invoice / Receipt Modal */}
      {activeReceiptSale && (
        <ModalLayer label="Sale receipt" onClose={() => setActiveReceiptSale(null)}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="receipt-panel bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200">
            <div className="receipt-heading flex items-center justify-between border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Sale Transaction Receipt</h3>
              <button
                onClick={() => setActiveReceiptSale(null)}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="receipt-scroll"><div ref={receiptRef} className="p-4 bg-white rounded-2xl border border-slate-200 font-mono text-xs text-slate-800 space-y-3">
              {activeReceiptSale.restoredAt && <p className="sale-restored">Restored on {new Date(activeReceiptSale.restoredAt).toLocaleDateString()} — excluded from sales totals</p>}
              <div className="text-center border-b border-slate-200 pb-2">
                <ReceiptHeader settings={settings} />
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt Ref:</span>
                  <strong>{activeReceiptSale.id}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{new Date(activeReceiptSale.saleDate).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Item:</span>
                  <span className="font-sans font-bold">{activeReceiptSale.itemCode} - {activeReceiptSale.itemName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-sans">{activeReceiptSale.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sales Officer:</span>
                  <span>{activeReceiptSale.employeeName}</span>
                </div>
                {activeReceiptSale.note && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Notes:</span>
                    <span className="font-sans italic">{activeReceiptSale.note}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 pt-2 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>List Price:</span>
                  <span>{formatCurrency(activeReceiptSale.originalPrice)}</span>
                </div>
                {activeReceiptSale.discount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Discount:</span>
                    <span>-{formatCurrency(activeReceiptSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-300 text-blue-900">
                  <span>Total Paid:</span>
                  <span>{formatCurrency(activeReceiptSale.soldPrice)}</span>
                </div>
              </div>
              <p className="pt-3 text-center text-xs text-slate-500 break-words">{settings.receipt?.footer ?? 'Thank you for your business.'}</p>
            </div>

            </div>
            {receiptError && <p role="alert" className="text-sm text-red-700">{receiptError}</p>}
            <div className="receipt-actions flex items-center gap-2">
              <button
                disabled={downloading} onClick={() => void downloadReceipt()}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? 'Downloading…' : 'Download PDF'}</span>
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
              <button
                onClick={() => setActiveReceiptSale(null)}
                className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
        </ModalLayer>
      )}
    </div>
  );
};
