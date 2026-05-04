import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation as useConvexMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ShieldCheck, Fingerprint, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';

export const Route = createFileRoute('/verify-bvn')({
  component: VerifyBvnPage,
});

function VerifyBvnPage() {
  const navigate = useNavigate();
  const [bvn, setBvn] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const verifyBvn = useConvexMutation(api.users.verifyBvn);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bvn.length !== 11) {
      setError('BVN must be 11 digits');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      await verifyBvn({ bvn });
      // Redirect to dashboard or home after successful verification
      navigate({ to: '/' });
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your BVN.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Glow Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-[#ff7a00] blur-md opacity-30" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff7a00] to-[#ff9500] shadow-lg shadow-orange-900/20 text-black">
              <Fingerprint size={32} />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Identity Mandate</h1>
          <p className="text-white/40 mt-2 text-center max-w-[300px]">
            Federal verification is required to authorize capital staking and protocol participation.
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/30 ml-4">
              Bank Verification Number (BVN)
            </label>
            <div className="relative group">
              <input 
                type="text" 
                maxLength={11}
                value={bvn}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setBvn(val);
                  setError(null);
                }}
                placeholder="00000000000" 
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xl tracking-[0.3em] font-mono focus:border-[#ff7a00]/50 outline-none transition-all placeholder:text-white/5"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-[#ff7a00]/50 transition-colors">
                <ShieldCheck size={20} />
              </div>
            </div>
            {error && (
              <p className="text-red-500 text-xs mt-2 ml-4 font-medium">{error}</p>
            )}
          </div>

          <button 
            type="submit"
            disabled={isVerifying || bvn.length !== 11}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-black p-4 font-bold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {isVerifying ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>
                Confirm Identity <ArrowRight size={18} />
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-white/10 leading-relaxed uppercase tracking-widest px-8">
            Your BVN is used for identity verification only. We do not have access to your bank accounts.
          </p>
        </form>
      </motion.div>
    </div>
  );
}
