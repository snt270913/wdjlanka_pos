import type { BusinessSettings } from '../types';
export function ReceiptHeader({ settings }: { settings: BusinessSettings }) {
  const r = settings.receipt;
  return <div className="p-5 text-left space-y-2 break-words" style={{ background: r?.background || '#0f172a', color: r?.textColor || '#ffffff', overflowWrap: 'anywhere' }}>
    <div className="text-xs font-semibold tracking-widest uppercase">{r?.title ?? 'INVOICE'}</div>
    <div className="text-xl font-bold">{settings.companyName}</div>
    {r?.showTagline !== false && <div className="text-xs opacity-90">{settings.tagline}</div>}
    <div className="text-xs space-y-1 opacity-90">
      {r?.showPhone !== false && settings.phone && <div>{settings.phone}</div>}
      {r?.showEmail !== false && settings.email && <div>{settings.email}</div>}
      {r?.showAddress !== false && settings.address && <div className="whitespace-pre-line">{settings.address}</div>}
    </div>
  </div>;
}
