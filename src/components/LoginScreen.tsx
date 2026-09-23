import { accessApi } from '../data/accessApi';
import { getPinDevice } from '../utils/deviceSession';
import { supabase } from '../supabaseClient';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole, Fingerprint, Package, BarChart3, ScanLine, ShieldCheck, LoaderCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useApp();
  const device = getPinDevice();
  const [useDevicePin, setUseDevicePin] = useState(Boolean(device));
  const [devicePin, setDevicePin] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (authenticating) return;
    setError(null);
    setAuthenticating(true);
    try {
      const result = await login(username, pin);
      if (!result.success) { setError(result.message); setPin(''); }
    } finally { setAuthenticating(false); }
  };

  const biometricSupported = window.isSecureContext && typeof PublicKeyCredential !== 'undefined';
  const biometricLogin = async () => {
    if (!supabase || authenticating) return;
    setAuthenticating(true); setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPasskey();
      if (error || !data.user) { setError('Biometric login was cancelled or unavailable. Use your username and password.'); return; }
      if (data.user.app_metadata?.role !== 'ADMIN') { try { await accessApi('me'); } catch { await supabase.auth.signOut(); setError('This account has no active workspace access.'); } }
    } catch { setError('Unable to use biometric login. Use your username and password.'); }
    finally { setAuthenticating(false); }
  };

  const unlock = async (event: React.FormEvent) => {
    event.preventDefault(); if (authenticating || !device || !supabase) return;
    setAuthenticating(true); setError(null);
    try {
      const result = await accessApi('unlock', { ...device, pin: devicePin });
      const signed = await supabase.auth.setSession(result.session);
      if (signed.error) throw signed.error;
    } catch (error) { setError(error instanceof Error ? error.message : 'Unable to unlock.'); setDevicePin(''); }
    finally { setAuthenticating(false); }
  };
  return (
    <main className="login-shell">
      <section className="login-story" aria-label="WDJLANKA workspace">
        <a className="login-brand" href="/" aria-label="WDJLANKA home"><span className="brand-mark"><Building2 size={24} /></span><span>WDJLANKA<small>RETAIL WORKSPACE</small></span></a>
        <div className="login-story-content">
          <p className="login-eyebrow"><span /> YOUR BUSINESS, CONNECTED</p>
          <h1>Everything in stock.<br /><span>Everything in view.</span></h1>
          <p className="login-story-description">A clear picture of your inventory, sales and customers. One workspace to keep your business moving.</p>
          <div className="inventory-art" aria-hidden="true">
            <div className="art-orbit art-orbit-one" /><div className="art-orbit art-orbit-two" />
            <div className="art-card art-card-main"><div className="art-card-heading"><Package size={22} /><span>Inventory overview</span><span className="art-dot" /></div><div className="art-shelves">{[1, 2, 3].map(n => <div key={n}><i /><span /><b /></div>)}</div><div className="art-chart">{[34, 50, 42, 68, 55, 78, 94].map((n, i) => <i key={i} style={{ height: `${n}%` }} />)}</div></div>
            <div className="art-chip art-chip-scan"><ScanLine size={23} /><span>Scan. Find. Sell.</span></div>
            <div className="art-chip art-chip-report"><BarChart3 size={23} /><span>Clarity at a glance</span></div>
          </div>
        </div>
        <div className="login-story-footer"><span>Inventory</span><i /><span>Point of sale</span><i /><span>Business insights</span></div>
      </section>
      <section className="login-form-panel">
        <div className="login-mobile-brand"><Building2 size={21} /> WDJLANKA</div>
        <div className="login-form-content">
          <div className="login-access-label"><ShieldCheck size={16} /> YOUR WORKSPACE</div>
          <h2>Welcome back.</h2><p className="login-intro">Sign in to take care of business.</p>
          {error && <div role="alert" className="login-error">{error}</div>}
          {useDevicePin && device ? <form className="login-form" onSubmit={unlock}>
            <label>PIN for {device.name}<input autoFocus required type="password" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="off" value={devicePin} onChange={e=>setDevicePin(e.target.value.replace(/\D/g,''))}/></label>
            <button className="login-primary" disabled={authenticating}>{authenticating?'Unlocking…':'Unlock with PIN'}</button>
            <button type="button" className="sale-secondary" onClick={()=>{setUseDevicePin(false);setError(null);}}>Use username & password</button>
          </form> : <form onSubmit={handleSubmit} className="login-form" aria-busy={authenticating}>
            <div><label htmlFor="login-username-input">Username</label><input id="login-username-input" type="text" value={username} onChange={event => setUsername(event.target.value)} required autoCapitalize="none" spellCheck={false} placeholder="Enter your username" autoComplete="username" aria-invalid={!!error} /></div>
            <div><label htmlFor="login-pin-input">Password</label><div className="login-password"><LockKeyhole size={18} /><input id="login-pin-input" type={showPin ? 'text' : 'password'} autoComplete="current-password" value={pin} onChange={event => setPin(event.target.value)} required placeholder="Enter your password" aria-invalid={!!error} /><button type="button" aria-label={showPin ? 'Hide password' : 'Show password'} aria-pressed={showPin} onClick={() => setShowPin(!showPin)}>{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
            <button type="submit" disabled={authenticating} className="login-primary">{authenticating ? <><LoaderCircle className="login-spinner" size={18} /> Signing in...</> : <>Sign in to workspace <ArrowRight size={18} /></>}</button>
          </form>}
          {!useDevicePin && device && <button className="sale-secondary mt-3" onClick={()=>setUseDevicePin(true)}>Use device PIN</button>}
          <div className="login-divider"><span /> or use quick login <span /></div>
          <button type="button" disabled={authenticating || !biometricSupported || !supabase} onClick={biometricLogin} className="login-biometric"><Fingerprint size={22} /> Biometric Login</button>
          <p className="login-help">{biometricSupported ? 'Enable fingerprint or Face ID in Security settings after your first password sign-in. Your device may also offer its PIN.' : 'Biometric login is unavailable on this browser. Use your username and password.'}</p>
          <div className="login-security-note"><ShieldCheck size={15} /><span>Private access. Built around your business.</span></div>
        </div>
        <footer className="login-footer">WDJLANKA (Pvt) Ltd <span>Business management workspace</span></footer>
      </section>
    </main>
  );
};
