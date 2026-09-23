import React, { useEffect, useState } from 'react';
import { accessApi } from '../data/accessApi';
import { getPinDevice, rememberPinDevice, forgetPinDevice } from '../utils/deviceSession';

export function DevicePinSettings() {
  const [pin, setPin] = useState(''); const [confirm, setConfirm] = useState('');
  const [password, setPassword] = useState(''); const [name, setName] = useState('My device');
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  const [devices, setDevices] = useState<Array<{id:string;name:string;attempts:number;expires_at:string|null}>>([]);
  const current = getPinDevice();
  const refresh = async () => setDevices(await accessApi('pin-list'));
  useEffect(() => { void refresh().catch(() => setMessage('Unable to load PIN devices. Try reloading.')); }, []);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (pin !== confirm) { setMessage('PINs do not match.'); return; }
    setBusy(true); setMessage('');
    try {
      const device = await accessApi('pin-enroll', { pin, name, password });
      if (current) await accessApi('pin-remove', { deviceId: current.deviceId });
      rememberPinDevice(device); setPin(''); setConfirm(''); setPassword('');
      await refresh(); setMessage('PIN enabled. Next time this page opens, use your PIN or password.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save PIN.'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm('Remove PIN access for this device?')) return;
    setBusy(true);
    try {
      await accessApi('pin-remove', { deviceId: id });
      if (id === current?.deviceId) { forgetPinDevice(); window.location.reload(); return; }
      await refresh(); setMessage('Device PIN removed.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to remove device.'); }
    finally { setBusy(false); }
  };
  return <section className="access-panel">
    <h3>Device PIN</h3><p className="access-help">Quick unlock on this browser with a 6-digit PIN. Password and biometric login remain available. PIN stays enabled until you remove or reset it; five wrong attempts require password sign-in and PIN setup again.</p>
    {message && <p role="status" className="access-message">{message}</p>}
    <form onSubmit={save} className="access-form">
      <label>Device name<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} /></label>
      <label>Current account password<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <div className="access-columns"><label>6-digit PIN<input required type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="new-password" value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,''))} /></label>
      <label>Confirm PIN<input required type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value.replace(/\D/g,''))} /></label></div>
      <button className="sale-restore" disabled={busy}>{busy ? 'Saving…' : current ? 'Change this device PIN' : 'Enable device PIN'}</button>
    </form>
    {current && <button className="sale-secondary mt-3" onClick={()=>window.location.reload()}>Lock now</button>}
    <div className="mt-5 space-y-3">{devices.map(d=><div key={d.id} className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3"><span className="text-sm">{d.name}{d.id===current?.deviceId ? ' · This browser' : ''}{d.attempts>=5 ? ' · Locked' : ''}</span><button disabled={busy} className="sale-secondary" onClick={()=>void remove(d.id)}>Remove PIN</button></div>)}</div>
  </section>;
}
