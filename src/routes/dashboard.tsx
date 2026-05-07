import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useAction, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Bell, 
  Target, 
  ShieldCheck, 
  Plus, 
  Wallet,
  X,
  Camera,
  AlertCircle,
  Trophy,
  CreditCard,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  Building2,
  User,
  Users,
  Eye,
  Clock
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePaystackPayment } from 'react-paystack';

const PAYSTACK_PUBLIC_KEY = "pk_live_a5789ea13824e2329d75420ee40bf1975b1a13d2";

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const { data: user }: { data: any } = useSuspenseQuery(convexQuery(api.users.current, {}) as any);
  
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, authLoading, navigate]);

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  /* 
  BLOCKER REMOVED FOR MVP TESTING
  if (!(user as any).bvn_verified) {
     navigate({ to: '/verify-bvn' });
     return null;
  }
  */

  return <DashboardContent user={user} />;
}

function DashboardContent({ user }: { user: any }) {
  const { data: vaults } = useSuspenseQuery(convexQuery(api.goals.listByUser, {}) as any);
  const { data: discoverableVaults } = useSuspenseQuery(convexQuery(api.goals.listDiscoverable, {}) as any);
  const { data: pendingVerifications } = useSuspenseQuery(convexQuery(api.verifications.getPendingVerifications, {}) as any);
  const { data: incomingRequests } = useSuspenseQuery(convexQuery(api.partners.listIncomingRequests, {}) as any);
  const { data: notifications } = useSuspenseQuery(convexQuery((api as any).notifications.list, {}) as any);
  const { data: transactions } = useSuspenseQuery(convexQuery(api.payments.getTransactions, {}) as any);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isFunding, setIsFunding] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [checkingInGoal, setCheckingInGoal] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeTab, setActiveTab] = useState<'protocols' | 'witnessing' | 'wallet'>('protocols');
  
  const verifyLog = useMutation(api.verifications.verifyLog);
  const acceptPartnerRequest = useMutation(api.partners.acceptRequest);
  const markRead = useMutation((api as any).notifications.markRead);
  const requestPartnership = useMutation(api.partners.request);

  const handleVerify = async (logId: any, status: 'approved' | 'rejected') => {
      await verifyLog({ logId, status });
  };

  const handleRequestWitness = async (vaultId: any, partnerId: any) => {
      try {
          await requestPartnership({ vaultId, partnerId });
          alert("Witness Request Transmitted.");
      } catch (err: any) {
          alert(err.message || "Failed to transmit request.");
      }
  };

  const unreadCount = (notifications as any[])?.filter?.((n: any) => !n.read).length || 0;

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden pb-20">
      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <div className="relative group text-left">
            <div className="absolute inset-0 bg-blue-600 blur-md opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold shadow-lg shadow-blue-900/40 transition-transform group-hover:scale-105 active:scale-95 text-white uppercase italic">L</div>
          </div>
          <div className="flex flex-col text-left">
            <span className="font-black tracking-tighter text-xl leading-none text-white uppercase italic">Lock<span className="text-blue-500">edin</span></span>
            <span className="text-[9px] text-white/20 uppercase tracking-[0.3em] mt-1 font-black italic">Operational Protocol</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8 text-left font-bold">
          <div className="hidden sm:flex items-center gap-6 text-sm font-black uppercase tracking-widest text-white/40 italic">
            <Link to="/leaderboard" className="hover:text-white cursor-pointer transition-colors active:scale-95 flex items-center gap-2 italic text-[10px]">
                <Trophy size={14} className="text-yellow-500" /> Leaderboard
            </Link>
            <Link to="/community" className="hover:text-white cursor-pointer transition-colors active:scale-95 text-[10px]">Community</Link>
          </div>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white active:scale-95"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 bg-[#ff7a00] rounded-full border-4 border-[#050810] flex items-center justify-center shadow-lg" />
            )}
          </button>

          <button 
            onClick={() => setActiveTab('wallet')}
            className={`flex items-center gap-3 px-4 py-2 rounded-2xl transition-all active:scale-95 border ${activeTab === 'wallet' ? 'bg-blue-600/10 border-blue-500 text-white shadow-xl shadow-blue-900/10' : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'}`}
          >
            <Wallet size={16} className={activeTab === 'wallet' ? 'text-blue-500' : 'text-[#ff7a00]'} />
            <span className="text-sm font-black tracking-tight italic">₦{(user?.balance / 100)?.toLocaleString()}</span>
          </button>

          <Link 
            to="/profile"
            className="h-10 w-10 rounded-full bg-gradient-to-tr from-blue-600 to-[#ff7a00] p-0.5 shadow-lg active:scale-95 transition-transform"
          >
            <div className="h-full w-full rounded-full bg-[#0a0f1a] flex items-center justify-center text-[10px] font-black uppercase">
                {user?.name?.[0]}
            </div>
          </Link>
        </div>
      </nav>

      <AnimatePresence>
        {showNotifications && (
            <>
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    onClick={() => setShowNotifications(false)}
                    className="fixed inset-0 bg-[#050810]/60 backdrop-blur-sm z-40"
                />
                <motion.div 
                    initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
                    className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#0a0f1a] border-l border-white/10 z-50 shadow-[0_0_80px_rgba(0,0,0,1)] p-8 overflow-y-auto backdrop-blur-3xl"
                >
                    <div className="flex items-center justify-between mb-10 text-left">
                        <h3 className="font-bold text-xl text-left text-white font-black uppercase tracking-widest italic">Protocol Logs</h3>
                        <button onClick={() => setShowNotifications(false)} className="text-white/20 hover:text-white transition-colors active:scale-95"><X size={24} /></button>
                    </div>

                    <div className="space-y-4 text-left">
                        {(notifications as any[]).length === 0 ? (
                            <div className="text-center mt-20">
                                <Bell className="mx-auto text-white/5 mb-4 opacity-10" size={60} />
                                <p className="text-sm text-white/20 italic font-medium uppercase tracking-widest">System logs clear.</p>
                            </div>
                        ) : (
                            (notifications as any[]).map((n: any) => (
                                <div 
                                    key={n._id} 
                                    onClick={() => markRead?.({ notificationId: n._id })}
                                    className={`p-6 rounded-[2rem] border transition-all text-left group cursor-pointer active:scale-[0.98] ${n.read ? 'bg-transparent border-white/5 opacity-50' : 'bg-white/[0.03] border-white/10 shadow-xl shadow-black/40 hover:bg-white/[0.05] hover:border-white/20'}`}
                                >
                                    <div className="flex items-start gap-4 text-left">
                                        <div className={`mt-1 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${n.read ? 'bg-white/5 text-white/20' : 'bg-blue-600/10 text-blue-500 group-hover:scale-110 transition-transform shadow-blue-900/20'}`}>
                                            <Bell size={14} />
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-black text-sm text-white italic uppercase tracking-tight">{n.title}</p>
                                            <p className="text-xs text-white/30 mt-1 leading-relaxed font-medium italic">{n.message}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            </>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto p-6 lg:p-12 text-left relative z-10">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 text-left">
          <div className="text-left">
            <h1 className="text-4xl font-black tracking-tight md:text-5xl lg:text-7xl text-left text-white leading-tight uppercase italic">
              {activeTab === 'protocols' ? 'Operational ' : activeTab === 'witnessing' ? 'Witness ' : 'Capital '}
              <span className="text-blue-500 text-left">{activeTab === 'protocols' ? 'Intelligence.' : activeTab === 'witnessing' ? 'Authority.' : 'Command.'}</span>
            </h1>
            <p className="text-white/30 mt-6 text-lg max-w-2xl leading-relaxed text-left font-medium italic">
                {activeTab === 'protocols' 
                    ? `Integrity Score: ${user.integrityScore || 100}%. Adherence to active mandates is non-negotiable.`
                    : activeTab === 'witnessing'
                    ? `Review protocol evidence and authorize mandate compliance for your peers.`
                    : `Command your liquid capital. Deploy stakes to enforce behavioral mandates.`
                }
            </p>
          </div>
          
          <div className="flex bg-white/5 p-1.5 rounded-[2rem] border border-white/10">
             {(['protocols', 'witnessing', 'wallet'] as const).map((tab) => (
                <button 
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-black shadow-xl' : 'text-white/30 hover:text-white/60'}`}
                >
                    {tab}
                </button>
             ))}
          </div>
        </header>

        <AnimatePresence mode="wait">
            {activeTab === 'protocols' ? (
                <motion.div 
                    key="protocols"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="space-y-12"
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                        {(vaults as any[]).map((vault: any) => (
                            <VaultCard key={vault._id} vault={vault} onCheckIn={() => setCheckingInGoal(vault)} />
                        ))}
                        
                        <button 
                            onClick={() => setIsCreating(true)}
                            className="group relative rounded-[4rem] border border-dashed border-white/10 bg-white/[0.01] flex flex-col items-center justify-center text-center p-12 hover:bg-white/[0.03] hover:border-blue-500/20 transition-all min-h-[350px] shadow-inner"
                        >
                            <Plus size={48} className="text-white/5 mb-8 group-hover:scale-110 group-hover:text-blue-500 transition-all" />
                            <p className="text-white/30 font-black uppercase tracking-[0.3em] text-xs italic">Initiate New Protocol</p>
                            <p className="text-[9px] text-white/10 uppercase tracking-widest mt-3 italic font-black">Stake capital to enforce discipline</p>
                        </button>
                    </div>
                </motion.div>
            ) : activeTab === 'witnessing' ? (
                <motion.div 
                    key="witnessing"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="space-y-16"
                >
                    {((incomingRequests as any[])?.length || 0) > 0 && (
                        <section className="text-left">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 mb-10 flex items-center gap-6 text-left font-black italic">
                                Incoming Witness Requests
                                <div className="h-px flex-1 bg-white/5 text-left" />
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                {(incomingRequests as any[]).map((req: any) => (
                                    <div key={req._id} className="p-8 rounded-[3rem] border border-white/5 bg-white/[0.02] flex items-center justify-between group hover:border-blue-500/20 transition-all text-left shadow-2xl">
                                        <div className="flex items-center gap-6">
                                            <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/20">
                                                <Users size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 mb-1 italic">{req.requester?.name} Requests Oversight</p>
                                                <p className="font-black italic uppercase text-lg text-white">{req.goal?.title}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => acceptPartnerRequest({ partnerShipId: req._id })}
                                            className="px-6 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest italic shadow-xl shadow-blue-900/40 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Accept Role
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    <section className="text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 mb-10 flex items-center gap-6 text-left font-black italic">
                            Evidence Authorization Terminal
                            <div className="h-px flex-1 bg-white/5 text-left" />
                        </h3>
                        
                        {(pendingVerifications as any[]).length === 0 ? (
                            <div className="p-24 rounded-[4rem] border border-white/5 bg-white/[0.01] text-center shadow-inner group">
                                <ShieldCheck size={60} className="mx-auto text-white/5 mb-8 opacity-10 group-hover:scale-110 transition-transform" />
                                <p className="text-sm text-white/20 italic font-black uppercase tracking-widest">No evidence logs awaiting authorization</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                                {(pendingVerifications as any[]).map((log: any) => (
                                    <div key={log._id} className="p-10 rounded-[3.5rem] border border-white/10 bg-[#0a0f1a]/80 backdrop-blur-3xl overflow-hidden group hover:border-blue-500/20 transition-all text-left shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                                        <div className="flex items-center gap-4 mb-8">
                                            <div className="h-10 w-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 shadow-xl">
                                                <Eye size={18} />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">Participant: {log.userName}</p>
                                                <p className="font-black italic uppercase text-lg text-white">{log.goalTitle}</p>
                                            </div>
                                        </div>

                                        {log.proofUrl && (
                                            <div className="w-full aspect-square rounded-[2rem] overflow-hidden mb-8 border border-white/5 shadow-inner bg-black">
                                                <img src={log.proofUrl} className="w-full h-full object-cover" alt="Execution Evidence" />
                                            </div>
                                        )}

                                        <p className="p-6 rounded-2xl bg-white/5 border border-white/5 text-xs text-white/40 italic font-medium mb-10 leading-relaxed">
                                            "{log.note || 'No specification provided with this log.'}"
                                        </p>

                                        <div className="grid grid-cols-2 gap-4">
                                            <button 
                                                onClick={() => handleVerify(log._id, 'rejected')}
                                                className="py-5 rounded-2xl border border-red-500/20 text-red-500/40 hover:text-red-500 hover:bg-red-500/5 transition-all font-black uppercase tracking-widest text-[10px] italic shadow-xl"
                                            >
                                                Reject Log
                                            </button>
                                            <button 
                                                onClick={() => handleVerify(log._id, 'approved')}
                                                className="py-5 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all font-black uppercase tracking-widest text-[10px] italic shadow-xl shadow-blue-900/40"
                                            >
                                                Authorize
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="text-left">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 mb-10 flex items-center gap-6 text-left font-black italic">
                            Explore Protocols & Offer Witnessing
                            <div className="h-px flex-1 bg-white/5 text-left" />
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                            {(discoverableVaults as any[])
                                .filter((v: any) => v.userId !== user._id)
                                .map((v: any) => (
                                <div key={v._id} className="p-10 rounded-[3.5rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all text-left shadow-2xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 text-white/[0.02] group-hover:scale-110 transition-transform">
                                        <Users size={120} />
                                    </div>
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-orange-500 p-0.5">
                                                <div className="h-full w-full rounded-full bg-[#0a0f1a] flex items-center justify-center text-[8px] font-black uppercase italic">
                                                    {v.user?.name?.[0]}
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[9px] font-black text-white italic uppercase tracking-widest">{v.user?.name}</p>
                                                <p className="text-[8px] text-white/20 uppercase font-black italic">Integrity: {v.user?.integrityScore}%</p>
                                            </div>
                                        </div>

                                        <h4 className="text-xl font-black italic uppercase text-white mb-2">{v.goal?.title}</h4>
                                        <p className="text-[10px] text-white/20 mb-8 italic font-medium uppercase tracking-tighter line-clamp-2">{v.goal?.description}</p>
                                        
                                        <div className="flex items-center justify-between mb-8">
                                            <div className="text-left">
                                                <p className="text-[8px] font-black uppercase text-white/10 italic">Stake</p>
                                                <p className="text-sm font-black italic text-blue-500">₦{(v.amount / 100).toLocaleString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] font-black uppercase text-white/10 italic">Frequency</p>
                                                <p className="text-sm font-black italic text-white uppercase">{v.goal?.frequency_type}</p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleRequestWitness(v._id, user._id)}
                                            className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white hover:text-black transition-all font-black text-[9px] uppercase tracking-widest italic"
                                        >
                                            Apply as Witness
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </motion.div>
            ) : (
                <motion.div 
                    key="wallet"
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-12"
                >
                    <div className="lg:col-span-5 space-y-10">
                        <div className="p-12 rounded-[4rem] bg-[#0a0f1a] border border-white/5 relative overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,0.6)]">
                            <div className="absolute top-0 right-0 p-12 text-blue-600/5 -z-0">
                                <Wallet size={240} strokeWidth={1} />
                            </div>
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-12 italic">Liquid Capital Position</p>
                                <h3 className="text-6xl font-black italic tracking-tighter mb-4 text-white">₦{(user?.balance / 100)?.toLocaleString()}</h3>
                                <p className="text-xs text-white/30 font-medium italic uppercase tracking-widest mb-16 italic font-black">Available for behavioral staking</p>
                                
                                <div className="flex flex-col gap-4">
                                    <button 
                                        onClick={() => setIsFunding(true)}
                                        className="w-full py-6 rounded-3xl bg-blue-600 text-white font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-blue-900/40 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 italic"
                                    >
                                        <Plus size={18} /> Inject Capital
                                    </button>
                                    <button 
                                        onClick={() => setIsWithdrawing(true)}
                                        className="w-full py-6 rounded-3xl bg-white/5 border border-white/10 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-white/10 active:scale-95 transition-all italic"
                                    >
                                        Extract Funds
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-[3rem] bg-white/[0.01] border border-dashed border-white/10">
                             <div className="flex items-start gap-4">
                                 <AlertCircle className="text-yellow-500 mt-1" size={20} />
                                 <div className="text-left">
                                     <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-2 italic">Operating Procedure</p>
                                     <p className="text-xs text-white/20 leading-relaxed font-medium italic uppercase tracking-tighter">
                                         Funds requested for withdrawal are processed within 24-48 hours. Capital currently staked in active protocols is locked and untransferable.
                                     </p>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <div className="lg:col-span-7">
                         <div className="p-12 rounded-[4rem] bg-[#0a0f1a]/40 border border-white/5 backdrop-blur-3xl shadow-2xl h-full relative overflow-hidden">
                            <div className="flex items-center justify-between mb-16">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/40 border border-white/5 shadow-xl">
                                        <History size={20} />
                                    </div>
                                    <h4 className="text-2xl font-black italic uppercase tracking-tight">Ledger Logs</h4>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-white/10 italic">Secure Synchronized History</span>
                            </div>

                            <div className="space-y-4">
                                {(transactions as any[]).length === 0 ? (
                                    <div className="py-24 text-center">
                                        <p className="text-sm text-white/10 italic font-black uppercase tracking-widest italic">No transaction history detected</p>
                                    </div>
                                ) : (
                                    (transactions as any[]).map((tx: any) => (
                                        <div key={tx._id} className="p-8 rounded-[2.5rem] bg-[#050810]/40 border border-white/5 flex items-center justify-between hover:bg-white/[0.03] transition-all group shadow-xl">
                                            <div className="flex items-center gap-6">
                                                <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shadow-2xl ${tx.amount > 0 ? 'bg-green-500/10 text-green-500 shadow-green-900/10' : 'bg-red-500/10 text-red-500 shadow-red-900/10'}`}>
                                                    {tx.amount > 0 ? <ArrowDownLeft size={24} /> : <ArrowUpRight size={24} />}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-black text-white italic uppercase tracking-tight">{tx.description || tx.type}</p>
                                                    <p className="text-[10px] text-white/20 mt-1 uppercase font-black italic tracking-widest">{new Date(tx._creationTime).toLocaleDateString()} • {tx.status}</p>
                                                </div>
                                            </div>
                                            <span className={`text-xl font-black italic ${tx.amount > 0 ? 'text-green-500' : 'text-white'}`}>
                                                {tx.amount > 0 ? '+' : ''}₦{(tx.amount / 100).toLocaleString()}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                         </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {isCreating && (
          <CreateVaultModal onClose={() => setIsCreating(false)} />
        )}
        {isFunding && (
          <FundWalletModal user={user} onClose={() => setIsFunding(false)} />
        )}
        {isWithdrawing && (
          <WithdrawModal user={user} onClose={() => setIsWithdrawing(false)} />
        )}
        {checkingInGoal && (
          <CheckInModal vault={checkingInGoal} onClose={() => setCheckingInGoal(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function VaultCard({ vault, onCheckIn }: { vault: any, onCheckIn: () => void }) {
  const isFailed = vault.status === 'failed';
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    if (isFailed) return;
    
    const interval = setInterval(() => {
        const now = Date.now();
        const end = vault.endDate;
        const diff = end - now;

        if (diff <= 0) {
            setTimeLeft('PROTOCOL EXPIRED');
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        
        setTimeLeft(`${days}D ${hours}H ${minutes}M REMAINING`);
    }, 1000);

    return () => clearInterval(interval);
  }, [vault.endDate, isFailed]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        x: isFailed ? [0, -2, 2, -2, 2, 0] : 0,
      }}
      transition={{ 
        duration: isFailed ? 0.4 : 0.5,
        x: isFailed ? { repeat: Infinity, repeatType: "mirror", duration: 0.1 } : undefined
      }}
      className={`group relative rounded-[3.5rem] border transition-all text-left shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden ${
        isFailed 
          ? 'border-red-500/30 bg-red-950/10' 
          : 'border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl hover:bg-[#0a0f1a] hover:border-blue-500/20'
      }`}
    >
      {isFailed && (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.1, 0.05, 0.2, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-red-600 pointer-events-none z-0"
        />
      )}

      <div className="absolute -right-4 -top-4 text-white/[0.01] transition-transform group-hover:scale-110">
        <Target size={180} strokeWidth={1} />
      </div>

      <div className="relative z-10 text-left p-12">
        <div className="flex items-center justify-between mb-10 text-left font-black">
          <div className={`px-4 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest italic shadow-xl ${
            isFailed 
                ? 'bg-red-500 text-white border-red-400 animate-pulse' 
                : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
          }`}>
            {isFailed ? 'Protocol Breach' : 'Active Mandate'}
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest italic ${isFailed ? 'text-red-500/40' : 'text-white/10'}`}>Ref: {vault._id.slice(0,6)}</span>
        </div>

        <h3 className={`text-3xl font-black mb-3 italic tracking-tight uppercase leading-tight ${isFailed ? 'text-red-500' : 'text-white'}`}>
            {vault.goal.title}
        </h3>
        
        {!isFailed && (
            <div className="flex items-center gap-2 mb-6">
                <Clock size={12} className="text-[#ff7a00]" />
                <p className="text-[10px] font-black text-[#ff7a00] uppercase tracking-widest italic">{timeLeft}</p>
            </div>
        )}

        <p className={`text-sm mb-12 line-clamp-2 italic font-medium leading-relaxed uppercase tracking-tighter ${isFailed ? 'text-red-500/40' : 'text-white/30'}`}>
            {vault.goal.description}
        </p>

        <div className="grid grid-cols-2 gap-6 mb-12 text-left font-black italic">
          <div className={`p-6 rounded-[2rem] border text-left transition-colors shadow-inner ${isFailed ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/5 group-hover:border-blue-500/20'}`}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-2 italic">Principal</p>
            <p className={`text-xl font-black italic tracking-tighter uppercase leading-none ${isFailed ? 'text-red-500 line-through' : 'text-white'}`}>
                ₦{(vault.amount / 100).toLocaleString()}
            </p>
          </div>
          <div className={`p-6 rounded-[2rem] border text-left transition-colors shadow-inner ${isFailed ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/5 group-hover:border-[#ff7a00]/20'}`}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-2 italic">Pain Tier</p>
            <p className={`text-xl font-black italic tracking-tighter uppercase leading-none ${isFailed ? 'text-red-500' : 'text-[#ff7a00]'}`}>
                {vault.painTier || 'Serious'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 font-black uppercase tracking-widest text-[10px] italic">
            {isFailed ? (
                <div className="w-full py-6 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center gap-3 shadow-xl font-black">
                    <AlertCircle size={18} /> Forfeiture Processed
                </div>
            ) : (
                <button 
                    onClick={onCheckIn}
                    className="w-full py-6 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 bg-white text-black hover:scale-[1.02] shadow-white/5"
                >
                    <Camera size={18} /> Execute Log
                </button>
            )}
            <Link 
                to="/vault/$id"
                params={{ id: vault._id }}
                className={`w-full py-6 rounded-2xl border transition-all text-center ${isFailed ? 'border-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/5' : 'border-white/5 text-white/20 hover:text-white hover:bg-white/5'}`}
            >
                Specification
            </Link>
        </div>
      </div>
    </motion.div>
  );
}

function CreateVaultModal({ onClose }: { onClose: () => void }) {
    const createVault = useMutation(api.goals.create);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('50000');
    const [painTier, setPainTier] = useState<'deterrence' | 'enforcement' | 'liquidation'>('deterrence');
    const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [targetCount, setTargetCount] = useState('1');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createVault({
                title,
                description: `Automatic protocol for ${title}. Adherence is strictly monitored.`,
                stakedAmount: parseInt(amount) * 100, // NGN in Kobo
                category: 'habit',
                frequency_type: frequency,
                target_count: parseInt(targetCount),
                duration_weeks: 4, 
                painTier: painTier
            });
            onClose();
        } catch (err: any) {
            alert(err.message || "Failed to initialize protocol.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/95 backdrop-blur-3xl p-6"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-2xl bg-[#0a0f1a] border border-white/10 rounded-[3.5rem] overflow-y-auto max-h-[90vh] shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
                <form onSubmit={handleSubmit} className="p-12 text-left">
                    <div className="flex items-center justify-between mb-12 text-left">
                        <div className="flex items-center gap-4 text-left">
                            <div className="h-12 w-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center italic font-black border border-blue-500/20 shadow-xl">P</div>
                            <h2 className="text-2xl font-black tracking-tight uppercase italic text-white leading-none">New Protocol</h2>
                        </div>
                        <button type="button" onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:text-white transition-colors active:scale-90"><X size={20} /></button>
                    </div>

                    <div className="space-y-8 text-left font-bold italic">
                        <div className="text-left">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">Mandate Name</label>
                            <input 
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. 5AM DEEP WORK"
                                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-blue-500 transition-all font-bold italic uppercase tracking-widest text-sm text-white"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="text-left">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">Staked Principal (NGN)</label>
                                <div className="relative text-left">
                                    <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-white/20 italic">₦</span>
                                    <input 
                                        type="number"
                                        required
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-6 py-5 outline-none focus:border-blue-500 transition-all font-bold italic text-white text-xl"
                                    />
                                </div>
                            </div>
                            <div className="text-left">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">Frequency</label>
                                <select 
                                    value={frequency}
                                    onChange={(e: any) => setFrequency(e.target.value)}
                                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-blue-500 transition-all font-bold italic uppercase tracking-widest text-sm text-white appearance-none cursor-pointer"
                                >
                                    <option value="daily" className="bg-[#0a0f1a]">Daily Log</option>
                                    <option value="weekly" className="bg-[#0a0f1a]">Weekly Target</option>
                                    <option value="monthly" className="bg-[#0a0f1a]">Monthly Target</option>
                                </select>
                            </div>
                        </div>

                        {frequency !== 'daily' && (
                            <div className="text-left">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">Target Count ({frequency === 'weekly' ? 'per week' : 'per month'})</label>
                                <input 
                                    type="number"
                                    min="1"
                                    max={frequency === 'weekly' ? "7" : "31"}
                                    required
                                    value={targetCount}
                                    onChange={(e) => setTargetCount(e.target.value)}
                                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-blue-500 transition-all font-bold italic text-white text-xl"
                                />
                            </div>
                        )}

                        <div className="text-left font-black uppercase italic tracking-widest text-[10px]">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block">Pain Specification</label>
                            <div className="grid grid-cols-3 gap-3 text-left">
                                <button 
                                    type="button"
                                    onClick={() => setPainTier('deterrence')}
                                    className={`p-5 rounded-[1.5rem] border transition-all text-left group ${painTier === 'deterrence' ? 'bg-blue-600/10 border-blue-500 text-blue-500 shadow-xl' : 'bg-white/[0.01] border-white/5 text-white/20 hover:text-white'}`}
                                >
                                    <p className="font-black italic mb-1 uppercase tracking-widest">Deterrence</p>
                                    <p className="text-[8px] opacity-40 lowercase italic font-medium leading-none">2% penalty</p>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPainTier('enforcement')}
                                    className={`p-5 rounded-[1.5rem] border transition-all text-left group ${painTier === 'enforcement' ? 'bg-[#ff7a00]/10 border-[#ff7a00] text-[#ff7a00] shadow-xl' : 'bg-white/[0.01] border-white/5 text-white/20 hover:text-white'}`}
                                >
                                    <p className="font-black italic mb-1 uppercase tracking-widest">Enforce</p>
                                    <p className="text-[8px] opacity-40 lowercase italic font-medium leading-none">5% penalty</p>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPainTier('liquidation')}
                                    className={`p-5 rounded-[1.5rem] border transition-all text-left group ${painTier === 'liquidation' ? 'bg-red-600/10 border-red-500 text-red-500 shadow-xl' : 'bg-white/[0.01] border-white/5 text-white/20 hover:text-white'}`}
                                >
                                    <p className="font-black italic mb-1 uppercase tracking-widest">Liquidate</p>
                                    <p className="text-[8px] opacity-40 lowercase italic font-medium leading-none">10% penalty</p>
                                </button>
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full mt-12 py-6 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all shadow-white/5 italic"
                    >
                        {loading ? 'Initializing...' : 'Initialize Mandate'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

function CheckInModal({ vault, onClose }: { vault: any, onClose: () => void }) {
    const generateUploadUrl = useMutation(api.goals.generateUploadUrl);
    const checkIn = useMutation(api.goals.checkIn);
    const [note, setNote] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        setLoading(true);
        try {
            let proofImageId = undefined;
            if (selectedFile) {
                const postUrl = await generateUploadUrl();
                const result = await fetch(postUrl, {
                    method: "POST",
                    headers: { "Content-Type": selectedFile.type },
                    body: selectedFile,
                });
                const { storageId } = await result.json();
                proofImageId = storageId;
            }
            await checkIn({
                goalId: vault.goal._id,
                week_number: 1, 
                note: note,
                proofImageId: proofImageId as any
            });
            onClose();
        } catch (err) {
            console.error(err);
            alert("Log Transmission Failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/95 backdrop-blur-3xl p-6"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-xl bg-[#0a0f1a] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
                <form onSubmit={handleSubmit} className="p-12 text-left font-black italic uppercase">
                    <div className="flex items-center justify-between mb-12 text-left">
                        <div className="flex items-center gap-4 text-left">
                            <div className="h-12 w-12 rounded-2xl bg-[#ff7a00]/10 text-[#ff7a00] flex items-center justify-center italic font-black border border-[#ff7a00]/20 shadow-xl">C</div>
                            <h2 className="text-2xl font-black tracking-tight uppercase italic text-white leading-none">Execute Log</h2>
                        </div>
                        <button type="button" onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:text-white transition-colors active:scale-90"><X size={20} /></button>
                    </div>

                    <div className="p-6 rounded-[2rem] bg-blue-600/10 border border-blue-500/20 mb-10 flex items-start gap-4 text-left shadow-inner">
                        <AlertCircle className="text-blue-500 mt-1" size={20} />
                        <p className="text-xs text-blue-500 leading-relaxed font-bold italic tracking-tight uppercase">Evidence must be verifiable. False logs result in permanent integrity score reduction.</p>
                    </div>

                    <div className="space-y-8 text-left font-bold italic">
                        <div className="text-left">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">Evidence Specification</label>
                            <textarea 
                                required
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Describe execution protocol adherence..."
                                className="w-full h-32 bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-blue-500 transition-all font-bold italic uppercase tracking-widest text-sm text-white resize-none"
                            />
                        </div>

                        <div className="flex flex-col gap-4 text-center">
                            <label className="w-full p-12 rounded-[2.5rem] border border-dashed border-white/10 bg-white/[0.01] text-center group hover:bg-white/[0.03] transition-all cursor-pointer">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                                <Camera size={40} className={`mx-auto mb-6 transition-transform ${selectedFile ? 'text-blue-500 scale-110' : 'text-white/10 group-hover:scale-110'}`} />
                                <p className={`text-[10px] font-black uppercase tracking-widest italic ${selectedFile ? 'text-white' : 'text-white/20'}`}>
                                    {selectedFile ? selectedFile.name : 'Attach Photographic Evidence'}
                                </p>
                            </label>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full mt-12 py-6 rounded-2xl bg-[#ff7a00] text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[#ff7a00]/10 disabled:opacity-50 italic"
                    >
                        {loading ? 'Transmitting...' : 'Confirm Execution'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

function FundWalletModal({ user, onClose }: { user: any, onClose: () => void }) {
    const [amount, setAmount] = useState('5000');
    const initializeDeposit = useMutation(api.payments.initializeDeposit);
    const verifyPayment = useAction(api.payments.verifyPayment);
    const [loading, setLoading] = useState(false);

    const config = {
        reference: (new Date()).getTime().toString(),
        email: user.email,
        amount: parseInt(amount) * 100, // Paystack expects amount in kobo
        publicKey: PAYSTACK_PUBLIC_KEY,
    };

    const initializePayment = usePaystackPayment(config);

    const onSuccess = async (reference: any) => {
        setLoading(true);
        try {
            const result = await verifyPayment({ reference: reference.reference });
            if (result.success) {
                onClose();
            } else {
                alert("Verification Failed: " + result.message);
            }
        } catch (err) {
            console.error(err);
            alert("Verification Error.");
        } finally {
            setLoading(false);
        }
    };

    const onClosePaystack = () => {
        setLoading(false);
    };

    const handleStartPayment = async () => {
        if (!amount || parseInt(amount) < 500) {
            alert("Minimum deposit is ₦500");
            return;
        }
        setLoading(true);
        try {
            await initializeDeposit({ amount: parseInt(amount) });
            initializePayment({onSuccess, onClose: onClosePaystack});
        } catch (err) {
            console.error(err);
            alert("Failed to initialize deposit.");
            setLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/95 backdrop-blur-3xl p-6"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md bg-[#0a0f1a] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
                <div className="p-12 text-left">
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-[#ff7a00]/10 text-[#ff7a00] flex items-center justify-center italic font-black border border-[#ff7a00]/20 shadow-xl">
                                <Wallet size={20} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight uppercase italic text-white leading-none">Fund Wallet</h2>
                        </div>
                        <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:text-white transition-colors active:scale-90"><X size={20} /></button>
                    </div>

                    <p className="text-white/30 text-xs font-bold italic uppercase tracking-widest mb-10 leading-relaxed">
                        Inject capital into your behavioral bank account. This capital is used to stake against your mandates.
                    </p>

                    <div className="space-y-8">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">Amount (NGN)</label>
                            <div className="relative">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-white/20 italic">₦</span>
                                <input 
                                    type="number"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-blue-500 transition-all font-bold italic text-white text-xl"
                                />
                            </div>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-blue-600/10 border border-blue-500/20 flex items-start gap-4 shadow-inner">
                            <CreditCard className="text-blue-500 mt-1" size={20} />
                            <p className="text-[10px] text-blue-500 leading-relaxed font-bold italic tracking-tight uppercase">
                                Secured via Paystack. Funds are instantly available for protocol staking.
                            </p>
                        </div>
                    </div>

                    <button 
                        onClick={handleStartPayment}
                        disabled={loading}
                        className="w-full mt-12 py-6 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all shadow-white/5 disabled:opacity-50 italic"
                    >
                        {loading ? 'Processing...' : 'Authorize Deposit'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function WithdrawModal({ user, onClose }: { user: any, onClose: () => void }) {
    const [amount, setAmount] = useState('5000');
    const [accountNumber, setAccountNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [loading, setLoading] = useState(false);
    const requestWithdrawal = useMutation(api.payments.requestWithdrawal);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        if (parseInt(amount) * 100 > user.balance) {
            alert("Insufficient balance.");
            return;
        }
        setLoading(true);
        try {
            const res = await requestWithdrawal({
                amount: parseInt(amount) * 100,
                accountNumber,
                bankCode: '000', 
                bankName,
                accountName: user.name || 'Account Holder'
            });
            alert(res.message);
            onClose();
        } catch (err) {
            console.error(err);
            alert("Extraction Failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/95 backdrop-blur-3xl p-6"
        >
            <motion.div 
                initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
                className="w-full max-w-md bg-[#0a0f1a] border border-white/10 rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
            >
                <form onSubmit={handleSubmit} className="p-12 text-left">
                    <div className="flex items-center justify-between mb-12">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-white/5 text-white flex items-center justify-center italic font-black border border-white/10 shadow-xl">
                                <ArrowUpRight size={20} />
                            </div>
                            <h2 className="text-2xl font-black tracking-tight uppercase italic text-white leading-none">Extract Capital</h2>
                        </div>
                        <button type="button" onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:text-white transition-colors active:scale-90"><X size={20} /></button>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">Extraction Amount (NGN)</label>
                            <input 
                                type="number"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 transition-all font-bold italic text-white text-xl"
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">Destination Bank</label>
                                <div className="relative">
                                    <Building2 className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                    <input 
                                        required
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        placeholder="e.g. Zenith Bank"
                                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-blue-500 transition-all font-bold italic text-white uppercase text-xs"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">Account Number</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                                    <input 
                                        required
                                        value={accountNumber}
                                        onChange={(e) => setAccountNumber(e.target.value)}
                                        placeholder="0123456789"
                                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-blue-500 transition-all font-bold italic text-white uppercase text-xs"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-start gap-4">
                            <User className="text-white/20 mt-1" size={18} />
                            <p className="text-[10px] text-white/40 leading-relaxed font-bold italic tracking-tight uppercase">
                                Funds will be sent to the legal name: <span className="text-white font-black">{user.name}</span>.
                            </p>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full mt-12 py-6 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-98 transition-all shadow-white/5 disabled:opacity-50 italic"
                    >
                        {loading ? 'Processing...' : 'Authorize Extraction'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}
