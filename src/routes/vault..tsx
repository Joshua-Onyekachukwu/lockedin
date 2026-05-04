import { createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import { 
  ShieldCheck, 
  Clock, 
  ArrowLeft, 
  Share2, 
  UserPlus, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Camera,
  History
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

export const Route = createFileRoute('/vault/')({
  component: VaultPage,
});

function VaultPage() {
  const { id: vaultId } = Route.useParams();
  const { data: vault }: { data: any } = useSuspenseQuery(convexQuery(api.goals.getFullContext, {
    vaultId: vaultId as any
  }));
  const { data: partners } = useSuspenseQuery(convexQuery(api.partners.getPartners, { vaultId: vaultId as any }) as any);

  const [copySuccess, setCopySuccess] = useState(false);

  if (!vault) return (
    <div className="min-h-screen bg-[#050810] flex items-center justify-center text-white">
        <p className="font-black italic uppercase tracking-widest text-white/20">Protocol specification not found</p>
    </div>
  );

  const handleCopyInvite = () => {
    const inviteUrl = `${window.location.origin}/invite/${vaultId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
        <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left">
            <div className="flex items-center gap-4 text-left">
                <a href="/dashboard" className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90 shadow-xl">
                    <ArrowLeft size={20} />
                </a>
                <div className="flex flex-col text-left">
                    <span className="font-bold tracking-tight text-lg leading-none text-white uppercase italic">Vault Specification</span>
                    <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">Asset Protocol</span>
                </div>
            </div>
            
            <button 
                onClick={handleCopyInvite}
                className={`flex items-center gap-3 px-6 py-2.5 rounded-full transition-all active:scale-95 border ${copySuccess ? 'bg-green-600/10 border-green-500 text-green-500' : 'bg-blue-600 text-white border-blue-500 shadow-xl shadow-blue-900/40 hover:scale-105'}`}
            >
                {copySuccess ? <CheckCircle size={16} /> : <UserPlus size={16} />}
                <span className="text-[10px] font-black uppercase tracking-widest italic">{copySuccess ? 'Link Secured' : 'Invite Witness'}</span>
            </button>
        </nav>

        <main className="max-w-7xl mx-auto p-6 lg:p-12 text-left relative z-10">
            <header className="mb-16 text-left">
                <div className="flex items-center gap-4 mb-8 text-left">
                    <span className={`px-4 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest italic shadow-xl ${vault.status === 'failed' ? 'bg-red-500 text-white border-red-400' : 'bg-blue-600/10 border-blue-500 text-blue-500'}`}>
                        {vault.status === 'failed' ? 'Protocol Breach' : 'Active Mandate'}
                    </span>
                    <span className="text-white/10 uppercase tracking-widest text-[10px] font-black italic">Ref: {vaultId.slice(0, 8)}</span>
                </div>
                <h1 className="text-4xl font-black tracking-tight md:text-5xl lg:text-7xl text-left text-white leading-tight uppercase italic text-balance">
                    {vault.goal?.title}
                </h1>
                <p className="mt-6 text-white/40 text-lg leading-relaxed text-left font-medium max-w-2xl italic">
                    {vault.goal?.description}
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 text-left">
                <div className="lg:col-span-4 space-y-8 text-left">
                    <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-white/[0.02] group-hover:scale-110 transition-transform">
                            <ShieldCheck size={120} strokeWidth={1} />
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left mb-6 italic">Staked Principal</p>
                        <p className={`text-6xl font-black italic tracking-tighter ${vault.status === 'failed' ? 'text-red-500 line-through' : 'text-white'}`}>
                            ₦{(vault.amount / 100).toLocaleString()}
                        </p>
                        <div className={`mt-8 flex items-center gap-3 font-black text-[10px] uppercase tracking-widest italic ${vault.status === 'failed' ? 'text-red-500/40' : 'text-[#ff7a00]'}`}>
                            {vault.status === 'failed' ? <XCircle size={18} /> : <ShieldCheck size={18} />}
                            {vault.status === 'failed' ? 'Capital Forfeited' : 'Escrowed in Protocol'}
                        </div>
                    </div>

                    <div className="p-10 rounded-[3rem] bg-[#0a0f1a] border border-white/5 text-left shadow-2xl relative overflow-hidden group">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left mb-6 italic">Pain Specification</p>
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-[#ff7a00]/10 flex items-center justify-center text-[#ff7a00] border border-[#ff7a00]/20">
                                <AlertCircle size={24} />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-white uppercase italic tracking-tighter">{vault.painTier || 'Serious'}</p>
                                <p className="text-[10px] text-white/20 font-black uppercase tracking-widest italic mt-1">Behavioral Threshold</p>
                            </div>
                        </div>
                        <p className="text-xs text-white/30 mt-8 leading-relaxed font-medium italic">
                            Missed check-ins trigger an immediate principal deduction. Sunday distributions distribute these funds to high performers.
                        </p>
                    </div>

                    {/* Partners List */}
                    <div className="p-10 rounded-[3rem] bg-white/[0.01] border border-dashed border-white/10 text-left">
                        <div className="flex items-center justify-between mb-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 italic">Designated Witnesses</p>
                            <UserPlus size={16} className="text-white/10" />
                        </div>
                        <div className="space-y-4">
                            {partners?.length === 0 ? (
                                <p className="text-xs text-white/20 italic font-medium">No witnesses anchored. Share the link to invite partners.</p>
                            ) : (
                                partners?.map((p: any) => (
                                    <div key={p._id} className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                                        <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black">
                                            {p.user?.name?.[0]}
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-xs font-black truncate italic uppercase">{p.user?.name}</p>
                                            <p className="text-[9px] text-white/20 font-black uppercase tracking-widest">{p.status}</p>
                                        </div>
                                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-8 text-left">
                    <div className="flex items-center justify-between mb-10">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 flex items-center gap-6 text-left font-black italic flex-1">
                            Historical Operational Logs
                            <div className="h-px flex-1 bg-white/5 text-left" />
                        </h3>
                    </div>

                    <div className="space-y-4 text-left">
                        {vault.logs?.length === 0 ? (
                             <div className="p-24 rounded-[4rem] border border-white/5 bg-white/[0.01] text-center shadow-inner group transition-all">
                                <History size={48} className="mx-auto text-white/5 mb-8 opacity-10 group-hover:scale-110 transition-transform" />
                                <p className="text-sm text-white/20 italic font-black uppercase tracking-widest">No behavioral evidence logs detected</p>
                                <button className="mt-8 px-6 py-2.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all">Synchronize System</button>
                             </div>
                        ) : (
                            vault.logs?.map((log: any) => (
                                <div key={log._id} className="group relative p-10 rounded-[3.5rem] border border-white/5 bg-[#0a0f1a]/40 backdrop-blur-3xl flex flex-col md:flex-row gap-10 hover:bg-[#0a0f1a] hover:border-blue-500/20 transition-all text-left shadow-2xl">
                                    {log.proofUrl && (
                                        <div className="w-full md:w-48 h-48 rounded-[2rem] overflow-hidden border border-white/5 shadow-xl shrink-0 group-hover:border-blue-500/30 transition-colors">
                                            <img src={log.proofUrl} className="w-full h-full object-cover" alt="Mandate Evidence" />
                                        </div>
                                    )}
                                    <div className="flex-1 flex flex-col justify-between py-2">
                                        <div className="text-left font-bold text-white">
                                            <div className="flex items-center justify-between mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20">
                                                        <CheckCircle size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-black italic uppercase text-lg tracking-tight">Cycle {log.week_number} Execution</p>
                                                        <p className="text-[10px] text-white/20 uppercase tracking-widest font-black italic">{new Date(log._creationTime).toLocaleDateString()} • Evidence Logged</p>
                                                    </div>
                                                </div>
                                                <span className="px-4 py-1.5 rounded-xl bg-green-600/10 border border-green-500/20 text-green-500 text-[9px] font-black uppercase tracking-widest italic">Protocol Verified</span>
                                            </div>
                                            <p className="text-white/40 text-sm leading-relaxed font-medium italic bg-white/[0.02] p-6 rounded-3xl border border-white/5">
                                                {log.note || "No specification provided with this log entry."}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="mt-20 p-10 rounded-[3rem] border border-white/5 bg-white/[0.01] flex flex-col md:flex-row items-center justify-between gap-8 italic font-black uppercase tracking-widest text-[10px]">
                        <p className="text-white/20 italic font-black uppercase">System End of Protocol Specification</p>
                        <div className="flex items-center gap-6">
                            <span className="text-white/10 italic font-black uppercase">v1.1.0_LKD</span>
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
  );
}
