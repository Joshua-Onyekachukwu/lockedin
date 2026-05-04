import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  ShieldCheck, 
  Target, 
  Users, 
  Lock,
  ArrowRight
} from 'lucide-react';
import { useEffect } from 'react';
import { motion } from 'framer-motion';

export const Route = createFileRoute('/invite/$goalId')({
  component: PartnerInvite,
});

function PartnerInvite() {
  const { goalId } = Route.useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.current, {}));
  
  const joinAsPartner = useMutation(api.partners.join);
  
  const { data: vault }: { data: any } = useSuspenseQuery(convexQuery(api.goals.getFullContext, { 
    vaultId: goalId as any, 
    userId: user?._id ?? ("" as any) 
  }));

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleAccept = async () => {
    if (!user?._id) return;
    await joinAsPartner({
        vaultId: goalId as any,
        userId: user._id,
        role: 'verifier'
    });
    navigate({ to: '/dashboard' });
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans flex items-center justify-center p-6">
      <div className="fixed inset-0 pointer-events-none text-left">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full text-left" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full text-left" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl relative text-left"
      >
        <div className="rounded-[3rem] border border-white/10 bg-[#0a0f1a]/80 backdrop-blur-2xl overflow-hidden shadow-2xl text-left">
          <div className="p-10 text-center text-left">
            <div className="mx-auto h-20 w-20 rounded-[2rem] bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-900/40 mb-8 text-white">
                <Users size={32} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight italic uppercase text-white text-center">Accountability Request</h1>
            <p className="mt-4 text-white/40 leading-relaxed font-medium italic text-center">
                A high-stakes commitment protocol has been initiated and your oversight is requested as a <span className="text-blue-500 font-bold italic not-italic text-center">Designated Verifier</span>.
            </p>
          </div>

          <div className="px-10 py-8 bg-white/[0.02] border-y border-white/5 space-y-6 text-left font-bold text-white">
            <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30 shadow-xl text-center">
                    <Target size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 font-black tracking-widest uppercase">The Protocol</p>
                    <p className="text-lg font-bold mt-1 italic uppercase text-white">{vault?.goal?.title ?? 'Active Commitment'}</p>
                </div>
            </div>
            <div className="flex items-start gap-4 text-left font-bold text-white">
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30 shadow-xl text-center">
                    <Lock size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 font-black tracking-widest uppercase">Staked Capital</p>
                    <p className="text-lg font-bold mt-1 text-[#ff7a00] italic">₦{(vault?.amount / 100)?.toLocaleString()} At Risk</p>
                </div>
            </div>
            <div className="flex items-start gap-4 text-left font-bold text-white">
                <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/30 shadow-xl text-center">
                    <ShieldCheck size={20} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 font-black tracking-widest uppercase">Your Role</p>
                    <p className="text-sm text-white/60 mt-1 leading-relaxed font-medium italic">
                        You will be required to review evidence (photos/notes) and confirm execution within a 24-hour window.
                    </p>
                </div>
            </div>
          </div>

          <div className="p-10 grid grid-cols-2 gap-4 font-black uppercase tracking-widest text-[10px] text-center">
            <button 
                onClick={() => navigate({ to: '/' })}
                className="py-4 rounded-2xl border border-white/10 font-bold text-white/40 hover:text-white hover:bg-white/5 transition-all text-center active:scale-95 shadow-xl text-center"
            >
                Decline
            </button>
            <button 
                onClick={handleAccept}
                className="py-4 rounded-2xl bg-blue-600 font-bold text-white hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 active:scale-95 text-center text-center"
            >
                Accept Mandate <ArrowRight size={18} />
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/10 italic text-center font-black">Lockedin Behavioral Protocol v1.0</p>
        </div>
      </motion.div>
    </div>
  );
}
