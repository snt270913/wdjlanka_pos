import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CustomerRequest, CustomerRequestStatus } from '../types';
import { ClipboardList, Plus, Search, X, CheckCircle2, PackageSearch, Clock3, Ban, Trash2 } from 'lucide-react';

const statusLabels: Record<CustomerRequestStatus, string> = {
  PENDING: 'Pending',
  SOURCED: 'Sourced',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

const statusStyles: Record<CustomerRequestStatus, string> = {
  PENDING: 'bg-amber-400/15 text-amber-200 border-amber-400/30',
  SOURCED: 'bg-cyan-400/15 text-cyan-200 border-cyan-400/30',
  COMPLETED: 'bg-emerald-400/15 text-emerald-200 border-emerald-400/30',
  CANCELLED: 'bg-rose-400/15 text-rose-200 border-rose-400/30',
};

const statusIcons: Record<CustomerRequestStatus, React.ElementType> = {
  PENDING: Clock3,
  SOURCED: PackageSearch,
  COMPLETED: CheckCircle2,
  CANCELLED: Ban,
};

export const CustomerRequestsView: React.FC = () => {
  const { customerRequests, addCustomerRequest, updateCustomerRequest, deleteCustomerRequest } = useApp();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | CustomerRequestStatus>('ALL');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');

  const filteredRequests = useMemo(() => customerRequests.filter((request) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || request.customerName.toLowerCase().includes(query) || request.customerPhone.toLowerCase().includes(query) || request.itemName.toLowerCase().includes(query);
    return matchesSearch && (statusFilter === 'ALL' || request.status === statusFilter);
  }), [customerRequests, search, statusFilter]);

  const resetForm = () => {
    setCustomerName(''); setCustomerPhone(''); setItemName(''); setQuantity(1); setNotes('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!customerName.trim() || !customerPhone.trim() || !itemName.trim() || quantity < 1) return;
    addCustomerRequest({ customerName: customerName.trim(), customerPhone: customerPhone.trim(), itemName: itemName.trim(), quantity, notes: notes.trim() || undefined });
    resetForm();
    setIsFormOpen(false);
  };

  const cycleStatus = (request: CustomerRequest) => {
    const statuses: CustomerRequestStatus[] = ['PENDING', 'SOURCED', 'COMPLETED', 'CANCELLED'];
    const next = statuses[(statuses.indexOf(request.status) + 1) % statuses.length];
    updateCustomerRequest(request.id, { status: next });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-slate-900 text-cyan-300 border border-cyan-400/20 flex items-center justify-center"><ClipboardList className="w-5 h-5" /></div><div><h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Customer Requests</h1><p className="text-xs text-slate-500 mt-0.5">Track wishlist items and special sourcing requests.</p></div></div>
        </div>
        <button onClick={() => setIsFormOpen(true)} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-400/30 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"><Plus className="w-4 h-4" /> Add Customer Request</button>
      </div>

      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, phone, or requested item" className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-xs text-white outline-none focus:border-cyan-400" /></div>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-200 outline-none focus:border-cyan-400"><option value="ALL">All Statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>

      {filteredRequests.length === 0 ? <div className="bg-slate-900 rounded-3xl border border-slate-800 p-12 text-center text-slate-500 text-sm">No customer requests match your filters.</div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{filteredRequests.map((request) => { const StatusIcon = statusIcons[request.status]; return <article key={request.id} className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-5 shadow-xs hover:border-cyan-400/30 transition"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] uppercase tracking-wider text-slate-500">Requested item</div><h2 className="text-base font-bold text-slate-100 mt-1">{request.itemName}</h2></div><button onClick={() => { if (window.confirm('Delete this customer request?')) deleteCustomerRequest(request.id); }} className="p-1.5 text-slate-500 hover:text-rose-300 cursor-pointer" title="Delete request"><Trash2 className="w-4 h-4" /></button></div><div className="mt-4 space-y-2 text-xs"><div className="flex justify-between gap-3"><span className="text-slate-500">Customer</span><span className="text-slate-200 font-semibold text-right">{request.customerName}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Phone</span><span className="text-slate-300 font-mono">{request.customerPhone}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Quantity</span><span className="text-cyan-300 font-mono font-bold">{request.quantity}</span></div><div className="flex justify-between gap-3"><span className="text-slate-500">Request date</span><span className="text-slate-400 font-mono">{request.requestDate}</span></div></div>{request.notes && <p className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400">{request.notes}</p>}<button onClick={() => cycleStatus(request)} className={`mt-4 w-full px-3 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer ${statusStyles[request.status]}`} title="Click to advance status"><StatusIcon className="w-4 h-4" /> {statusLabels[request.status]} <span className="text-[10px] opacity-60">Update</span></button></article>; })}</div>}

      {isFormOpen && <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4"><form onSubmit={handleSubmit} className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-900">New Customer Request</h2><p className="text-xs text-slate-500 mt-1">Request date is generated automatically.</p></div><button type="button" onClick={() => setIsFormOpen(false)} className="p-2 text-slate-400 hover:text-slate-800 cursor-pointer"><X className="w-5 h-5" /></button></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-xs font-semibold text-slate-700">Customer Name<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></label><label className="text-xs font-semibold text-slate-700">Phone Number<input required value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></label></div><label className="text-xs font-semibold text-slate-700 block">Requested Item / Description<input required value={itemName} onChange={(event) => setItemName(event.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></label><label className="text-xs font-semibold text-slate-700 block">Quantity Needed<input required min={1} type="number" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-mono" /></label><label className="text-xs font-semibold text-slate-700 block">Notes / Special Instructions<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm" /></label><button type="submit" className="w-full py-3 bg-slate-900 text-cyan-300 rounded-xl font-bold text-sm cursor-pointer">Save Request</button></form></div>}
    </div>
  );
};
