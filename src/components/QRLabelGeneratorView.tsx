import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Printer, 
  Settings2, 
  CheckSquare, 
  Square, 
  Layers, 
  Grid, 
  Sparkles, 
  Sliders, 
  Eye,
  FileSpreadsheet,
  RotateCcw
  , Download
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const QRLabelGeneratorView: React.FC = () => {
  const { 
    activeItems, 
    categories, 
    selectedLabelItemCodes, 
    toggleLabelSelection, 
    selectAllLabels, 
    clearLabelSelection,
    formatCurrency,
    settings 
  } = useApp();

  // Print customization options
  const [layoutMode, setLayoutMode] = useState<'8' | '21' | '32'>('21'); // 8 = 2x4, 21 = 3x7, 32 = 4x8
  const [showPrice, setShowPrice] = useState(true);
  const [showCompanyName, setShowCompanyName] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [showCategory, setShowCategory] = useState(false);
  const [labelFilterCategory, setLabelFilterCategory] = useState('ALL');

  // Items to print
  const printableItems = activeItems.filter(item => {
    if (selectedLabelItemCodes.length > 0) {
      return selectedLabelItemCodes.includes(item.code);
    }
    // If none selected, default to available items in category filter
    if (labelFilterCategory !== 'ALL' && item.categoryId !== labelFilterCategory) {
      return false;
    }
    return item.status === 'AVAILABLE';
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    window.print();
  };

  const handleSelectAllAvailable = () => {
    const availCodes = activeItems.filter(i => i.status === 'AVAILABLE').map(i => i.code);
    selectAllLabels(availCodes);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto">
      {/* Control Panel (Hidden during print via .no-print) */}
      <div className="no-print space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>A4 QR Label Printing Engine</span>
              <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full font-mono font-bold">
                {printableItems.length} Label{printableItems.length === 1 ? '' : 's'} Queued
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Print batch QR barcode stickers for bicycles, musical instruments &amp; retail products on standard A4 paper
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="qr-labels-print-btn"
              onClick={handlePrint}
              disabled={printableItems.length === 0}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-md shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print A4 Label Sheets</span>
            </button>
            <button
              id="qr-labels-download-pdf-btn"
              onClick={handleDownloadPdf}
              disabled={printableItems.length === 0}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-cyan-300 border border-cyan-400/30 font-bold text-xs rounded-2xl shadow-md shadow-slate-900/20 transition flex items-center gap-2 cursor-pointer"
              title="Open the browser dialog to save the A4 sheet as a PDF"
            >
              <Download className="w-4 h-4" />
              <span>Download A4 PDF</span>
            </button>
          </div>
        </div>

        {/* Customization Options Bento Bar */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-600" />
              Layout &amp; Content Customizer
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAllAvailable}
                className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
              >
                Select All Available ({activeItems.filter(i => i.status === 'AVAILABLE').length})
              </button>
              {selectedLabelItemCodes.length > 0 && (
                <button
                  onClick={clearLabelSelection}
                  className="text-xs text-rose-600 font-semibold hover:underline cursor-pointer"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
            {/* Grid Layout Density */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">A4 Grid Density</label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1.5 rounded-2xl">
                <button
                  onClick={() => setLayoutMode('8')}
                  className={`py-1.5 text-xs rounded-xl font-semibold transition cursor-pointer ${
                    layoutMode === '8' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  2×4 (8)
                </button>
                <button
                  onClick={() => setLayoutMode('21')}
                  className={`py-1.5 text-xs rounded-xl font-semibold transition cursor-pointer ${
                    layoutMode === '21' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  3×7 (21)
                </button>
                <button
                  onClick={() => setLayoutMode('32')}
                  className={`py-1.5 text-xs rounded-xl font-semibold transition cursor-pointer ${
                    layoutMode === '32' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  4×8 (32)
                </button>
              </div>
            </div>

            {/* Toggle Toggles */}
            <div className="sm:col-span-2 flex flex-wrap items-center gap-5 pt-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Show Selling Price</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showCompanyName}
                  onChange={(e) => setShowCompanyName(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Show Company Title</span>
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBrand}
                  onChange={(e) => setShowBrand(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
                <span>Show Brand Name</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Printable Sheet Viewport */}
      <div className="bg-slate-100 p-4 sm:p-8 rounded-3xl border border-slate-200/80 shadow-inner flex justify-center">
        {/* A4 Sheet Container */}
        <div id="printable-labels-area" className="a4-sheet bg-white w-full max-w-[210mm] min-h-[297mm] p-[10mm] shadow-xl border border-slate-300 rounded-sm text-slate-900 font-sans print:shadow-none print:border-none print:m-0 print:p-[5mm]">
          {printableItems.length === 0 ? (
            <div className="h-96 flex flex-col items-center justify-center text-center p-8 text-slate-400">
              <Printer className="w-12 h-12 mb-3 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700">No items in label printing queue</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1">
                Select items from Inventory or choose "Select All Available" above to generate QR stickers.
              </p>
            </div>
          ) : (
            <div className={`grid gap-2 print:gap-1.5 ${
              layoutMode === '8' ? 'grid-cols-2' :
              layoutMode === '32' ? 'grid-cols-4' : 'grid-cols-3'
            }`}>
              {printableItems.map(item => (
                <div
                  key={item.id}
                  className="border-2 border-dashed border-slate-300 print:border-slate-800 p-2.5 rounded-lg flex flex-col justify-between items-center text-center bg-white"
                >
                  {/* Company Header */}
                  {showCompanyName && (
                    <div className="text-[9px] font-extrabold uppercase tracking-widest text-slate-800 border-b border-slate-200 pb-1 w-full truncate">
                      {settings.companyName}
                    </div>
                  )}

                  {/* QR Code */}
                  <div className="my-1.5 p-1 bg-white rounded border border-slate-100 shrink-0">
                    <QRCodeSVG
                      value={`/item/${item.code}`}
                      size={layoutMode === '8' ? 88 : layoutMode === '32' ? 52 : 68}
                      level="M"
                      includeMargin={false}
                    />
                  </div>

                  {/* Code & Details */}
                  <div className="w-full space-y-0.5">
                    <div className="font-mono font-black text-sm text-slate-950 tracking-wider">
                      {item.code}
                    </div>

                    <div className="text-[10px] font-bold text-slate-800 line-clamp-1 leading-tight">
                      {item.name}
                    </div>

                    {showBrand && item.brand && (
                      <div className="text-[9px] text-slate-500 font-medium truncate">
                        {item.brand} {item.model ? `• ${item.model}` : ''}
                      </div>
                    )}

                    {showPrice && (
                      <div className="text-[11px] font-black font-mono text-slate-900 pt-0.5 border-t border-slate-200">
                        {formatCurrency(item.sellingPrice)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
