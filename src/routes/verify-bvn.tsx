import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation as useConvexMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { ShieldCheck, ArrowRight, Loader2, Info, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export const Route = createFileRoute('/verify-bvn')({
  component: VerifyBvnPage,
});

function VerifyBvnPage() {
  const navigate = useNavigate();
  const [bvn, setBvn] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [step, setStep] = useState(1); // 1: BVN, 2: Name Confirmation
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const verifyBvn = useConvexMutation(api.users.verifyBvn);

  const handleBvnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (bvn.length !== 11) {
      setError('BVN must be 11 digits');
      return;
    }
    setStep(2);
  };

  const handleFinalVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    setError(null);

    try {
      await verifyBvn({ 
        bvn, 
        firstName: firstName.trim(), 
        lastName: lastName.trim() 
      });
      // Final Redirection to dashboard
      navigate({ to: '/dashboard' });
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check your details.');
      setStep(1); // Go back to correct the BVN
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

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.form 
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleBvnSubmit} 
              className="space-y-8"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                    Bank Verification Number
                  </label>
                  <span className="text-[10px] font-black text-blue-500/50 uppercase tracking-widest">Step 01/02</span>
                </div>
                <div className="relative group">
                  <input 
                    type="text" 
                    maxLength={11}
                    value={bvn}
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
                {error && (
                  <p className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</p>
                )}
              </div>

              <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5 flex items-start gap-4 shadow-inner">
                <Info className="text-white/20 shrink-0" size={18} />
                <p className="text-[11px] text-white/40 leading-relaxed font-medium italic">
                  Lockedin utilizes <span className="text-white">Mono Identity Protocol</span> to verify your records. We never see your bank balance or transaction history.
                </p>
              </div>

              <button 
                type="submit"
                disabled={bvn.length !== 11}
                className="w-full flex items-center justify-center gap-3 rounded-3xl bg-white text-black py-6 font-black text-xs uppercase tracking-[0.2em] hover:scale-[1.02] disabled:opacity-30 transition-all active:scale-95 shadow-xl shadow-white/5"
              >
                Initiate Lookup <ArrowRight size={18} />
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleFinalVerify} 
              className="space-y-8"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">
                    KYC Name Confirmation
                  </label>
                  <span className="text-[10px] font-black text-blue-500/50 uppercase tracking-widest">Step 02/02</span>
                </div>
                
                <div className="space-y-4">
                  <input 
                    type="text" 
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Legal First Name" 
                    className="w-full bg-white/[0.02] border border-white/10 rounded-[1.5rem] px-6 py-5 text-sm font-bold uppercase tracking-widest focus:border-blue-500/50 outline-none transition-all placeholder:text-white/10 italic"
                  />
                  <input 
                    type="text" 
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Legal Last Name" 
                    className="w-full bg-white/[0.02] border border-white/10 rounded-[1.5rem] px-6 py-5 text-sm font-bold uppercase tracking-widest focus:border-blue-500/50 outline-none transition-all placeholder:text-white/10 italic"
                  />
                </div>
              </div>

              <div className="p-6 rounded-[2.5rem] bg-blue-600/10 border border-blue-500/20 shadow-inner">
                 <p className="text-[11px] text-blue-500 leading-relaxed font-black uppercase tracking-widest text-center italic">
                    Identity details must match your bank records exactly.
                 </p>
              </div>

              <div className="flex flex-col gap-4">
                <button 
                  type="submit"
                  disabled={isVerifying || !firstName || !lastName}
                  className="w-full flex items-center justify-center gap-3 rounded-3xl bg-blue-600 text-white py-6 font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all active:scale-95 shadow-2xl shadow-blue-900/40"
                >
                  {isVerifying ? (
                    <Loader2 size={20} className="animate-spin" />
                  ) : (
                    <>
                      Confirm Identity <ShieldCheck size={18} />
                    </>
                  )}
                </button>
                <button 
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-full py-4 text-[10px] font-black uppercase tracking-[0.3em] text-white/20 hover:text-white transition-colors italic"
                >
                  Back to BVN
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="mt-12 text-center text-[10px] text-white/5 leading-relaxed uppercase tracking-[0.4em] font-black">
          Lockedin Operating Protocol v1.1 <br /> Federal Identity Compliant
        </p>
      </motion.div>
    </div>
  );
}
