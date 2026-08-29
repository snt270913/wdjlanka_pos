import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ArrowRight, Building2, CheckCircle2, Eye, EyeOff, KeyRound, LockKeyhole } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { login } = useApp();
  const [username, setUsername] = useState('wdjlanka');
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(false);
    const result = login(username, pin);
    if (!result.success) {
      setError(true);
      setPin('');
      return;
    }
    setAuthenticating(true);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.2),_transparent_38%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.16),_transparent_35%)]" />
      <section className="relative z-10 w-full max-w-md bg-white/[0.07] border border-white/10 rounded-[2rem] p-7 sm:p-9 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-cyan-400 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Building2 className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-cyan-300 font-bold">WDJLANKA</p>
            <h1 className="text-xl font-black tracking-tight">Admin Portal</h1>
          </div>
        </div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Sign In to WDJLANKA</h2>
          <p className="text-sm text-slate-400 mt-1">Secure access for your inventory workspace.</p>
        </div>
        {error && <div className="mb-5 rounded-xl border border-red-400/50 bg-red-500/15 p-3 text-sm font-semibold text-red-200 animate-[shake_0.35s_ease-in-out]">Invalid Username or PIN. Access Denied.</div>}
        {authenticating && <div className="mb-5 rounded-xl border border-emerald-400/50 bg-emerald-500/15 p-3 text-sm font-semibold text-emerald-200 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Authenticating... Welcome to WDJLANKA!</div>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="login-username-input" className="block text-xs font-bold text-slate-300 mb-2">Admin Username</label>
            <input id="login-username-input" type="text" value={username} onChange={(event) => setUsername(event.target.value)} required placeholder="wdjlanka" autoComplete="username" className={`w-full rounded-xl bg-slate-950/60 border px-4 py-3 text-sm text-white outline-none transition focus:ring-2 focus:ring-cyan-400 ${error ? 'border-red-500' : 'border-white/15'}`} />
          </div>
          <div>
            <label htmlFor="login-pin-input" className="block text-xs font-bold text-slate-300 mb-2">Admin PIN</label>
            <div className="relative">
              <LockKeyhole className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
              <input id="login-pin-input" type={showPin ? 'text' : 'password'} inputMode="numeric" value={pin} onChange={(event) => setPin(event.target.value)} required placeholder="Enter your PIN" autoFocus className={`w-full rounded-xl bg-slate-950/60 border pl-11 pr-12 py-3 text-sm text-white outline-none transition focus:ring-2 focus:ring-cyan-400 ${error ? 'border-red-500' : 'border-white/15'}`} />
              <button type="button" aria-label={showPin ? 'Hide PIN' : 'Show PIN'} onClick={() => setShowPin(!showPin)} className="absolute right-3 top-2.5 p-1.5 text-slate-400 hover:text-white cursor-pointer">
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <button type="submit" className="w-full rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 py-3.5 font-black text-sm flex items-center justify-center gap-2 transition cursor-pointer"><KeyRound className="w-4 h-4" /> Sign In to WDJLANKA <ArrowRight className="w-4 h-4" /></button>
        </form>
        <div className="mt-7 pt-5 border-t border-white/10 flex items-center gap-2 text-[11px] text-slate-500"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Local secure session enabled</div>
      </section>
    </main>
  );
};