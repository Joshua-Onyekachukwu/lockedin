import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Bell, 
  Target, 
  ShieldCheck, 
  Plus, 
  Wallet,
  X,
  Camera,
  AlertCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Route = createFileRoute('/dashboard')({
  component: Dashboard,
});

function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.current, {}) as any);
  
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

  if (!user.bvn_verified) {
     navigate({ to: '/verify-bvn' });
     return null;
  }

  return <DashboardContent userId={user._id} user={user} />;
}

function DashboardContent({ userId, user }: { userId: any, user: any }) {
  const { data: vaults } = useSuspenseQuery(convexQuery(api.goals.listByUser, { userId }) as any);
  const { data: pendingVerifications } = useSuspenseQuery(convexQuery(api.verifications.getPendingVerifications, { userId }) as any);
  const { data: notifications } = useSuspenseQuery(convexQuery((api as any).notifications.list, { userId }) as any);
  
  const [isCreating, setIsCreating] = useState(false);
  const [checkingInGoal, setCheckingInGoal] = useState<any>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const verifyLog = useMutation(api.verifications.verifyLog);
  const markRead = useMutation((api as any).notifications.markRead);

  const handleVerify = async (logId: any, status: 'approved' | 'rejected') => {
      await verifyLog({ logId, verifierId: userId, status });
  };

  const unreadCount = (notifications as any[])?.filter?.((n: any) => !n.read).length || 0;

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <div className="relative group text-left">
            <div className="absolute inset-0 bg-blue-600 blur-md opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold shadow-lg shadow-blue-900/40 transition-transform group-hover:scale-105 active:scale-95 text-white uppercase italic">L</div>
          </div>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-tight text-lg leading-none text-white">Lockedin</span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">Operating Protocol</span>
          </div>
        </div>
        
        <div className="flex items-center gap-8 text-left font-bold">
          <div className="hidden sm:flex items-center gap-6 text-sm font-black uppercase tracking-widest text-white/40">
            <Link to="/community" className="hover:text-white cursor-pointer transition-colors active:scale-95">Community</Link>
            <span className="hover:text-white cursor-pointer transition-colors active:scale-95 opacity-20">Stakes</span>
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

          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 shadow-inner">
            <Wallet size={16} className="text-[#ff7a00]" />
            <span className="text-sm font-bold tracking-tight text-white italic">₦{(user?.balance / 100)?.toLocaleString()}</span>
          </div>

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

      {/* Notifications Slide-over */}
      <AnimatePresence>
        {showNotifications && (
            <motion.div 
                initial={{ x: 400 }} animate={{ x: 0 }} exit={{ x: 400 }}
                className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#0a0f1a] border-l border-white/10 z-50 shadow-[0_0_80px_rgba(0,0,0,1)] p-8 overflow-y-auto backdrop-blur-3xl"
            >
                <div className="flex items-center justify-between mb-10 text-left">
                    <h3 className="font-bold text-xl text-left text-white font-black uppercase tracking-widest">Protocol Logs</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-white/20 hover:text-white transition-colors active:scale-95"><X size={24} /></button>
                </div>

                <div className="space-y-4 text-left">
                    {(notifications as any[]).length === 0 ? (
                        <div className="text-center mt-20">
                            <Bell className="mx-auto text-white/5 mb-4 opacity-10" size={60} />
                            <p className="text-sm text-white/20 italic font-medium">System logs are currently clear.</p>
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
                                        <p className="font-bold text-sm text-white italic">{n.title}</p>
                                        <p className="text-xs text-white/30 mt-1 leading-relaxed font-medium italic">{n.message}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto p-6 lg:p-12 text-left relative z-10">
        <header className="mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8 text-left">
          <div className="text-left">
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl text-left text-white leading-tight font-black italic uppercase">
              Operational <span className="text-blue-500 text-left">Intelligence.</span>
            </h1>
            <p className="text-white/30 mt-6 text-lg max-w-2xl leading-relaxed text-left font-medium italic">
                Welcome back, {user.name}. Your current Integrity Score is <span className="text-white font-black italic">{user.integrityScore || 100}%</span>. Protocol adherence is mandatory.
            </p>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="group relative px-8 py-5 rounded-[2rem] bg-white text-black font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 overflow-hidden shadow-white/10"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Plus size={20} /> Initiate Protocol
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 text-left">
          {(vaults as any[]).map((vault: any) => (
            <VaultCard key={vault._id} vault={vault} onCheckIn={() => setCheckingInGoal(vault)} />
          ))}
          
          {(vaults as any[]).length === 0 && (
            <div className="col-span-full py-32 rounded-[3.5rem] border border-dashed border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center group hover:bg-white/[0.02] transition-colors">
                <Target size={60} className="text-white/5 mb-8 group-hover:scale-110 transition-transform opacity-10" />
                <p className="text-white/20 font-black uppercase tracking-[0.3em] text-xs italic">No Active Protocols Detected</p>
                <button onClick={() => setIsCreating(true)} className="mt-8 text-blue-500 font-bold hover:underline active:scale-95 transition-transform uppercase tracking-widest text-[10px]">Begin Onboarding</button>
            </div>
          )}
        </div>

        {(pendingVerifications as any[]).length > 0 && (
            <section className="mb-20 text-left">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/10 mb-10 flex items-center gap-6 text-left font-black italic">
                    <div className="h-px flex-1 bg-white/5 text-left" />
                    Witness Authorization Required
                    <div className="h-px flex-1 bg-white/5 text-left" />
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left font-bold">
                    {(pendingVerifications as any[]).map((log: any) => (
                        <div key={log._id} className="p-8 rounded-[2.5rem] border border-white/10 bg-white/[0.02] flex items-center justify-between group hover:border-blue-500/30 transition-all text-left shadow-2xl">
                            <div className="flex items-center gap-6 text-left">
                                <div className="h-14 w-14 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 shadow-xl shadow-blue-900/10 group-hover:scale-110 transition-transform">
                                    <ShieldCheck size={28} />
                                </div>
                                <div className="text-left font-bold">
                                    <p className="font-black text-white uppercase italic tracking-tight">{log.goalTitle}</p>
                                    <p className="text-xs text-white/30 mt-1 italic font-medium uppercase tracking-widest">Awaiting Verification</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 text-left font-black">
                                <button 
                                    onClick={() => handleVerify(log._id, 'rejected')}
                                    className="p-4 rounded-2xl bg-white/5 text-white/20 hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-90 shadow-xl"
                                >
                                    <X size={20} />
                                </button>
                                <button 
                                    onClick={() => handleVerify(log._id, 'approved')}
                                    className="p-4 rounded-2xl bg-blue-600 text-white hover:bg-blue-700 transition-all active:scale-90 shadow-lg shadow-blue-900/20"
                                >
                                    <CheckCircle size={20} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )}
      </main>

      <AnimatePresence>
        {isCreating && (
          <CreateVaultModal userId={userId} onClose={() => setIsCreating(false)} />
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
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        // High-intensity breach animation if failed
        x: isFailed ? [0, -2, 2, -2, 2, 0] : 0,
      }}
      transition={{ 
        duration: isFailed ? 0.4 : 0.5,
        x: isFailed ? { repeat: Infinity, repeatType: "mirror", duration: 0.1 } : undefined
      }}
      className={`group relative rounded-[3rem] border transition-all text-left shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden ${
        isFailed 
          ? 'border-red-500/30 bg-red-950/10' 
          : 'border-white/10 bg-[#0a0f1a]/50 hover:bg-[#0a0f1a]'
      }`}
    >
      {/* Glitch Overlay for Breach */}
      {isFailed && (
        <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: [0, 0.1, 0.05, 0.2, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute inset-0 bg-red-600 pointer-events-none z-0"
        />
      )}

      <div className="absolute -right-4 -top-4 text-white/[0.01] transition-transform group-hover:scale-110">
        <Target size={160} strokeWidth={1} />
      </div>

      <div className="relative z-10 text-left p-10">
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

        <h3 className={`text-2xl font-black mb-3 italic tracking-tight uppercase leading-tight ${isFailed ? 'text-red-500' : 'text-white'}`}>
            {vault.goal.title}
        </h3>
        <p className={`text-sm mb-10 line-clamp-2 italic font-medium leading-relaxed uppercase tracking-tighter ${isFailed ? 'text-red-500/40' : 'text-white/30'}`}>
            {vault.goal.description}
        </p>

        <div className="grid grid-cols-2 gap-6 mb-10 text-left font-black italic">
          <div className={`p-5 rounded-[1.5rem] border text-left transition-colors shadow-inner ${isFailed ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/5 group-hover:border-blue-500/20'}`}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Principal</p>
            <p className={`text-lg font-black italic tracking-tighter uppercase leading-none ${isFailed ? 'text-red-500 line-through' : 'text-white'}`}>
                ₦{(vault.amount / 100).toLocaleString()}
            </p>
          </div>
          <div className={`p-5 rounded-[1.5rem] border text-left transition-colors shadow-inner ${isFailed ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.02] border-white/5 group-hover:border-[#ff7a00]/20'}`}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20 mb-2">Pain Tier</p>
            <p className={`text-lg font-black italic tracking-tighter uppercase leading-none ${isFailed ? 'text-red-500' : 'text-[#ff7a00]'}`}>
                {vault.painTier || 'Serious'}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 font-black uppercase tracking-widest text-[10px] italic">
            {isFailed ? (
                <div className="w-full py-5 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-500 flex items-center justify-center gap-3 shadow-xl font-black">
                    <AlertCircle size={18} /> Forfeiture Processed
                </div>
            ) : (
                <button 
                    onClick={onCheckIn}
                    className="w-full py-5 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95 bg-white text-black hover:scale-[1.02] shadow-white/5"
                >
                    <Camera size={18} /> Execute Log
                </button>
            )}
            <Link 
                to="/vault/$id"
                params={{ id: vault._id }}
                className={`w-full py-5 rounded-2xl border transition-all text-center ${isFailed ? 'border-red-500/10 text-red-500/40 hover:text-red-500 hover:bg-red-500/5' : 'border-white/5 text-white/20 hover:text-white hover:bg-white/5'}`}
            >
                Specification
            </Link>
        </div>
      </div>
    </motion.div>
  );
}

function CreateVaultModal({ userId, onClose }: { userId: any, onClose: () => void }) {
    const createVault = useMutation(api.goals.create);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('50000');
    const [painTier, setPainTier] = useState<'serious' | 'lockedin'>('serious');

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        await createVault({
            userId,
            title,
            description: `Automatic protocol for ${title}. Adherence is strictly monitored.`,
            stakedAmount: parseInt(amount) * 100, // NGN in Kobo
            category: 'habit',
            checkin_day: 'daily',
            duration_weeks: 4, // Default duration
            painTier: painTier as any
        });
        onClose();
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
                                className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 transition-all font-bold italic uppercase tracking-widest text-sm text-white"
                            />
                        </div>

                        <div className="text-left">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">Staked Principal (NGN)</label>
                            <div className="relative text-left">
                                <span className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-white/20">₦</span>
                                <input 
                                    type="number"
                                    required
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl pl-12 pr-6 py-4 outline-none focus:border-blue-500 transition-all font-bold italic text-white"
                                />
                            </div>
                        </div>

                        <div className="text-left font-black uppercase italic tracking-widest text-[10px]">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block">Pain Specification</label>
                            <div className="grid grid-cols-2 gap-4 text-left">
                                <button 
                                    type="button"
                                    onClick={() => setPainTier('serious')}
                                    className={`p-5 rounded-[1.5rem] border transition-all text-left group ${painTier === 'serious' ? 'bg-blue-600/10 border-blue-500 text-blue-500 shadow-xl' : 'bg-white/[0.01] border-white/5 text-white/20 hover:text-white'}`}
                                >
                                    <p className="font-black italic mb-1 uppercase tracking-widest">Serious</p>
                                    <p className="text-[9px] opacity-40 lowercase italic font-medium leading-none">2% daily penalty</p>
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => setPainTier('lockedin')}
                                    className={`p-5 rounded-[1.5rem] border transition-all text-left group ${painTier === 'lockedin' ? 'bg-[#ff7a00]/10 border-[#ff7a00] text-[#ff7a00] shadow-xl' : 'bg-white/[0.01] border-white/5 text-white/20 hover:text-white'}`}
                                >
                                    <p className="font-black italic mb-1 uppercase tracking-widest">Locked In</p>
                                    <p className="text-[9px] opacity-40 lowercase italic font-medium leading-none">5% daily penalty</p>
                                </button>
                            </div>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        className="w-full mt-12 py-5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all shadow-white/5"
                    >
                        Initialize Mandate
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
                // 1. Get upload URL
                const postUrl = await generateUploadUrl();
                // 2. POST the file
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
                week_number: 1, // Current week logic
                note: note,
                proofImageId: proofImageId as any
            });
            onClose();
            alert("Protocol Adherence Logged & Evidence Secured.");
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
                        <p className="text-xs text-blue-500 leading-relaxed font-bold italic tracking-tight uppercase">Evidence must be timestamped and verifiable. False logs will result in permanent integrity score reduction.</p>
                    </div>

                    <div className="space-y-8 text-left font-bold italic">
                        <div className="text-left">
                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">Evidence Protocol</label>
                            <textarea 
                                required
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Describe execution in detail..."
                                className="w-full h-32 bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-blue-500 transition-all font-bold italic uppercase tracking-widest text-sm text-white resize-none"
                            />
                        </div>

                        <div className="flex flex-col gap-4 text-center">
                            <label className="w-full p-10 rounded-[2rem] border border-dashed border-white/10 bg-white/[0.01] text-center group hover:bg-white/[0.03] transition-all cursor-pointer">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    className="hidden" 
                                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                />
                                <Camera size={32} className={`mx-auto mb-4 transition-transform ${selectedFile ? 'text-blue-500 scale-110' : 'text-white/20 group-hover:scale-110'}`} />
                                <p className={`text-[9px] font-black uppercase tracking-widest italic ${selectedFile ? 'text-white' : 'text-white/20'}`}>
                                    {selectedFile ? selectedFile.name : 'Attach Photographic Evidence'}
                                </p>
                            </label>
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={loading}
                        className="w-full mt-12 py-5 rounded-2xl bg-[#ff7a00] text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[#ff7a00]/10 disabled:opacity-50"
                    >
                        {loading ? 'Transmitting...' : 'Confirm Execution'}
                    </button>
                </form>
            </motion.div>
        </motion.div>
    );
}

const CheckCircle = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
