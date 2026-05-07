import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useConvexAuth } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  Users, 
  Download, 
  TrendingUp, 
  ShieldCheck,
  MoreVertical,
  Wallet,
  Activity,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const Route = createFileRoute('/admin')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  
  const { data: stats } = useSuspenseQuery(convexQuery(api.admin.getSystemStats, {}));
  const { data: waitlist } = useSuspenseQuery(convexQuery(api.waitlist.list, {}));
  const { data: pendingWithdrawals } = useSuspenseQuery(convexQuery(api.admin.getPendingWithdrawals, {}));
  const { data: breachCandidates } = useSuspenseQuery(convexQuery(api.admin.getBreachCandidates, {}));
  
  const sweep = useMutation(api.admin.triggerMidnightSweep);
  const distribute = useMutation(api.admin.triggerWeeklyDistribution);
  const approveWithdrawal = useMutation(api.admin.approveWithdrawal);
  const enforceBreach = useMutation(api.admin.enforceProtocolBreach);

  const [activeTab, setActiveTab] = useState<'waitlist' | 'withdrawals' | 'breaches'>('withdrawals');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const exportCSV = () => {
    const csv = [
      ['Email', 'Joined At'],
      ...waitlist.map((e: any) => [e.email, new Date(e._creationTime).toLocaleString()])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lockedin-waitlist-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500">
      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <Link to="/dashboard" className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-tight text-lg leading-none text-white uppercase italic">Command Center</span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">Administrative Protocol</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-500 font-black uppercase tracking-widest text-[10px] italic">
                <ShieldCheck size={14} /> Root Access Active
            </div>
            <button className="p-3 rounded-xl bg-white/5 text-white/20 hover:text-white transition-all"><Settings size={20} /></button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-8 relative z-10">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            <div className="rounded-[2.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-8 shadow-2xl group hover:border-blue-500/20 transition-all text-left">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">Protocol Revenue</span>
                    <TrendingUp size={18} className="text-blue-500" />
                </div>
                <p className="text-4xl font-black text-white italic tracking-tighter uppercase">₦{(stats.revenue / 100).toLocaleString()}</p>
                <p className="mt-2 text-[10px] text-green-500 font-black uppercase tracking-widest italic">Captured Liquidity</p>
            </div>

            <div className="rounded-[2.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-8 shadow-2xl group hover:border-[#ff7a00]/20 transition-all text-left">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">Active Stakes</span>
                    <Wallet size={18} className="text-[#ff7a00]" />
                </div>
                <p className="text-4xl font-black text-white italic tracking-tighter uppercase">₦{(stats.totalStaked / 100).toLocaleString()}</p>
                <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">{stats.activeVaults} Active Mandates</p>
            </div>

            <div className="rounded-[2.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-8 shadow-2xl group hover:border-blue-500/20 transition-all text-left">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">Total Citizens</span>
                    <Users size={18} className="text-blue-500" />
                </div>
                <p className="text-4xl font-black text-white italic tracking-tighter uppercase">{stats.totalUsers}</p>
                <p className="mt-2 text-[10px] text-blue-500 font-black uppercase tracking-widest italic">Identity Anchored</p>
            </div>

            <div className="rounded-[2.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl p-8 shadow-2xl group hover:border-green-500/20 transition-all text-left">
                <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">System Health</span>
                    <Activity size={18} className="text-green-500" />
                </div>
                <p className="text-4xl font-black text-white italic tracking-tighter uppercase">STABLE</p>
                <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">Crons Executing</p>
            </div>
        </div>

        <div className="flex gap-4 mb-8">
            <button 
                onClick={() => setActiveTab('withdrawals')}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'withdrawals' ? 'bg-white text-black shadow-xl' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
                Extractions ({pendingWithdrawals.length})
            </button>
            <button 
                onClick={() => setActiveTab('breaches')}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'breaches' ? 'bg-white text-black shadow-xl' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
                Breach Monitor
            </button>
            <button 
                onClick={() => setActiveTab('waitlist')}
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'waitlist' ? 'bg-white text-black shadow-xl' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
                Waitlist
            </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 rounded-[2.5rem] border border-white/5 bg-[#0a0f1a] overflow-hidden shadow-2xl">
                <AnimatePresence mode="wait">
                    {activeTab === 'withdrawals' && (
                        <motion.div 
                            key="withdrawals" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        >
                            <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] text-left">
                                <div className="text-left font-black italic uppercase">
                                    <h3 className="text-lg text-white">Extraction Protocol</h3>
                                    <p className="text-[10px] text-white/20 tracking-widest mt-1">Pending Capital Transfers</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto text-left">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 border-b border-white/5">
                                            <th className="px-10 py-6">Citizen</th>
                                            <th className="px-10 py-6">Amount</th>
                                            <th className="px-10 py-6">Bank Specifications</th>
                                            <th className="px-10 py-6 text-right">Mandate</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pendingWithdrawals.length === 0 ? (
                                            <tr><td colSpan={4} className="px-10 py-20 text-center text-white/20 font-black italic uppercase tracking-widest">No pending extractions</td></tr>
                                        ) : (
                                            pendingWithdrawals.map((w: any) => (
                                                <tr key={w._id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                                                    <td className="px-10 py-6">
                                                        <p className="font-bold italic text-white text-sm">{w.user?.name}</p>
                                                        <p className="text-[10px] text-white/20 uppercase font-black">{w.user?.email}</p>
                                                    </td>
                                                    <td className="px-10 py-6 font-black italic text-blue-500 text-lg">₦{(w.amount/100).toLocaleString()}</td>
                                                    <td className="px-10 py-6">
                                                        <p className="text-xs text-white italic font-medium uppercase tracking-tight">{w.bank_details?.bank_name}</p>
                                                        <p className="text-[10px] text-white/40 font-black tracking-widest mt-1">{w.bank_details?.account_number}</p>
                                                    </td>
                                                    <td className="px-10 py-6 text-right">
                                                        <button 
                                                            onClick={() => approveWithdrawal({ withdrawalId: w._id })}
                                                            className="px-5 py-2 rounded-xl bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg hover:scale-105 active:scale-95 transition-all"
                                                        >
                                                            Process Transfer
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'breaches' && (
                        <motion.div 
                            key="breaches" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        >
                            <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] text-left">
                                <div className="text-left font-black italic uppercase">
                                    <h3 className="text-lg text-white">Active Mandate Monitor</h3>
                                    <p className="text-[10px] text-white/20 tracking-widest mt-1">High Risk Candidates</p>
                                </div>
                            </div>
                            <div className="overflow-x-auto text-left">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 border-b border-white/5">
                                            <th className="px-10 py-6">Protocol Identity</th>
                                            <th className="px-10 py-6">Staked Principal</th>
                                            <th className="px-10 py-6">Integrity</th>
                                            <th className="px-10 py-6 text-right">Enforcement</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {breachCandidates.map((b: any) => (
                                            <tr key={b._id} className="border-b border-white/[0.02] hover:bg-white/[0.01] transition-colors">
                                                <td className="px-10 py-6">
                                                    <p className="font-bold italic text-white text-sm uppercase">{b.goal?.title}</p>
                                                    <p className="text-[10px] text-white/20 uppercase font-black italic tracking-widest">{b.user?.name}</p>
                                                </td>
                                                <td className="px-10 py-6 font-black italic text-white text-lg">₦{(b.amount/100).toLocaleString()}</td>
                                                <td className="px-10 py-6">
                                                    <div className="h-1.5 w-24 bg-white/5 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${b.user?.integrityScore || 100}%` }} />
                                                    </div>
                                                    <p className="text-[9px] text-white/20 mt-2 font-black uppercase tracking-widest">{b.user?.integrityScore || 100}% Score</p>
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <button 
                                                        onClick={() => enforceBreach({ vaultId: b._id })}
                                                        className="px-5 py-2 rounded-xl border border-red-500/30 text-red-500 font-black uppercase text-[10px] tracking-widest hover:bg-red-500/10 transition-all active:scale-95"
                                                    >
                                                        Enforce Forfeiture
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'waitlist' && (
                        <motion.div 
                            key="waitlist" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                        >
                            <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] text-left">
                                <div className="text-left font-black italic uppercase">
                                    <h3 className="text-lg text-white">Waitlist Protocol</h3>
                                    <p className="text-[10px] text-white/20 tracking-widest mt-1">Pending Citizens</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button onClick={exportCSV} className="p-3 rounded-xl bg-white/5 text-white/40 hover:text-white transition-all active:scale-95 border border-white/5"><Download size={20} /></button>
                                </div>
                            </div>
                            <div className="overflow-x-auto text-left">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 border-b border-white/5">
                                            <th className="px-10 py-6">Identity</th>
                                            <th className="px-10 py-6">Anchored At</th>
                                            <th className="px-10 py-6 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {waitlist.map((entry: any) => (
                                            <tr key={entry._id} className="group hover:bg-white/[0.01] transition-colors border-b border-white/[0.02]">
                                                <td className="px-10 py-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-10 w-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 italic font-black border border-blue-500/10 shadow-xl text-xs">@</div>
                                                        <span className="font-bold italic text-white text-sm">{entry.email}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-6 text-white/30 text-xs font-black italic uppercase">
                                                    {new Date(entry._creationTime).toLocaleDateString()}
                                                </td>
                                                <td className="px-10 py-6 text-right">
                                                    <button className="p-2 text-white/5 hover:text-white transition-all"><MoreVertical size={18} /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Quick Actions Sidebar */}
            <div className="lg:col-span-4 space-y-8">
                 <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 mb-8 italic">Manual Overrides</p>
                    <div className="space-y-4 font-black uppercase italic tracking-widest text-[10px]">
                        <button 
                            onClick={async () => {
                                try {
                                    await sweep({});
                                    alert("Midnight Sweep Protocol Initialized.");
                                } catch (e) {
                                    alert("Access Denied: You do not have root privileges.");
                                }
                            }}
                            className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-blue-600/20 hover:border-blue-500/30 transition-all text-center active:scale-95"
                        >
                            Trigger Midnight Sweep
                        </button>
                        <button 
                            onClick={async () => {
                                try {
                                    await distribute({});
                                    alert("Weekly Distribution Protocol Initialized.");
                                } catch (e) {
                                    alert("Access Denied: You do not have root privileges.");
                                }
                            }}
                            className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white hover:bg-orange-600/20 hover:border-orange-500/30 transition-all text-center active:scale-95"
                        >
                            Distribute Dividends
                        </button>
                        <button className="w-full py-5 rounded-2xl bg-white/5 border border-white/5 text-white/40 hover:text-white transition-all text-center active:scale-95 border-dashed">System Maintenance Mode</button>
                    </div>
                </div>

                <div className="p-10 rounded-[3rem] bg-[#ff7a00]/5 border border-[#ff7a00]/20 text-left shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 text-[#ff7a00]/5">
                        <TrendingUp size={120} strokeWidth={1} />
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#ff7a00] mb-6 italic">Protocol Tip</p>
                        <p className="text-xs text-[#ff7a00]/60 leading-relaxed font-bold italic tracking-tight uppercase">High protocol breaches detected in 'Fitness' category. Consider adjusting pain tier defaults to increase revenue capture.</p>
                    </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
}
