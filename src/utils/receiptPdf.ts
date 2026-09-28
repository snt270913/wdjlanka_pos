import { jsPDF } from 'jspdf';
import type { Sale, BusinessSettings } from '../types';

export function downloadReceiptPdf(completedSales: Sale[], settings: Pick<BusinessSettings, 'currency' | 'tagline' | 'email' | 'address'> & Partial<BusinessSettings>) {
  if (!completedSales.length) return;
      const firstSale = completedSales[0];
      const totalDiscount = completedSales.reduce((sum, sale) => sum + sale.discount, 0);
      const totalPaid = completedSales.reduce((sum, sale) => sum + sale.soldPrice, 0);
      const invoice = new jsPDF({ unit: 'mm', format: 'a4' });
      const pageWidth = invoice.internal.pageSize.getWidth();
      const left = 20;
      const right = pageWidth - 20;
      const formatInvoiceCurrency = (amount: number) => `${settings.currency} ${amount.toLocaleString('en-LK')}`;

      const r = settings.receipt;
      invoice.setFont('helvetica', 'bold'); invoice.setFontSize(19);
      const company = invoice.splitTextToSize(settings.companyName || 'WDJLANKA (PVT) LTD', right - left);
      invoice.setFontSize(9);
      const details = [r?.showTagline !== false ? settings.tagline : '', r?.showPhone !== false ? settings.phone : '', r?.showEmail !== false ? settings.email : '', r?.showAddress !== false ? settings.address : ''].filter(Boolean).flatMap(text => invoice.splitTextToSize(text!, right - left));
      const headerHeight = 27 + company.length * 8 + details.length * 4;
      invoice.setFillColor(r?.background || '#0f172a'); invoice.rect(0, 0, pageWidth, headerHeight, 'F');
      invoice.setTextColor(r?.textColor || '#ffffff');
      invoice.setFontSize(10); invoice.text(r?.title ?? 'INVOICE', left, 12);
      invoice.setFontSize(19); invoice.text(company, left, 23, { lineHeightFactor: 1.2 });
      invoice.setFont('helvetica', 'normal'); invoice.setFontSize(9);
      if (details.length) invoice.text(details, left, 27 + company.length * 8, { lineHeightFactor: 1.25 });
      const offset = headerHeight - 42;

      invoice.setTextColor(15, 23, 42);
      invoice.setFont('helvetica', 'bold');
      invoice.setFontSize(11);
      invoice.text('Transaction Details', left, 58 + offset);
      invoice.setDrawColor(226, 232, 240);
      invoice.line(left, 62 + offset, right, 62 + offset);
      invoice.setFont('helvetica', 'normal');
      invoice.setFontSize(10);
      invoice.setFontSize(8);
      const transaction = [ ...invoice.splitTextToSize(`Transaction ID: ${firstSale.id}`, 100), `Date: ${new Date(firstSale.saleDate).toLocaleString()}`, ...invoice.splitTextToSize(`Employee: ${firstSale.employeeName}`, 100) ];
      const customer = ['Bill To:', ...invoice.splitTextToSize(firstSale.customerName || 'Customer', 55), ...(firstSale.customerId?.startsWith('CUS-') ? invoice.splitTextToSize(`Customer Code: ${firstSale.customerId}`, 55) : [])];
      invoice.text(transaction, left, 72 + offset, { lineHeightFactor: 1.7 });
      invoice.text(customer, right - 55, 72 + offset, { lineHeightFactor: 1.7 });
      const detailHeight = Math.max(transaction.length, customer.length) * 5;

      const tableTop = Math.max(106, 82 + detailHeight) + offset;
      invoice.setFillColor(241, 245, 249);
      invoice.roundedRect(left, tableTop, right - left, 12, 2, 2, 'F');
      invoice.setTextColor(71, 85, 105);
      invoice.setFont('helvetica', 'bold');
      invoice.setFontSize(9);
      invoice.text('ITEM / QUANTITY / UNIT PRICE', left + 5, tableTop + 7);


      invoice.text('LINE TOTAL', right - 5, tableTop + 7, { align: 'right' });

      invoice.setTextColor(15, 23, 42);
      invoice.setFont('helvetica', 'normal');
      invoice.setFontSize(10);
      let rowTop = tableTop + 23;
      completedSales.forEach(sale => {
        const detail = `${sale.itemCode} | Qty: ${sale.quantity || 1} | Unit: ${formatInvoiceCurrency(sale.originalPrice / (sale.quantity || 1))}`;
        const lines = invoice.splitTextToSize(sale.itemName, 105);
        const height = lines.length * 5 + 13 + (sale.discount > 0 ? 6 : 0) + (sale.restoredAt ? 6 : 0);
        if (rowTop + height > 248) { invoice.addPage(); rowTop = 25; }
        invoice.text(lines, left + 5, rowTop);
        invoice.text(formatInvoiceCurrency(sale.soldPrice), right - 5, rowTop, { align: 'right' });
        rowTop += lines.length * 5;
        invoice.setFontSize(8);
        invoice.text(detail, left + 5, rowTop);
        rowTop += 6;
        if (sale.discount > 0) { invoice.text(`Discount: -${formatInvoiceCurrency(sale.discount)}`, left + 5, rowTop); rowTop += 6; }
        if (sale.restoredAt) { invoice.text('RESTORED - excluded from sales totals', left + 5, rowTop); rowTop += 6; }
        invoice.setFontSize(10);
        rowTop += 7;
      });
      invoice.setDrawColor(226, 232, 240);
      invoice.line(left, rowTop, right, rowTop);
      if (rowTop > 208) { invoice.addPage(); rowTop = 25; }
      let totalTop = rowTop + 12;
      if (totalDiscount > 0) {
        invoice.setTextColor(180, 83, 9);
        invoice.text('Discount Applied', right - 55, totalTop, { align: 'right' });
        invoice.text(`-${formatInvoiceCurrency(totalDiscount)}`, right - 5, totalTop, { align: 'right' });
        totalTop += 9;
      }
      invoice.setFillColor(219, 234, 254);
      invoice.roundedRect(right - 85, totalTop, 85, 17, 2, 2, 'F');
      invoice.setTextColor(30, 64, 175);
      invoice.setFont('helvetica', 'bold');
      invoice.setFontSize(12);
      invoice.text('TOTAL PAID', right - 48, totalTop + 11, { align: 'right' });
      invoice.text(formatInvoiceCurrency(totalPaid), right - 5, totalTop + 11, { align: 'right' });

      invoice.setTextColor(100, 116, 139);
      invoice.setFont('helvetica', 'normal');
      invoice.setFontSize(9);
      invoice.text(invoice.splitTextToSize(r?.footer ?? `Thank you for choosing ${settings.companyName || 'WDJLANKA (PVT) LTD'}.`, right - left), left, 265);

      invoice.setDrawColor(203, 213, 225);
      invoice.line(left, 258, right, 258);
      invoice.save(`invoice-${firstSale.id}.pdf`);
}
