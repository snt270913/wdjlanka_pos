import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export const BiometricSettings = () => {
  const [credentials, setCredentials] = useState<Array<{ id: string; friendly_name?: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const supported = window.isSecureContext && typeof PublicKeyCredential !== 'undefined';
  useEffect(() => {
    let active = true;
    if (supabase) void supabase.auth.passkey.list().then(({ data, error }) => {
      if (!active) return;
      if (error) setMessage('Biometric setup is not available yet. Password login remains available.');
      else setCredentials(data || []);
    }).catch(() => { if (active) setMessage('Unable to load biometric logins.'); });
    return () => { active = false; };
  }, []);
  const register = async () => {
    if (!supabase || busy) return;
    setBusy(true); setMessage('');
    try {
      const { data, error } = await supabase.auth.registerPasskey();
      if (error || !data) { setMessage('Setup was cancelled or unavailable. Please try again or use your password.'); return; }
      setCredentials(previous => [...previous, data]);
      setMessage('Biometric login enabled. You can use it from the sign-in screen.');
    } catch { setMessage('Unable to enable biometric login. Your password still works.'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!supabase || busy || !window.confirm('Remove this biometric login? Password login will remain available.')) return;
    setBusy(true); setMessage('');
    try {
      const { error } = await supabase.auth.passkey.delete({ passkeyId: id });
      if (error) throw error;
      setCredentials(previous => previous.filter(credential => credential.id !== id));
      setMessage('Biometric login removed.');
    } catch { setMessage('Unable to remove biometric login. Please try again.'); }
    finally { setBusy(false); }
  };
  return <section className="border-t border-slate-200 pt-6 space-y-3">
    <h3 className="font-bold text-slate-800">Biometric Login</h3>
    <p className="text-sm text-slate-600">Enable fingerprint, Face ID or Windows Hello after signing in. Your device may also offer its PIN. Credentials may sync through your device account.</p>
    <button type="button" disabled={busy || !supported} onClick={register} className="rounded-xl bg-blue-600 text-white px-4 py-3 font-bold disabled:opacity-50">{busy ? 'Please wait...' : 'Enable Biometric Login'}</button>
    {!supported && <p className="text-sm text-slate-600">This browser does not support biometric login. Use your username and password.</p>}
    <p role="status" className="text-sm text-slate-600">{message}</p>
    {credentials.map((credential, index) => <div key={credential.id} className="flex items-center justify-between gap-3 text-sm"><span>{credential.friendly_name || `Biometric login ${index + 1}`}</span><button type="button" disabled={busy} onClick={() => remove(credential.id)} className="text-red-700 underline disabled:opacity-50">Remove</button></div>)}
  </section>;
};
