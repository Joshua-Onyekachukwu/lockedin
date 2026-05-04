import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuthActions } from "@convex-dev/auth/react";
import { Lock, LogIn, Mail, Key, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const [step, setStep] = useState<'signin' | 'signup'>('signin');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });

  const handleSignIn = async (provider: string) => {
    setIsPending(true);
    setError(null);
    try {
      await signIn(provider);
    } catch (err: any) {
      setError("Authentication failed. Please try again.");
      setIsPending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsPending(true);
    setError(null);

    try {
      if (step === 'signup') {
        if (formData.password.length < 8) {
            throw new Error("Password must be at least 8 characters.");
        }
        await signIn("password", { 
            email: formData.email, 
            password: formData.password, 
            name: formData.name,
            flow: "signUp" 
        });
      } else {
        await signIn("password", { 
            email: formData.email, 
            password: formData.password, 
            flow: "signIn" 
        });
      }
      navigate({ to: '/dashboard' });
    } catch (err: any) {
      setError(err.message || "An error occurred during authentication.");
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020408] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Noise Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      {/* Premium Glow Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-600 blur-md opacity-50" />
            <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-lg shadow-blue-900/20 text-white">
              <Lock size={28} />
            </div>
          </div>
          <h1 className="text-3xl font-black uppercase italic tracking-tight leading-none">
            {step === 'signin' ? 'Access Protocol' : 'Initiate Identity'}
          </h1>
          <p className="text-white/40 mt-4 text-xs font-bold uppercase tracking-widest italic">
            {step === 'signin' ? 'Resume your commitment session' : 'Begin your behavioral transformation'}
          </p>
        </div>

        <div className="bg-[#0a0f1a]/80 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
          <AnimatePresence mode="wait">
            {error && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-500 text-xs font-bold uppercase italic tracking-tight"
                >
                    <AlertCircle size={16} />
                    {error}
                </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-6">
            {step === 'signup' && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-4 italic">Legal Name</label>
                <div className="relative group">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input 
                        required
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-16 pr-6 py-4 outline-none focus:border-blue-500 transition-all font-bold italic text-sm text-white"
                    />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-4 italic">Operational Email</label>
              <div className="relative group">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="agent@protocol.io"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-16 pr-6 py-4 outline-none focus:border-blue-500 transition-all font-bold italic text-sm text-white"
                  />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 ml-4 italic">Security Key</label>
              <div className="relative group">
                  <Key className="absolute left-6 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input 
                    required
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-16 pr-6 py-4 outline-none focus:border-blue-500 transition-all font-bold italic text-sm text-white"
                  />
              </div>
            </div>

            <button 
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-black py-5 font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-xl shadow-white/5"
            >
              {isPending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  {step === 'signin' ? 'Authorize Access' : 'Establish Identity'} 
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="relative py-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-[0.3em] font-black italic">
              <span className="bg-[#0a0f1a] px-4 text-white/20">OR</span>
            </div>
          </div>

          <div className="space-y-4">
            <button 
                disabled={isPending}
                onClick={() => handleSignIn("google")}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white/5 border border-white/10 py-5 font-black text-xs uppercase tracking-[0.2em] hover:bg-white/10 transition-all active:scale-[0.98] italic"
            >
                <LogIn size={18} /> Google Authentication
            </button>

            <button 
                onClick={() => setStep(step === 'signin' ? 'signup' : 'signin')}
                className="w-full text-center text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors py-2 italic"
            >
                {step === 'signin' ? "Don't have an identity? Create one" : "Already have an identity? Access protocol"}
            </button>
          </div>
        </div>

        <p className="text-center text-[10px] text-white/10 leading-relaxed max-w-[280px] mx-auto mt-12 font-black uppercase tracking-[0.3em] italic">
          Lockedin Operating Protocol v1.1 <br /> 
          Zero-Trust Behavioral Enforcement
        </p>
      </motion.div>
    </div>
  );
}
