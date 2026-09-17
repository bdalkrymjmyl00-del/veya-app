import React, { useState } from 'react';
import { Cloud, Lock, Mail, Sparkles } from 'lucide-react';
import { VeyaLogo } from './VeyaLogo';
import { applyCloudSnapshot, collectLocalSnapshot, continueOffline, loginCloud, registerCloud } from '../sync';

interface AuthViewProps { onAuthenticated: () => void; }

export const AuthView: React.FC<AuthViewProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      if (mode === 'register') {
        const result = await registerCloud(email.trim(), password, collectLocalSnapshot());
        if (result.snapshot && Object.keys(result.snapshot).length) {
          // New accounts are seeded from this device, so nothing is overwritten.
        }
      } else {
        const result = await loginCloud(email.trim(), password);
        if (result.hasData) {
          applyCloudSnapshot(result.snapshot || {});
        } else {
          // Existing device data becomes the first cloud copy for an empty account.
          const { pushCloud } = await import('../sync');
          await pushCloud();
        }
      }
      onAuthenticated();
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen bg-[#070508] text-[#f1edf0] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-[28px] border border-[#3e192c]/80 bg-[#0d0a0f] p-7 shadow-[0_0_70px_rgba(0,0,0,0.8)]">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-16 h-16 rounded-[20px] bg-[#180f1b] border border-[#441a2c] flex items-center justify-center shadow-[0_0_30px_rgba(136,19,55,0.25)]"><VeyaLogo size={40} /></div>
          <h1 className="mt-4 font-['Cormorant_Garamond',serif] text-3xl font-semibold">Veya</h1>
          <p className="text-xs text-[#a895a0] mt-1">Keep your companions, memories & conversations with you.</p>
        </div>
        <div className="flex gap-2 p-1 rounded-xl bg-[#160d14] border border-[#2d1823] mb-5">
          <button onClick={() => setMode('login')} className={`flex-1 py-2 rounded-lg text-sm ${mode==='login'?'bg-[#881337] text-white':'text-[#a895a0]'}`}>Sign in</button>
          <button onClick={() => setMode('register')} className={`flex-1 py-2 rounded-lg text-sm ${mode==='register'?'bg-[#881337] text-white':'text-[#a895a0]'}`}>Create account</button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="relative"><Mail className="absolute left-3 top-3.5 w-4 h-4 text-[#806f7b]" /><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="w-full bg-[#100b10] border border-[#34202b] rounded-xl py-3 pl-10 pr-3 text-sm outline-none focus:border-[#881337]" /></div>
          <div className="relative"><Lock className="absolute left-3 top-3.5 w-4 h-4 text-[#806f7b]" /><input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password (8+ characters)" className="w-full bg-[#100b10] border border-[#34202b] rounded-xl py-3 pl-10 pr-3 text-sm outline-none focus:border-[#881337]" /></div>
          {error && <p className="text-xs text-rose-300 bg-rose-950/30 border border-rose-900/50 rounded-lg p-3">{error}</p>}
          <button disabled={busy} className="w-full py-3 rounded-xl bg-gradient-to-r from-[#881337] to-[#580c1f] text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">{busy ? 'Connecting…' : <><Cloud className="w-4 h-4" /> {mode==='login'?'Sign in & sync':'Create & sync'}</>}</button>
        </form>
        <button onClick={() => { continueOffline(); onAuthenticated(); }} className="w-full mt-3 py-2.5 rounded-xl border border-[#34202b] text-xs text-[#a895a0] hover:text-white">Continue offline on this device</button>
        <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-[#6f6069]"><Sparkles className="w-3 h-3" /> Cloud sync is optional.</div>
      </div>
    </div>
  );
};
