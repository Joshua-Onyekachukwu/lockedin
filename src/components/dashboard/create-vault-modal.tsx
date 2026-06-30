import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useMutation } from 'convex/react';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../../convex/_generated/api';
import { GOAL_TEMPLATES } from '~/lib/goalTemplates';
import { useToast } from '~/components/toast';
import { toUserMessage } from '~/lib/errors';

const EMPTY_ARGS: Record<string, never> = {};

export default function CreateVaultModal({
  onClose,
  onCreated,
  user,
}: {
  onClose: () => void;
  onCreated: (created: { vaultId: string; title: string; status: 'active' | 'awaiting_funding' }) => void;
  user: any;
}) {
  const createVault = useMutation(api.goals.create);
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<any>('habit');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('50000');
  const [painTier, setPainTier] = useState<'deterrence' | 'enforcement' | 'liquidation'>('deterrence');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [targetCount, setTargetCount] = useState('1');
  const [durationWeeks, setDurationWeeks] = useState('4');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'template' | 'custom'>('template');
  const stakeAmountNaira = Number(amount) || 0;
  const stakeAmountKobo = Math.round(stakeAmountNaira * 100);
  const walletBalanceKobo = Number(user?.balance ?? 0);
  const walletBalanceNaira = walletBalanceKobo / 100;
  const walletCanActivateImmediately =
    stakeAmountKobo > 0 && walletBalanceKobo >= stakeAmountKobo;
  const walletShortfallNaira = Math.max(0, stakeAmountNaira - walletBalanceNaira);

  const selectTemplate = (t: any) => {
    setTitle(t.title);
    setCategory(t.category);
    setDescription(t.description);
    setFrequency(t.frequency_type);
    setTargetCount(t.target_count.toString());
    setAmount(t.suggested_amount.toString());
    setMode('custom');
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      const created = await createVault({
        title,
        description: description || `Automatic protocol for ${title}. Adherence is strictly monitored.`,
        stakedAmount: parseInt(amount) * 100,
        category,
        frequency_type: frequency,
        target_count: parseInt(targetCount),
        duration_weeks: parseInt(durationWeeks),
        painTier: painTier,
      });
      await queryClient.invalidateQueries({
        queryKey: (convexQuery(api.goals.listByUser, EMPTY_ARGS as any) as any).queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: (convexQuery(api.users.current, EMPTY_ARGS as any) as any).queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: (convexQuery((api as any).growth.getActivationStatus, EMPTY_ARGS as any) as any).queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: (convexQuery(api.payments.getWalletOverview, EMPTY_ARGS as any) as any).queryKey,
      });
      if (created.status === 'active') {
        toast.success('Protocol created and activated from wallet balance.', { title: 'Protocol Active' });
      } else {
        toast.success('Protocol created. Funding required to activate.', { title: 'Awaiting Funding' });
      }
      onCreated({ vaultId: created.vaultId, title, status: created.status });
    } catch (err: any) {
      toast.error(toUserMessage(err, 'Failed to create protocol.'), { title: 'Creation Failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#050810]/95 backdrop-blur-3xl p-4 sm:p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-[#0a0f1a] border border-white/10 rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh]"
      >
        <div className="p-6 sm:p-12 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 text-left">
            <div className="h-12 w-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center italic font-black border border-blue-500/20 shadow-xl">
              P
            </div>
            <h2 className="text-2xl font-black tracking-tight uppercase italic text-white leading-none">Initialize Protocol</h2>
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setMode('template')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === 'template' ? 'bg-white text-black' : 'bg-white/5 text-white/40'
              }`}
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                mode === 'custom' ? 'bg-white text-black' : 'bg-white/5 text-white/40'
              }`}
            >
              Custom
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:text-white transition-colors active:scale-90"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto p-6 sm:p-12 flex-1 custom-scrollbar">
          {mode === 'template' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {GOAL_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => selectTemplate(t)}
                  className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-blue-500/20 transition-all text-left group flex flex-col justify-between min-h-[220px]"
                >
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <span className="px-3 py-1 rounded-full bg-blue-600/10 text-blue-500 text-[8px] font-black uppercase tracking-widest italic border border-blue-500/20">
                        {t.category}
                      </span>
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-widest italic">
                        {t.frequency_type}
                      </span>
                    </div>
                    <h3 className="text-xl font-black italic uppercase text-white mb-2">{t.title}</h3>
                    <p className="text-[10px] text-white/30 uppercase font-black italic leading-relaxed line-clamp-2">
                      {t.description}
                    </p>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-sm font-black italic text-blue-500">
                      ₦{t.suggested_amount.toLocaleString()} STAKE
                    </span>
                    <ArrowRight size={18} className="text-white/10 group-hover:text-white group-hover:translate-x-2 transition-all" />
                  </div>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setMode('custom')}
                className="p-8 rounded-[2.5rem] border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all flex flex-col items-center justify-center gap-4 group"
              >
                <Plus size={32} className="text-white/10 group-hover:scale-110 group-hover:text-white transition-all" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Start from Scratch</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-8 text-left font-bold italic">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">
                    Goal Specification
                  </label>
                  <input
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. 5AM DEEP WORK"
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-blue-500 transition-all font-bold italic uppercase tracking-widest text-sm text-white"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e: any) => setCategory(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-blue-500 transition-all font-bold italic uppercase tracking-widest text-sm text-white appearance-none cursor-pointer"
                  >
                    <option value="fitness" className="bg-[#0a0f1a]">
                      Fitness
                    </option>
                    <option value="learning" className="bg-[#0a0f1a]">
                      Learning
                    </option>
                    <option value="financial" className="bg-[#0a0f1a]">
                      Financial
                    </option>
                    <option value="habit" className="bg-[#0a0f1a]">
                      Habit
                    </option>
                    <option value="professional" className="bg-[#0a0f1a]">
                      Professional
                    </option>
                  </select>
                </div>
              </div>

              <div className="text-left">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">
                  Stake Amount (NGN)
                </label>
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
                <p className="mt-3 text-[9px] text-white/20 uppercase tracking-widest italic font-black">
                  If your wallet already covers this stake, activation happens immediately after creation.
                </p>
                <div className="mt-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] px-5 py-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/30 italic">
                    Funding Preview
                  </p>
                  <p className="mt-3 text-sm font-bold italic text-white">
                    Wallet balance: ₦{walletBalanceNaira.toLocaleString()}
                  </p>
                  <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/30 font-black italic leading-relaxed">
                    {walletCanActivateImmediately
                      ? 'This protocol can activate instantly from your wallet after creation.'
                      : `Add ₦${walletShortfallNaira.toLocaleString()} more to activate it immediately.`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e: any) => setFrequency(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-blue-500 transition-all font-bold italic uppercase tracking-widest text-sm text-white appearance-none cursor-pointer"
                  >
                    <option value="daily" className="bg-[#0a0f1a]">
                      Daily Log
                    </option>
                    <option value="weekly" className="bg-[#0a0f1a]">
                      Weekly Target
                    </option>
                    <option value="monthly" className="bg-[#0a0f1a]">
                      Monthly Target
                    </option>
                  </select>
                </div>
                <div className="text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">
                    Target Count
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={frequency === 'daily' ? '1' : frequency === 'weekly' ? '7' : '31'}
                    required
                    disabled={frequency === 'daily'}
                    value={targetCount}
                    onChange={(e) => setTargetCount(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-blue-500 transition-all font-bold italic text-white text-xl disabled:opacity-30"
                  />
                </div>
                <div className="text-left">
                  <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">
                    Duration (Weeks)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    required
                    value={durationWeeks}
                    onChange={(e) => setDurationWeeks(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-blue-500 transition-all font-bold italic text-white text-xl"
                  />
                </div>
              </div>

              <div className="text-left font-black uppercase italic tracking-widest text-[10px]">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block">
                  Pain Specification
                </label>
                <div className="grid grid-cols-3 gap-3 text-left">
                  {(['deterrence', 'enforcement', 'liquidation'] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => setPainTier(tier)}
                      className={`p-5 rounded-[1.5rem] border transition-all text-left group ${
                        painTier === tier
                          ? 'bg-blue-600/10 border-blue-500 text-blue-500 shadow-xl'
                          : 'bg-white/[0.01] border-white/5 text-white/20 hover:text-white'
                      }`}
                    >
                      <p className="font-black italic mb-1 uppercase tracking-widest">{tier}</p>
                      <p className="text-[8px] opacity-40 lowercase italic font-medium leading-none">
                        {tier === 'deterrence' ? '2%' : tier === 'enforcement' ? '5%' : '10%'} penalty
                      </p>
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-[1.5rem] border border-[#ff7a00]/20 bg-[#ff7a00]/8 px-5 py-4">
                  <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#ffb36b]">
                    Anti-Gaming Notice
                  </p>
                  <p className="mt-3 text-[10px] uppercase tracking-[0.18em] text-white/45 font-black italic leading-relaxed">
                    Missed check-ins follow the selected penalty tier. Separate from that, fabricated proof, witness collusion, or any attempt to game or manipulate enforcement can trigger admin breach review and full forfeiture of the remaining stake for this protocol.
                  </p>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-12 py-6 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all shadow-white/5 italic"
              >
                {loading ? 'Creating...' : 'Create Protocol'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
