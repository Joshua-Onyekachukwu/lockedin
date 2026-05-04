import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAction } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ArrowRight, Loader2, Info, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export const Route = createFileRoute('/verify-bvn')({
  component: VerifyBvnPage,
});

function VerifyBvnPage() {
  const navigate = useNavigate();
  const [bvn, setBvn] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const verifyIdentity = useAction(api.mono.verifyIdentity);

  const handleBvnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bvn.length !== 11) {
      setError('BVN must be 11 digits');
      return;
    }
    
    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyIdentity({ bvn });
      if (result.success) {
        navigate({ to: '/dashboard' });
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Verification protocol failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white flex items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Premium Glow Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-12">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-600 blur-md opacity-30" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-[2rem] bg-[#0a0f1a] border border-blue-500/20 shadow-2xl text-blue-500">
              <Lock size={32} strokeWidth={2.5} />
            </div>
          </div>
          <h1 className="text-3xl font-black tracking-tight uppercase italic text-center leading-none">Identity Anchor</h1>
          <p className="text-white/30 mt-4 text-center text-sm font-medium italic max-w-[280px]">
            To participate in capital-backed mandates, your identity must be verified via the federal banking protocol.
          </p>
        </div>

        <form onSubmit={handleBvnSubmit} className="space-y-8">
            <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                Bank Verification Number
                </label>
            </div>
            <div className="relative group">
                <input 
                type="text" 
                maxLength={11}
                value={bvn}
                disabled={isVerifying}
                autoFocus
                onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setBvn(val);
                    setError(null);
                }}
                placeholder="00000000000" 
                className="w-full bg-white/[0.02] border border-white/10 rounded-3xl px-8 py-6 text-2xl tracking-[0.4em] font-mono focus:border-blue-500/50 outline-none transition-all placeholder:text-white/5 text-center"
                />
            </div>
            <AnimatePresence>
                {error && (
                <motion.p 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center"
                >
                    {error}
                </motion.p>
                )}
            </AnimatePresence>
            </div>

            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-start gap-4 shadow-inner">
            <Info className="text-white/20 shrink-0" size={18} />
            <p className="text-[11px] text-white/40 leading-relaxed font-medium italic text-balance">
                Lockedin utilizes <span className="text-white">Mono Identity Protocol</span> to verify your records. We never see your bank balance or transaction history.
            </p>
            </div>

            <button 
            type="submit"
            disabled={bvn.length !== 11 || isVerifying}
            className="w-full flex items-center justify-center gap-3 rounded-3xl bg-white text-black py-6 font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] disabled:opacity-30 transition-all active:scale-95 shadow-xl shadow-white/5"
            >
            {isVerifying ? (
                <Loader2 size={20} className="animate-spin" />
            ) : (
                <>Initiate Identity Lookup <ArrowRight size={18} /></>
            )}
            </button>
        </form>

        <p className="mt-12 text-center text-[10px] text-white/5 leading-relaxed uppercase tracking-[0.4em] font-black italic">
          Lockedin Operating Protocol v1.1 <br /> Federal Identity Compliant
        </p>
      </motion.div>
    </div>
  );
}
