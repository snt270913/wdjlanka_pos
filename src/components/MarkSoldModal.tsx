import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Item, Sale } from '../types';
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
import { jsPDF } from 'jspdf';
import { getItemImageUrl } from '../data/supabaseSync';

export const MarkSoldModal: React.FC = () => {
  const { 
    selectedItemForSale, 
    setSelectedItemForSale, 
    markItemAsSold, 
    currentUser, 
    formatCurrency, 
    settings 
  } = useApp();

  const [soldPrice, setSoldPrice] = useState<number>(0);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [note, setNote] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isDownloadingInvoice, setIsDownloadingInvoice] = useState(false);

  useEffect(() => {
    if (selectedItemForSale) {
      setSoldPrice(selectedItemForSale.sellingPrice);
      setCustomerName('');
      setCustomerPhone('');
      setNote('');
      setDiscountApplied(false);
      setErrorMessage(null);
      setCompletedSale(null);
    }
  }, [selectedItemForSale]);

  if (!selectedItemForSale) return null;

  const item = selectedItemForSale;
  const discount = Math.max(0, item.sellingPrice - soldPrice);
  const isDiscountOverLimit = discount > item.maxDiscount;
  
  const hasPromotion = item.maxDiscount > 0 || item.tags.some((tag) => /sale|promo|offer|discount|quick/i.test(tag));
  const discountButtonLabel = discountApplied ? 'Discount Applied' : 'Apply Discount';

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (soldPrice <= 0) {
      setErrorMessage('Please enter a valid sold price.');
      return;
    }
    if (isDiscountOverLimit) {
      setErrorMessage(
        `Applied discount of Rs. ${discount.toLocaleString()} exceeds the maximum allowed discount limit of Rs. ${item.maxDiscount.toLocaleString()}!`
      );
      return;
    }

    const res = await markItemAsSold(item.id, soldPrice, customerName.trim(), customerPhone.trim(), note.trim() || undefined);

    if (res.success && res.sale) {
      setCompletedSale(res.sale);
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
      } catch (err) {
        // ignore
      }
    } else {
      setErrorMessage(res.message);
    }
  };

  const handleDownloadInvoice = async () => {
    if (!completedSale || isDownloadingInvoice) return;

    setIsDownloadingInvoice(true);
    try {
      const invoice = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = invoice.internal.pageSize.getWidth();
      const left = 20;
      const right = pageWidth - 20;
      const formatInvoiceCurrency = (amount: number) => `${settings.currency} ${amount.toLocaleString('en-LK')}`;

      invoice.setFillColor(15, 23, 42);
      invoice.rect(0, 0, pageWidth, 42, 'F');
      invoice.setTextColor(255, 255, 255);
      invoice.setFont('helvetica', 'bold');
      invoice.setFontSize(22);
      invoice.text('WDJLANKA (PVT) LTD', left, 18);
      invoice.setFont('helvetica', 'normal');
      invoice.setFontSize(9);
      invoice.text(settings.tagline || 'Sales & Inventory Invoice', left, 26);
      invoice.text(settings.email || '', left, 32);
      if (settings.address) invoice.text(settings.address, right, 34, { align: 'right' });
      invoice.setFont('helvetica', 'bold');
      invoice.setFontSize(18);
      invoice.text('INVOICE', right, 20, { align: 'right' });
      invoice.setFont('helvetica', 'normal');
      invoice.setFontSize(9);
      invoice.text(completedSale.id, right, 28, { align: 'right' });

      invoice.setTextColor(15, 23, 42);
      invoice.setFont('helvetica', 'bold');
      invoice.setFontSize(11);
      invoice.text('Transaction Details', left, 58);
      invoice.setDrawColor(226, 232, 240);
      invoice.line(left, 62, right, 62);
      invoice.setFont('helvetica', 'normal');
      invoice.setFontSize(10);
      invoice.text(`Transaction ID: ${completedSale.id}`, left, 72);
      invoice.text(`Date: ${new Date(completedSale.saleDate).toLocaleString()}`, left, 80);
      invoice.text(`Employee: ${completedSale.employeeName}`, left, 88);
      invoice.text('Bill To:', right - 55, 72);
      invoice.setFont('helvetica', 'bold');
      invoice.text(completedSale.customerName, right - 55, 80);
      invoice.setFont('helvetica', 'normal');
      if (completedSale.customerId.startsWith('CUS-')) {
        invoice.text(`Customer Code: ${completedSale.customerId}`, right - 55, 88);
      }

      const tableTop = 106;
      invoice.setFillColor(241, 245, 249);
      invoice.roundedRect(left, tableTop, right - left, 12, 2, 2, 'F');
      invoice.setTextColor(71, 85, 105);
      invoice.setFont('helvetica', 'bold');
      invoice.setFontSize(9);
      invoice.text('ITEM CODE', left + 5, tableTop + 7);
      invoice.text('ITEM NAME', left + 35, tableTop + 7);
      invoice.text('ORIGINAL', right - 65, tableTop + 7, { align: 'right' });
      invoice.text('SOLD PRICE', right - 5, tableTop + 7, { align: 'right' });

      invoice.setTextColor(15, 23, 42);
      invoice.setFont('helvetica', 'normal');
      invoice.setFontSize(10);
      invoice.text(completedSale.itemCode, left + 5, tableTop + 23);
      invoice.text(invoice.splitTextToSize(completedSale.itemName, 65), left + 35, tableTop + 23);
      invoice.text(formatInvoiceCurrency(completedSale.originalPrice), right - 65, tableTop + 23, { align: 'right' });
      invoice.text(formatInvoiceCurrency(completedSale.soldPrice), right - 5, tableTop + 23, { align: 'right' });
      invoice.setDrawColor(226, 232, 240);
      invoice.line(left, tableTop + 32, right, tableTop + 32);

      let totalTop = tableTop + 48;
      if (completedSale.discount > 0) {
        invoice.setTextColor(180, 83, 9);
        invoice.text('Discount Applied', right - 55, totalTop, { align: 'right' });
        invoice.text(`-${formatInvoiceCurrency(completedSale.discount)}`, right - 5, totalTop, { align: 'right' });
        totalTop += 9;
      }
      invoice.setFillColor(219, 234, 254);
      invoice.roundedRect(right - 85, totalTop, 85, 17, 2, 2, 'F');
      invoice.setTextColor(30, 64, 175);
      invoice.setFont('helvetica', 'bold');
      invoice.setFontSize(12);
      invoice.text('TOTAL PAID', right - 48, totalTop + 11, { align: 'right' });
      invoice.text(formatInvoiceCurrency(completedSale.soldPrice), right - 5, totalTop + 11, { align: 'right' });

      invoice.setTextColor(100, 116, 139);
      invoice.setFont('helvetica', 'normal');
      invoice.setFontSize(9);
      invoice.text('Thank you for choosing WDJLANKA (PVT) LTD.', left, 265);
      invoice.text('Please retain this invoice for your records. All sales are subject to store terms.', left, 272);
      invoice.setDrawColor(203, 213, 225);
      invoice.line(left, 258, right, 258);
      invoice.save(`invoice-${completedSale.id}.pdf`);
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
                {completedSale ? 'Sale Completed!' : 'Mark Item as SOLD'}
              </h2>
              <p className="text-xs text-slate-500">
                {completedSale ? 'Transaction recorded to inventory & Google Sheets' : `Selling item ${item.code} (${item.name})`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setSelectedItemForSale(null)}
            className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {!completedSale ? (
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

            {/* Financial Details (Sold Price + Discount Validation) */}
            <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-3">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Selling Price (Rs.) <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  const next = !discountApplied;
                  setDiscountApplied(next);
                  setSoldPrice(next ? Math.max(0, item.sellingPrice - item.maxDiscount) : item.sellingPrice);
                }}
                disabled={!hasPromotion}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${discountApplied ? 'bg-emerald-600 text-white' : hasPromotion ? 'bg-fuchsia-500 text-white shadow-md shadow-fuchsia-500/20' : 'bg-slate-200 text-slate-500 cursor-not-allowed'}`}
              >
                {discountButtonLabel}{hasPromotion && !discountApplied ? ` (up to ${formatCurrency(item.maxDiscount)})` : ''}
              </button>
              
              <div className="relative">
                <input
                  type="number"
                  id="mark-sold-price-input"
                  value={soldPrice}
                  onChange={(e) => setSoldPrice(Math.min(item.sellingPrice, Math.max(0, Number(e.target.value))))}
                  min={0}
                  max={item.sellingPrice}
                  className="w-full px-4 py-2.5 bg-white border border-blue-300 rounded-xl font-mono font-bold text-lg text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Discount Indicator */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-600">Calculated Discount:</span>
                  <span className={`font-mono font-bold ${
                    discount > 0 ? (isDiscountOverLimit ? 'text-rose-600' : 'text-amber-600') : 'text-slate-500'
                  }`}>
                    {formatCurrency(discount)}
                  </span>
                </div>

                <div className="text-right text-[11px] text-slate-500">
                  Max Permitted Discount: <strong className="text-slate-800 font-mono">{formatCurrency(item.maxDiscount)}</strong>
                </div>
              </div>

              {isDiscountOverLimit && (
                <p className="text-[11px] text-rose-600 font-medium">
                  ⚠️ Discount exceeds maximum limit allowed for this item! Increase sold price to at least {formatCurrency(item.sellingPrice - item.maxDiscount)}.
                </p>
              )}
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
                disabled={isDiscountOverLimit}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Confirm Sale &amp; Mark as SOLD</span>
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
              <p className="text-xs text-slate-500">Transaction ID: {completedSale.id}</p>
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
                <div className="flex justify-between">
                  <span className="text-slate-500">Item Code:</span>
                  <strong>{completedSale.itemCode}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Item Name:</span>
                  <span className="truncate max-w-[200px]">{completedSale.itemName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span>{completedSale.customerName}</span>
                </div>
                {completedSale.customerId.startsWith('CUS-') && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer Code:</span>
                    <strong>{completedSale.customerId}</strong>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span>{completedSale.employeeName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span>{new Date(completedSale.saleDate).toLocaleString()}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Original Price:</span>
                  <span>{formatCurrency(completedSale.originalPrice)}</span>
                </div>
                {completedSale.discount > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>Discount Applied:</span>
                    <span>-{formatCurrency(completedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-2 border-t border-slate-300 text-blue-900">
                  <span>Total Paid:</span>
                  <span>{formatCurrency(completedSale.soldPrice)}</span>
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
                onClick={() => setSelectedItemForSale(null)}
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
