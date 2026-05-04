import { createFileRoute, useNavigate } from '@tanstack/react-router';
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
  Wallet
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Route = createFileRoute('/community')({
  component: CommunityPage,
});

function CommunityPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.current, {}));
  const userId = user?._id;
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const { data: discoverableUsers } = useSuspenseQuery(convexQuery((api.users as any).listDiscoverable || api.users.current, {}) as any);
  const { data: myVaults } = useSuspenseQuery(convexQuery(api.goals.listByUser, {}) as any);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [requestingTo, setRequestingTo] = useState<any>(null);

  const categories = ['fitness', 'learning', 'financial', 'habit', 'professional'];

  const handleSendRequest = async (partnerId: any) => {
    if (!userId) return;
    setRequestingTo((discoverableUsers as any[]).find((u: any) => u._id === partnerId));
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <a href="/dashboard" className="relative h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg active:scale-95 transition-transform uppercase italic">L</a>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-tight text-lg leading-none text-white">Community</span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">Discover Partners</span>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 lg:p-12 text-left relative z-10">
        <header className="mb-16 text-left">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl text-left text-white leading-tight font-black italic uppercase">
            Find Your <span className="text-blue-500 text-left">Witness.</span>
          </h1>
          <p className="text-white/30 mt-6 text-lg max-w-2xl leading-relaxed text-left font-medium italic">
            Browse high-integrity community members and find a dedicated verifier for your next protocol.
          </p>
        </header>

        <div className="flex flex-col md:flex-row gap-6 mb-12 text-left items-start">
          <div className="relative flex-1 text-left w-full group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-white/10 group-focus-within:text-blue-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by name or city..." 
              className="w-full bg-white/[0.02] border border-white/10 rounded-3xl pl-16 pr-8 py-5 text-sm outline-none focus:border-blue-500/50 transition-all text-white text-left font-medium italic"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 text-left scrollbar-hide">
            {categories.map(cat => (
                <button 
                    key={cat}
                    onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                    className={`px-6 py-3 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap active:scale-95 ${
                        activeCategory === cat ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'border-white/5 text-white/20 hover:text-white hover:bg-white/5'
                    }`}
                >
                    {cat}
                </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
            {(discoverableUsers as any[]).filter((u: any) => u._id !== userId).map((user: any) => (
                <motion.div 
                    key={user._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="group relative rounded-[2.5rem] border border-white/5 bg-white/[0.02] p-8 hover:bg-white/[0.04] transition-all text-left overflow-hidden shadow-xl"
                >
                    <div className="absolute -right-4 -top-4 text-white/[0.01] transition-transform group-hover:scale-110">
                        <ShieldCheck size={140} strokeWidth={1} />
                    </div>

                    <div className="relative z-10 text-left">
                        <div className="flex items-center gap-4 mb-6 text-left">
                            <div className="h-16 w-16 rounded-[1.5rem] bg-gradient-to-tr from-blue-600 to-[#ff7a00] p-0.5 shadow-lg">
                                <div className="h-full w-full rounded-[1.5rem] bg-[#0a0f1a] flex items-center justify-center font-black text-lg text-white uppercase text-center italic">
                                    {user.name?.[0]}
                                </div>
                            </div>
                            <div className="text-left flex-1 font-bold">
                                <h3 className="font-bold text-xl tracking-tight text-white text-left uppercase italic">{user.name}</h3>
                                <p className="text-[10px] text-white/20 uppercase tracking-widest font-black mt-1 text-left italic">{user.city || 'Lagos, Nigeria'}</p>
                            </div>
                        </div>

                        <p className="text-sm text-white/40 leading-relaxed line-clamp-2 h-10 text-left font-medium italic">
                            {user.bio || 'Dedicated high-performer focused on building lasting habits and operational excellence.'}
                        </p>

                        <div className="mt-8 grid grid-cols-2 gap-4 text-left font-black">
                            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-left group-hover:border-blue-500/20 transition-colors">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left">Integrity</p>
                                <p className="text-lg font-bold text-blue-500 mt-1 text-left italic font-black">{user.integrityScore || 100}%</p>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 text-left group-hover:border-[#ff7a00]/20 transition-colors">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left">Streak</p>
                                <p className="text-lg font-bold text-[#ff7a00] mt-1 text-left italic font-black">{user.streak_count || 0}W</p>
                            </div>
                        </div>

                        <button 
                            onClick={() => handleSendRequest(user._id)}
                            className="w-full mt-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl bg-white text-black hover:scale-[1.02] active:scale-95 shadow-white/5"
                        >
                            <UserPlus size={18} /> Send Request
                        </button>
                    </div>
                </motion.div>
            ))}
        </div>
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
            alert("Protocol Authorization Request Transmitted.");
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/95 backdrop-blur-3xl p-6"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-xl bg-[#0a0f1a] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
                <div className="p-12 text-left">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center italic font-black border border-blue-500/20 shadow-xl">V</div>
                            <h2 className="text-2xl font-black tracking-tight uppercase italic text-white leading-none">Select Mandate</h2>
                        </div>
                        <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:text-white transition-colors active:scale-90"><X size={20} /></button>
                    </div>
                    
                    <p className="text-white/30 text-sm leading-relaxed mb-10 italic font-medium">
                        Authorize <span className="text-white font-bold">{partner.name}</span> to oversee one of your active commitment protocols.
                    </p>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
                        {activeVaults.length === 0 ? (
                            <div className="p-10 rounded-[2rem] border border-dashed border-white/5 text-center">
                                <p className="text-xs text-white/20 font-black uppercase tracking-widest italic">No Active Protocols Found</p>
                            </div>
                        ) : (
                            activeVaults.map((vault: any) => (
                                <button 
                                    key={vault._id}
                                    onClick={() => handleSelect(vault._id)}
                                    disabled={!!sending}
                                    className="w-full p-6 rounded-[2rem] border border-white/5 bg-white/[0.02] flex items-center justify-between group hover:bg-white/[0.04] transition-all text-left shadow-xl active:scale-[0.98] disabled:opacity-50"
                                >
                                    <div className="flex items-center gap-6">
                                        <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20 group-hover:text-blue-500 transition-colors shadow-inner">
                                            <Target size={24} />
                                        </div>
                                        <div className="text-left font-bold">
                                            <p className="text-white uppercase italic text-lg leading-tight">{vault.goal?.title}</p>
                                            <div className="flex items-center gap-3 mt-1.5 font-black uppercase tracking-widest text-[9px] text-white/20">
                                                <Wallet size={12} className="text-blue-500/50" /> ₦{(vault.amount / 100).toLocaleString()}
                                            </div>
                                        </div>
                                    </div>
                                    {sending === vault._id ? (
                                        <div className="h-5 w-5 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" />
                                    ) : (
                                        <ChevronRight size={20} className="text-white/10 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>

                    <div className="mt-10 pt-10 border-t border-white/5">
                         <p className="text-[9px] text-center text-white/10 font-black uppercase tracking-[0.3em] italic leading-loose">
                            Protocol Authorization Required <br /> Standard Oversight Window: 24 Hours
                         </p>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    );
}

const ChevronRight = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m9 18 6-6-6-6"/></svg>;
