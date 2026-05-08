import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Search, 
  ShieldCheck, 
  UserPlus,
  X,
  Target,
  Wallet,
  History,
  ArrowRight,
  ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Route = createFileRoute('/community')({
  component: CommunityPage,
});

function CommunityPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const { data: user }: { data: any } = useSuspenseQuery(convexQuery(api.users.current, {}) as any);
  const userId = user?._id;
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const { data: discoverableUsers } = useSuspenseQuery(convexQuery(api.users.listDiscoverable, {}) as any);
  const { data: discoverableGoals } = useSuspenseQuery(convexQuery(api.goals.listDiscoverable, {}) as any);
  const { data: myVaults } = useSuspenseQuery(convexQuery(api.goals.listByUser, {}) as any);
  
  const [activeView, setActiveView] = useState<'goals' | 'witnesses'>('goals');
  const [searchTerm, setSearchTerm] = useState('');
  const [requestingTo, setRequestingTo] = useState<any>(null);

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden pb-20">
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <a href="/dashboard" className="relative h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg active:scale-95 transition-transform uppercase italic">L</a>
          <div className="flex flex-col text-left">
            <span className="font-black tracking-tight text-lg leading-none text-white uppercase italic">Community Hub</span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black italic">Network Protocol</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 lg:p-12 text-left relative z-10">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="text-left">
            <h1 className="text-4xl font-black tracking-tight md:text-5xl lg:text-7xl text-left text-white leading-tight uppercase italic">
              Collective <br /> <span className="text-blue-500 text-left">Enforcement.</span>
            </h1>
            <p className="text-white/30 mt-6 text-lg max-w-2xl leading-relaxed text-left font-medium italic">
              Transparency drives discipline. Browse the protocol goals of fellow high-performers or anchor a new witness role.
            </p>
          </div>

          <div className="flex bg-white/5 p-1.5 rounded-[2rem] border border-white/10 shadow-2xl">
            <button 
                onClick={() => setActiveView('goals')}
                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic ${activeView === 'goals' ? 'bg-white text-black shadow-xl' : 'text-white/30 hover:text-white/60'}`}
            >
                Goal Feed
            </button>
            <button 
                onClick={() => setActiveView('witnesses')}
                className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all italic ${activeView === 'witnesses' ? 'bg-white text-black shadow-xl' : 'text-white/30 hover:text-white/60'}`}
            >
                Witness Pool
            </button>
          </div>
        </header>

        <div className="relative mb-16 group">
            <Search className="absolute left-8 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-blue-500 transition-colors" size={24} />
            <input 
              type="text" 
              placeholder={`SEARCH ${activeView === 'goals' ? 'ACTIVE GOALS' : 'HIGH-INTEGRITY WITNESSES'}...`}
              className="w-full bg-white/[0.02] border border-white/10 rounded-[2.5rem] pl-20 pr-8 py-6 text-sm outline-none focus:border-blue-500 transition-all text-white text-left font-black italic tracking-widest shadow-inner uppercase"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        <AnimatePresence mode="wait">
            {activeView === 'goals' ? (
                <motion.div 
                    key="goals"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                    {discoverableGoals && (discoverableGoals as any[]).length === 0 ? (
                        <div className="col-span-full py-40 rounded-[4rem] border border-dashed border-white/10 text-center">
                            <History size={60} className="mx-auto text-white/5 mb-8 opacity-10" />
                            <p className="text-sm text-white/20 font-black uppercase tracking-[0.3em] italic">No discoverable goals found in this sector</p>
                        </div>
                    ) : (
                        (discoverableGoals as any[]).map((goal: any) => (
                            <GoalCard key={goal._id} goal={goal} />
                        ))
                    )}
                </motion.div>
            ) : (
                <motion.div 
                    key="witnesses"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                >
                    {(discoverableUsers as any[]).filter((u: any) => u._id !== userId).map((u: any) => (
                        <WitnessCard key={u._id} user={u} onInvite={() => setRequestingTo(u)} />
                    ))}
                </motion.div>
            )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {requestingTo && (
            <VaultPickerModal 
                partner={requestingTo} 
                vaults={myVaults} 
                onClose={() => setRequestingTo(null)} 
            />
        )}
      </AnimatePresence>
    </div>
  );
}

function GoalCard({ goal }: { goal: any }) {
    return (
        <motion.div 
            whileHover={{ y: -10 }}
            className="group relative rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between"
        >
            <div className="absolute -right-4 -top-4 text-white/[0.01] transition-transform group-hover:scale-110">
                <Target size={160} strokeWidth={1} />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-8">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-[#ff7a00] p-0.5 shadow-lg">
                        <div className="h-full w-full rounded-xl bg-[#0a0f1a] flex items-center justify-center font-black text-xs text-white uppercase italic">
                            {goal.user?.name?.[0]}
                        </div>
                    </div>
                    <div className="text-left font-black">
                        <p className="text-[10px] text-white/20 uppercase tracking-widest italic">{goal.user?.name}</p>
                        <p className="text-[9px] text-blue-500 uppercase tracking-widest italic">Score: {goal.user?.integrityScore}%</p>
                    </div>
                </div>

                <h3 className="text-2xl font-black italic uppercase tracking-tight text-white mb-4 leading-tight">{goal.goal?.title}</h3>
                <p className="text-xs text-white/30 font-medium italic uppercase tracking-tighter leading-relaxed mb-10 line-clamp-2">
                    {goal.goal?.description}
                </p>

                <div className="flex items-center justify-between p-6 rounded-2xl bg-white/[0.02] border border-white/5 mb-8 shadow-inner font-black italic">
                    <div className="text-left">
                        <p className="text-[9px] text-white/20 uppercase tracking-widest mb-1">Staked</p>
                        <p className="text-lg text-white">₦{(goal.amount / 100).toLocaleString()}</p>
                    </div>
                    <div className="h-8 w-px bg-white/5" />
                    <div className="text-right">
                        <p className="text-[9px] text-[#ff7a00] uppercase tracking-widest mb-1">Pain Tier</p>
                        <p className="text-lg text-[#ff7a00] uppercase">{goal.painTier || 'Serious'}</p>
                    </div>
                </div>
            </div>

            <Link 
                to="/vault/$id" 
                params={{ id: goal._id }}
                className="relative z-10 w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white/20 text-[10px] font-black uppercase tracking-widest hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2 italic"
            >
                View Protocol Specs <ArrowRight size={14} />
            </Link>
        </motion.div>
    );
}

function WitnessCard({ user, onInvite }: { user: any, onInvite: () => void }) {
    return (
        <motion.div 
            whileHover={{ y: -10 }}
            className="group relative rounded-[3rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-10 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        >
            <div className="absolute -right-4 -top-4 text-white/[0.01] transition-transform group-hover:scale-110">
                <ShieldCheck size={160} strokeWidth={1} />
            </div>

            <div className="relative z-10">
                <div className="flex flex-col items-center text-center mb-8">
                    <div className="h-24 w-24 rounded-[2rem] bg-gradient-to-tr from-blue-600 to-[#ff7a00] p-0.5 shadow-2xl mb-6">
                        <div className="h-full w-full rounded-[2rem] bg-[#0a0f1a] flex items-center justify-center font-black text-3xl text-white uppercase italic">
                            {user.name?.[0]}
                        </div>
                    </div>
                    <h3 className="text-2xl font-black italic uppercase tracking-tight text-white mb-1">{user.name}</h3>
                    <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black italic">{user.city || 'LAGOS, NIGERIA'}</p>
                </div>

                <p className="text-xs text-white/30 font-medium italic uppercase tracking-tighter leading-relaxed mb-10 text-center px-4 line-clamp-3 h-12">
                    {user.bio || 'HIGH-INTEGRITY PROTOCOL PARTICIPANT FOCUSED ON BEHAVIORAL EXCELLENCE.'}
                </p>

                <div className="grid grid-cols-2 gap-4 mb-10 font-black italic text-center uppercase">
                    <div className="p-4 rounded-2xl bg-blue-600/5 border border-blue-500/10 shadow-inner">
                        <p className="text-[9px] text-blue-500/40 uppercase tracking-widest mb-1">Integrity</p>
                        <p className="text-xl text-blue-500">{user.integrityScore || 100}%</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#ff7a00]/5 border border-[#ff7a00]/10 shadow-inner">
                        <p className="text-[9px] text-[#ff7a00]/40 uppercase tracking-widest mb-1">Streak</p>
                        <p className="text-xl text-[#ff7a00]">{user.streak_count || 0}W</p>
                    </div>
                </div>

                <button 
                    onClick={onInvite}
                    className="w-full py-5 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 italic"
                >
                    <UserPlus size={18} /> Request Oversight
                </button>
            </div>
        </motion.div>
    );
}

function VaultPickerModal({ partner, vaults, onClose }: any) {
    const sendRequest = useMutation(api.partners.request);
    const [sending, setSending] = useState<string | null>(null);

    const handleSelect = async (vaultId: any) => {
        setSending(vaultId);
        try {
            await sendRequest({
                partnerId: partner._id,
                vaultId: vaultId,
            });
            onClose();
        } catch (err) {
            console.error(err);
            alert("Failed to transmit request.");
            setSending(null);
        }
    };

    const activeVaults = vaults.filter((v: any) => v.status === 'active');

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[#050810]/95 backdrop-blur-3xl p-6"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-xl bg-[#0a0f1a] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
                <div className="p-12 text-left">
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center italic font-black border border-blue-500/20 shadow-xl">V</div>
                            <h2 className="text-2xl font-black tracking-tight uppercase italic text-white leading-none">Select Goal</h2>
                        </div>
                        <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:text-white transition-colors active:scale-90"><X size={20} /></button>
                    </div>
                    
                    <p className="text-white/30 text-sm leading-relaxed mb-12 italic font-medium">
                        Authorize <span className="text-white font-black">{partner.name}</span> to oversee one of your active commitment protocols.
                    </p>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                        {activeVaults.length === 0 ? (
                            <div className="p-12 rounded-[2.5rem] border border-dashed border-white/10 text-center bg-white/[0.01]">
                                <p className="text-xs text-white/10 font-black uppercase tracking-[0.3em] italic">No active goals found in your identity</p>
                                <button onClick={onClose} className="mt-8 px-8 py-3 rounded-2xl bg-white text-black font-black uppercase text-[10px] tracking-widest italic">Go Initiate Protocol</button>
                            </div>
                        ) : (
                            activeVaults.map((vault: any) => (
                                <button 
                                    key={vault._id}
                                    onClick={() => handleSelect(vault._id)}
                                    disabled={!!sending}
                                    className="w-full p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] flex items-center justify-between group hover:bg-white/[0.04] hover:border-blue-500/20 transition-all text-left shadow-xl active:scale-[0.98] disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="h-14 w-14 rounded-2xl bg-white/5 flex items-center justify-center text-white/10 group-hover:text-blue-500 transition-colors shadow-inner border border-white/5">
                                            <Target size={28} />
                                        </div>
                                        <div className="text-left font-black uppercase italic">
                                            <p className="text-white text-xl leading-tight tracking-tight">{vault.goal?.title}</p>
                                            <div className="flex items-center gap-3 mt-2 font-black tracking-widest text-[10px] text-white/20">
                                                <Wallet size={12} className="text-[#ff7a00]" /> ₦{(vault.amount / 100).toLocaleString()} <span className="opacity-20">•</span> {vault.painTier || 'Serious'}
                                            </div>
                                        </div>
                                    </div>
                                    {sending === vault._id ? (
                                        <div className="h-6 w-6 border-4 border-blue-500 border-t-transparent animate-spin rounded-full" />
                                    ) : (
                                        <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center text-white/10 group-hover:bg-blue-600/10 group-hover:text-blue-500 transition-all">
                                            <ChevronRight size={20} />
                                        </div>
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    <div className="mt-12 pt-10 border-t border-white/5">
                         <p className="text-[9px] text-center text-white/10 font-black uppercase tracking-[0.5em] italic leading-loose">
                            Protocol Authorization Required <br /> Secure Witness Peer-to-Peer Synchronization
                         </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}
