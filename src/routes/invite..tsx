import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMutation, useSuspenseQuery, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  ShieldCheck, 
  ArrowRight, 
  Users, 
  Target, 
  Lock, 
  CheckCircle2,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { convexQuery } from '@convex-dev/react-query';

export const Route = createFileRoute('/invite/')({
  component: InvitePage,
});

function InvitePage() {
  const { vaultId } = Route.useParams();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { data: user }: { data: any } = useSuspenseQuery(convexQuery(api.users.current, {}) as any);
  const navigate = useNavigate();
  
  const joinByInvite = useMutation(api.partners.joinByInvite);
  const { data: vault }: { data: any } = useSuspenseQuery(convexQuery(api.goals.getFullContext, {
    vaultId: vaultId as any
  }));

  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{success: boolean, message: string} | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login', search: { redirect: `/invite/${vaultId}` } } as any);
    }
  }, [isAuthenticated, authLoading, navigate, vaultId]);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
        const res = await joinByInvite({ vaultId: vaultId as any });
        setResult(res);
        if (res.success) {
            setTimeout(() => navigate({ to: '/dashboard' }), 3000);
        }
    } catch (err) {
        setResult({ success: false, message: "Protocol synchronization failure." });
    } finally {
        setIsProcessing(false);
    }
  };

  if (!vault) return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center text-white font-black uppercase italic">
        Invite protocol not found.
    </div>
  );

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl relative"
      >
        <div className="rounded-[3rem] border border-white/10 bg-[#0a0f1a]/80 backdrop-blur-2xl overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
          <div className="p-12 text-center">
            <div className="mx-auto h-20 w-20 rounded-[2rem] bg-blue-600 flex items-center justify-center shadow-2xl shadow-blue-900/40 mb-10 text-white">
                <Users size={32} />
            </div>
            <h1 className="text-4xl font-black tracking-tight italic uppercase text-white leading-tight">Witness Authorization</h1>
            <p className="mt-4 text-white/40 leading-relaxed font-medium italic">
                A behavioral mandate requires your oversight as a <span className="text-blue-500 font-black">Designated Witness</span>.
            </p>
          </div>

          <div className="px-12 py-10 bg-white/[0.02] border-y border-white/5 space-y-8 text-left">
            <div className="flex items-start gap-6">
                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 border border-white/5 shadow-xl shrink-0">
                    <Target size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-1 italic">Protocol Identity</p>
                    <p className="text-xl font-black italic uppercase text-white leading-tight">{vault?.goal?.title ?? 'Active Mandate'}</p>
                </div>
            </div>

            <div className="flex items-start gap-6 text-left">
                <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/30 border border-white/5 shadow-xl shrink-0">
                    <Lock size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-1 italic">Staked Capital</p>
                    <p className="text-xl font-black italic text-[#ff7a00] leading-tight">₦{(vault?.amount / 100)?.toLocaleString()} At Risk</p>
                </div>
            </div>

            <div className="flex items-start gap-6 text-left">
                <div className="h-12 w-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-xl shrink-0">
                    <ShieldCheck size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-1 italic">Witness Obligation</p>
                    <p className="text-sm text-white/60 leading-relaxed font-medium italic">
                        You will be required to review evidence logs and authorize or reject protocol adherence within 24 hours.
                    </p>
                </div>
            </div>
          </div>

          <div className="p-12">
            {result ? (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className={`p-6 rounded-3xl flex items-center gap-4 ${result.success ? 'bg-green-600/10 border border-green-500/20 text-green-500' : 'bg-red-600/10 border border-red-500/20 text-red-500'}`}
                >
                    {result.success ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                    <p className="font-black italic uppercase text-sm tracking-widest">{result.message}</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => navigate({ to: '/' })}
                        className="py-5 rounded-3xl border border-white/10 font-black uppercase tracking-widest text-[10px] text-white/40 hover:text-white hover:bg-white/5 transition-all active:scale-95 italic"
                    >
                        Decline
                    </button>
                    <button
                        onClick={handleAccept}
                        disabled={isProcessing}
                        className="py-5 rounded-3xl bg-blue-600 font-black uppercase tracking-widest text-[10px] text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-900/40 active:scale-95 italic"
                    >
                        {isProcessing ? 'Anchoring...' : 'Accept Mandate'}
                        {!isProcessing && <ArrowRight size={16} />}
                    </button>
                </div>
            )}
          </div>
        </div>
        
        <div className="mt-10 text-center">
            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white/10 italic">Secure Protocol Authorization Module v1.1.2</p>
        </div>
      </motion.div>
    </div>
  );
}
