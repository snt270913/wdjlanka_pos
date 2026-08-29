import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  ScanLine, 
  Camera, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ShoppingCart, 
  Sparkles,
  RefreshCw,
  QrCode
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';

export const QRScannerModal: React.FC = () => {
  const { 
    isQRScannerOpen, 
    setIsQRScannerOpen, 
    getItemByCode, 
    formatCurrency, 
    setSelectedItemForDetail, 
    setSelectedItemForSale,
    activeItems
  } = useApp();

  const [manualCode, setManualCode] = useState('');
  const [scannedItem, setScannedItem] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);

  const handleProcessCode = (rawCode: string) => {
    let cleanCode = rawCode.trim();
    // In case QR contains URL like /item/B001 or https://wdj.lk/item/B001
    if (cleanCode.includes('/item/')) {
      const parts = cleanCode.split('/item/');
      cleanCode = parts[parts.length - 1];
    }
    cleanCode = cleanCode.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const found = getItemByCode(cleanCode);
    if (found) {
      setScannedItem(found);
      setScanError(null);
      // Play audio beep feedback if available
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.value = 0.1;
        osc.start();
        setTimeout(() => {
          osc.stop();
          ctx.close();
        }, 120);
      } catch (e) {
        // audio context not allowed
      }
    } else {
      setScannedItem(null);
      setScanError(`Scanned code "${cleanCode}" was not found in active inventory.`);
    }
  };

  // Start Camera
  useEffect(() => {
    if (isQRScannerOpen) {
      setScannedItem(null);
      setScanError(null);
      setCameraError(null);
      setManualCode('');

      let html5QrCode: Html5Qrcode | null = null;

      const startScanner = async () => {
        try {
          html5QrCode = new Html5Qrcode('qr-reader-video-box');
          scannerRef.current = html5QrCode;

          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 250, height: 250 },
            },
            (decodedText) => {
              handleProcessCode(decodedText);
            },
            () => {
              // scanning in progress...
            }
          );
          setIsCameraActive(true);
        } catch (err: any) {
          console.warn('Camera initiation note:', err);
          setIsCameraActive(false);
          setCameraError(
            'Camera preview unavailable or permission denied in current frame. Use Quick Code Lookup or Test Buttons below!'
          );
        }
      };

      // Small delay to ensure DOM element is mounted
      const timer = setTimeout(() => {
        startScanner();
      }, 200);

      return () => {
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.stop().catch(() => {}).then(() => {
            scannerRef.current?.clear();
          });
        }
      };
    }
  }, [isQRScannerOpen]);

  if (!isQRScannerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-in fade-in">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <ScanLine className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold">QR Label Camera Scanner</h2>
              <p className="text-[11px] text-slate-400">Point phone camera at printed item QR label</p>
            </div>
          </div>

          <button
            onClick={() => setIsQRScannerOpen(false)}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Viewport */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {/* Live Camera Scanner Box */}
          <div className="relative aspect-square max-w-[320px] mx-auto bg-slate-950 rounded-2xl overflow-hidden border-2 border-slate-800 flex flex-col items-center justify-center shadow-inner">
            <div id="qr-reader-video-box" className="w-full h-full" />

            {/* Target Laser overlay */}
            <div className="absolute inset-8 border-2 border-dashed border-blue-500/80 rounded-xl pointer-events-none flex items-center justify-center">
              <div className="w-full h-0.5 bg-rose-500/80 shadow-[0_0_8px_#f43f5e] animate-pulse" />
            </div>

            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 p-4 text-center flex flex-col items-center justify-center text-xs text-slate-300 space-y-2">
                <Camera className="w-8 h-8 text-slate-500" />
                <p className="text-[11px] text-slate-400">{cameraError}</p>
              </div>
            )}
          </div>

          {/* Quick Item Code Input */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Or Type / Simulate QR Code:
            </label>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleProcessCode(manualCode);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="e.g. B001, M002, H001..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Scan Code
              </button>
            </form>

            {/* Quick Test Demo Codes */}
            <div className="flex items-center gap-1 flex-wrap pt-1">
              <span className="text-[10px] text-slate-400 font-medium">Quick Test:</span>
              {activeItems.slice(0, 5).map(item => (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => handleProcessCode(item.code)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-700 text-slate-700 rounded text-[10px] font-mono font-bold transition cursor-pointer"
                >
                  {item.code}
                </button>
              ))}
            </div>
          </div>

          {/* Scan Error Notice */}
          {scanError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{scanError}</span>
            </div>
          )}

          {/* Scanned Result Instant Card per Section 24 & 25 */}
          {scannedItem && (
            <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-2xl shadow-sm space-y-3 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                    {scannedItem.code}
                  </span>
                  <span className="text-xs font-bold text-slate-900 truncate max-w-[180px]">
                    {scannedItem.name}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  scannedItem.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {scannedItem.status}
                </span>
              </div>

              <div className="flex items-baseline justify-between border-t border-emerald-200/60 pt-2">
                <div>
                  <span className="text-xs text-slate-500 font-semibold">Selling Price:</span>
                  <div className="text-xl font-black text-emerald-700 font-mono">
                    {formatCurrency(scannedItem.sellingPrice)}
                  </div>
                  {scannedItem.maxDiscount > 0 && (
                    <div className="text-[10px] text-amber-700 font-medium">
                      Allowed Disc: up to {formatCurrency(scannedItem.maxDiscount)}
                    </div>
                  )}
                </div>

                <div className="text-right text-xs text-slate-600">
                  <div>Brand: <strong>{scannedItem.brand}</strong></div>
                  <div>Condition: <strong>{scannedItem.condition}</strong></div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                {scannedItem.status === 'AVAILABLE' && (
                  <button
                    onClick={() => {
                      setIsQRScannerOpen(false);
                      setSelectedItemForSale(scannedItem);
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Sell This Item</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setIsQRScannerOpen(false);
                    setSelectedItemForDetail(scannedItem);
                  }}
                  className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-xs rounded-xl transition cursor-pointer text-center"
                >
                  View Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
