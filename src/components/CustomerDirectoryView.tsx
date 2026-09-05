import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { 
  Users, 
  Search, 
  Phone, 
  Package, 
  DollarSign, 
  Calendar, 
  ChevronRight, 
  UserCheck, 
  X,
  Clock,
  Sparkles
} from 'lucide-react';

export const CustomerDirectoryView: React.FC = () => {
  const { customers, sales, formatCurrency, setSelectedItemForDetail, getItemByCode } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.purchases.some(p => p.toLowerCase().includes(q))
      );
    }).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [customers, searchQuery]);

  // Customer purchase sales history
  const customerSales = useMemo(() => {
    if (!selectedCustomer) return [];
    return sales.filter(s => 
      s.customerPhone === selectedCustomer.phone || 
      s.customerName.toLowerCase() === selectedCustomer.name.toLowerCase()
    );
  }, [selectedCustomer, sales]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Customer Directory</span>
            <span className="text-xs px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-mono font-bold">
              {filteredCustomers.length} Verified Buyers
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Purchases, warranty track records, and lifetime customer value</p>
        </div>
      </div>

      {/* Search Input (Bento Card) */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, mobile number (077...), or purchased item code (B001)..."
            className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Customers Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-400 bg-white rounded-3xl border border-slate-200/90 shadow-xs">
            No customers found matching "{searchQuery}".
          </div>
        ) : (
          filteredCustomers.map(customer => (
            <div
              key={customer.id}
              onClick={() => setSelectedCustomer(customer)}
              className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs hover:border-emerald-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 font-bold flex items-center justify-center text-sm border border-emerald-200/80 shadow-2xs">
                      {customer.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition">
                        {customer.name}
                      </h3>
                      <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                      </div>
                      {customer.customerCode && <div className="text-[10px] text-blue-600 font-mono mt-0.5">{customer.customerCode}</div>}
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-mono">
                    {customer.purchases.length} item{customer.purchases.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs text-slate-500">Lifetime Value:</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">
                    {formatCurrency(customer.totalSpent)}
                  </span>
                </div>

                {/* Purchased item pills */}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {customer.purchases.map(code => (
                    <span key={code} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-mono font-bold border border-slate-200/60">
                      {code}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 pt-2.5 text-[11px] text-slate-400 flex items-center justify-between border-t border-slate-50">
                <span>Last Active: {customer.lastPurchaseDate}</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Customer Detail Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shadow-2xs">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedCustomer.name}</h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total summary */}
            <div className="p-4.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-800 font-medium">Total Spent:</span>
                <div className="text-xl font-black text-emerald-900 font-mono">
                  {formatCurrency(selectedCustomer.totalSpent)}
                </div>
              </div>
              <div className="text-right text-xs text-emerald-800">
                <span className="font-semibold">{selectedCustomer.purchases.length} Items Purchased</span>
              </div>
            </div>

            {/* Purchase breakdown list */}
            <div className="flex-1 overflow-y-auto space-y-2">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Purchase History</h4>
              
              {customerSales.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400">
                  Item codes on file: {selectedCustomer.purchases.join(', ')}
                </div>
              ) : (
                customerSales.map(sale => (
                  <div key={sale.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-200">
                          {sale.itemCode}
                        </span>
                        <span className="font-bold text-slate-900">{sale.itemName}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Sold on {new Date(sale.saleDate).toLocaleDateString()} by {sale.employeeName}
                      </div>
                    </div>

                    <div className="text-right font-mono font-bold text-slate-900">
                      {formatCurrency(sale.soldPrice)}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
