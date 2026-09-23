import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Sale } from '../types';
import { 
  X, 
  ShoppingCart, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  FileText,
  Download,
  Sparkles,
  Building2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { downloadReceiptPdf } from '../utils/receiptPdf';
import { getItemImageUrl } from '../data/supabaseSync';

export const MarkSoldModal: React.FC = () => {
  const { 
    selectedItemForSale,
    setSelectedItemForSale,
    cart,
    isCartOpen,
    checkoutCart,
    updateCartLine,
    removeCartLine,
    clearCart,
    currentUser, 
    formatCurrency, 
    settings 
  } = useApp();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedSales, setCompletedSales] = useState<Sale[]>([]);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  useEffect(() => {
    if (selectedItemForSale) {
      setCustomerName('');
      setCustomerPhone('');
      setNote('');
      setErrorMessage(null);
      setCompletedSales([]);
    }
  }, [selectedItemForSale]);

  if (!isCartOpen && completedSales.length === 0) return null;

  const item = cart[0]?.item || selectedItemForSale!;
  const cartTotal = cart.reduce((sum, line) => sum + Math.max(0, line.item.sellingPrice * line.quantity - (line.discountEnabled ? line.discount : 0)), 0);
  const cartDiscount = cart.reduce((sum, line) => sum + (line.discountEnabled ? line.discount : 0), 0);
  const handleClose = () => {
    clearCart();
    setCompletedSales([]);
  };

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCheckingOut) return;
    setErrorMessage(null);
    setIsCheckingOut(true);
    try {
      const res = await checkoutCart(customerName.trim(), customerPhone.trim(), note.trim() || undefined);
      if (res.success && res.sales.length > 0) {
        setCompletedSales(res.sales);
        try {
          confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
        } catch {
          // ignore animation failures
        }
      } else {
        setErrorMessage(res.message);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to complete checkout. Please try again.');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleDownloadInvoice = async () => {
    if (completedSales.length === 0 || isDownloadingInvoice) return;

    setIsDownloadingInvoice(true);
    try {
      downloadReceiptPdf(completedSales, settings);
    } catch {
      setErrorMessage('Unable to generate the invoice. Please try again.');
    } finally {
      setIsDownloadingInvoice(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-sm overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {completedSales.length > 0 ? 'Sale Completed!' : 'Checkout Cart'}
              </h2>
              <p className="text-xs text-slate-500">
                {completedSales.length > 0 ? 'Transaction recorded to inventory & Google Sheets' : `${cart.length} item${cart.length === 1 ? '' : 's'} ready for checkout`}
              </p>
            </div>
          </div>

          <button
            onClick={completedSales.length > 0 ? handleClose : () => setSelectedItemForSale(null)}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {completedSales.length === 0 ? (
          <form onSubmit={handleConfirmSale} className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Item Summary Card */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0 shadow-2xs">
                {item.photo1 ? (
                  <img src={getItemImageUrl(item.photo1)} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-mono font-bold text-xs text-slate-400">
                    {item.code}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                    {item.code}
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Category: {item.categoryName} • Condition: <strong>{item.condition}</strong>
                </div>
                <div className="text-xs text-slate-700 mt-1 font-semibold">
                  Original Listed Price: <span className="font-mono text-blue-700">{formatCurrency(item.sellingPrice)}</span>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Cart Items &amp; Discounts</h3>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-1 text-[10px] font-bold uppercase tracking-wider text-slate-500"><span>Item / Unit Price</span><span>Qty</span><span>Discount</span><span>Final</span></div>
              {cart.map(line => (
                <div key={line.item.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2 text-xs">
                  <div className="min-w-0"><div className="font-bold truncate">{line.item.code} - {line.item.name}</div><div className="text-slate-500">Unit Price: {formatCurrency(line.item.sellingPrice)}</div></div>
                  <label className="flex flex-col gap-1"><span className="text-[10px] font-bold text-slate-500">Qty</span><input aria-label={`Qty for ${line.item.code}`} type="number" min={1} max={line.item.quantity ?? 1} value={line.quantity} onChange={e => updateCartLine(line.item.id, { quantity: Number(e.target.value) || 1 })} className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 font-mono" /></label>
                  <label className="flex flex-col gap-1"><span className="flex items-center gap-1 text-[10px] font-bold text-slate-500"><span>Discount</span><input aria-label={`Enable discount for ${line.item.code}`} type="checkbox" checked={line.discountEnabled} onChange={e => updateCartLine(line.item.id, { discountEnabled: e.target.checked })} className="accent-amber-600" /></span><input aria-label={`Discount for ${line.item.code}`} type="number" min={0} value={line.discount} disabled={!line.discountEnabled} onChange={e => updateCartLine(line.item.id, { discount: Number(e.target.value) || 0 })} className="w-24 px-2 py-1.5 rounded-lg border border-slate-200 font-mono text-amber-700 disabled:bg-slate-100 disabled:text-slate-400" /></label>
                  <span className="font-mono font-bold text-blue-700">{formatCurrency(line.item.sellingPrice * line.quantity - (line.discountEnabled ? line.discount : 0))}</span>
                  <button type="button" onClick={() => removeCartLine(line.item.id)} className="text-rose-600 font-bold cursor-pointer" aria-label={`Remove ${line.item.code}`}>Remove</button>
                </div>
              ))}
              <div className="border-t border-blue-200 pt-2 flex justify-between text-xs"><span>Total Discount: {formatCurrency(cartDiscount)}</span><strong>Total Paid: {formatCurrency(cartTotal)}</strong></div>
            </div>

            {/* Customer Details per Section 26 */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Customer Information
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Full Name <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    id="mark-sold-customer-name-input"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Kasun Perera / Ruwan Dissanayake"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>


              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sale Notes / Delivery Info <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Paid in cash, collected at showroom, warranty details..."
                    rows={2}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Handled Employee & Auto Timestamp Notice */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <div>
                Recorded By: <strong className="text-slate-800">{currentUser?.name}</strong> ({currentUser?.role})
              </div>
              <div>
                Date: <strong className="text-slate-800">{new Date().toISOString().split('T')[0]}</strong>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="mark-sold-confirm-submit-btn"
                disabled={cart.length === 0 || isCheckingOut}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isCheckingOut ? 'Completing Checkout...' : 'Confirm Sale &amp; Mark as SOLD'}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Sale Success & Digital Receipt Preview */
          <div className="p-6 space-y-6">
            <div className="text-center py-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Sale Successfully Confirmed!</h3>
              <p className="text-xs text-slate-500">Transaction ID: {completedSales[0].id}</p>
            </div>
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2" role="alert">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Printable Digital Receipt Card */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-4 font-mono text-xs text-slate-800">
              <div className="text-center border-b border-slate-200 pb-3">
                <div className="font-bold text-sm uppercase tracking-wider">{settings.companyName}</div>
                <div className="text-[10px] text-slate-500">{settings.tagline}</div>
              </div>

              <div className="space-y-1 text-[11px]">
                {completedSales.map(sale => <div key={sale.id} className="flex justify-between gap-3"><span className="text-slate-500">Item / Qty:</span><span className="truncate max-w-[260px]">{sale.itemCode} | Qty: {sale.quantity || 1} | Unit: {formatCurrency(sale.originalPrice / (sale.quantity || 1))}{sale.discount > 0 && <> | Discount: {formatCurrency(sale.discount)}</>} | Final: {formatCurrency(sale.soldPrice)} - {sale.itemName}</span></div>)}
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span>{completedSales[0].customerName}</span>
                </div>
                {completedSales[0].customerId.startsWith('CUS-') && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer Code:</span>
                    <strong>{completedSales[0].customerId}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span>{completedSales[0].employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{new Date(completedSales[0].saleDate).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Original Price:</span>
                  <span>{formatCurrency(completedSales.reduce((sum, sale) => sum + sale.originalPrice, 0))}</span>
                </div>
                {completedSales.reduce((sum, sale) => sum + sale.discount, 0) > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Discount Applied:</span>
                    <span>-{formatCurrency(completedSales.reduce((sum, sale) => sum + sale.discount, 0))}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-300 text-blue-900">
                  <span>Total Paid:</span>
                  <span>{formatCurrency(completedSales.reduce((sum, sale) => sum + sale.soldPrice, 0))}</span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => void handleDownloadInvoice()}
                disabled={isDownloadingInvoice}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                <span>{isDownloadingInvoice ? 'Generating...' : 'Download Invoice'}</span>
              </button>
              <button
                onClick={handleClose}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
