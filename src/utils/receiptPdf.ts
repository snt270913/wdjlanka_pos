import { jsPDF } from 'jspdf';
import type { Sale } from '../types';

export function downloadReceiptPdf(completedSales: Sale[], settings: {currency:string;tagline:string;email:string;address:string}) {
  if (!completedSales.length) return;
      const firstSale = completedSales[0];
      const totalDiscount = completedSales.reduce((sum, sale) => sum + sale.discount, 0);
      const totalPaid = completedSales.reduce((sum, sale) => sum + sale.soldPrice, 0);
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
      invoice.setFontSize(8);
      const taglineLines = invoice.splitTextToSize(settings.tagline || 'Sales & Inventory Invoice', 105);
      invoice.text(taglineLines, left, 25, { lineHeightFactor: 1.25 });
      const contactY = 25 + taglineLines.length * 4;
      invoice.text(settings.email || '', left, contactY);
      if (settings.address) invoice.text(invoice.splitTextToSize(settings.address, 70), right, contactY, { align: 'right' });
      invoice.setFont('helvetica', 'bold');
      invoice.setFontSize(18);
      invoice.text('INVOICE', right, 20, { align: 'right' });
      invoice.setFont('helvetica', 'normal');
      invoice.setFontSize(9);
      invoice.text(firstSale.id, right, 28, { align: 'right' });

      invoice.setTextColor(15, 23, 42);
      invoice.setFont('helvetica', 'bold');
      invoice.setFontSize(11);
      invoice.text('Transaction Details', left, 58);
      invoice.setDrawColor(226, 232, 240);
      invoice.line(left, 62, right, 62);
      invoice.setFont('helvetica', 'normal');
      invoice.setFontSize(10);
      invoice.text(`Transaction ID: ${firstSale.id}`, left, 72);
      invoice.text(`Date: ${new Date(firstSale.saleDate).toLocaleString()}`, left, 80);
      invoice.text(`Employee: ${firstSale.employeeName}`, left, 88);
      invoice.text('Bill To:', right - 55, 72);
      invoice.setFont('helvetica', 'bold');
      invoice.text(firstSale.customerName, right - 55, 80);
      invoice.setFont('helvetica', 'normal');
      if (firstSale.customerId?.startsWith('CUS-')) {
        invoice.text(`Customer Code: ${firstSale.customerId}`, right - 55, 88);
      }

      const tableTop = 106;
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
      invoice.text('Thank you for choosing WDJLANKA (PVT) LTD.', left, 265);
      invoice.text('Please retain this invoice for your records. All sales are subject to store terms.', left, 272);
      invoice.setDrawColor(203, 213, 225);
      invoice.line(left, 258, right, 258);
      invoice.save(`invoice-${firstSale.id}.pdf`);
}
