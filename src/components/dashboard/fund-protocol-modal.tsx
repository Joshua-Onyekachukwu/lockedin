import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useAction, useMutation } from 'convex/react';
import { usePaystackPayment } from 'react-paystack';
import { api } from '../../../convex/_generated/api';
import { useToast } from '~/components/toast';
import { toUserMessage } from '~/lib/errors';
import { useBodyScrollLock } from '~/lib/useBodyScrollLock';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY;
const EMPTY_ARGS: Record<string, never> = {};

export default function FundProtocolModal({ vaultId, user, onClose }: { vaultId: string; user: any; onClose: () => void }) {
  const initializeVaultFunding = useMutation(api.payments.initializeVaultFunding);
  const verifyPayment = useAction(api.payments.verifyPayment);
  const queryClient = useQueryClient();
  const toast = useToast();
  useBodyScrollLock(true);
  const [loading, setLoading] = useState(false);
  const [depositReference, setDepositReference] = useState<string | null>(null);
  const [amountKobo, setAmountKobo] = useState<number>(0);
  const [shouldOpenPaystack, setShouldOpenPaystack] = useState(false);
  const [pollRef, setPollRef] = useState<string | null>(null);

  const config = {
    reference: depositReference ?? '',
    email: user.email,
    amount: amountKobo,
    publicKey: PAYSTACK_PUBLIC_KEY,
  };

  const initializePayment = usePaystackPayment(config);

  useEffect(() => {
    if (!shouldOpenPaystack || !depositReference) return;
    initializePayment({ onSuccess, onClose: onClosePaystack });
    setShouldOpenPaystack(false);
  }, [depositReference, initializePayment, shouldOpenPaystack]);

  const onSuccess = async (reference: any) => {
    setLoading(true);
    try {
      const result = await verifyPayment({ reference: reference.reference });
      if (result.success) {
        await queryClient.invalidateQueries({
          queryKey: (convexQuery(api.goals.listByUser, EMPTY_ARGS as any) as any).queryKey,
        });
        await queryClient.invalidateQueries({
          queryKey: (convexQuery((api as any).notifications.list, { limit: 50 } as any) as any).queryKey,
        });
        toast.success(result.message, { title: 'Protocol Activated' });
        setLoading(false);
        onClose();
      } else {
        toast.info('Awaiting confirmation...', { title: 'Processing' });
        setPollRef(reference.reference);
      }
    } catch {
      toast.info('Awaiting confirmation...', { title: 'Processing' });
      setPollRef(reference.reference);
    }
  };

  const onClosePaystack = () => {
    setLoading(false);
    setDepositReference(null);
    setPollRef(null);
  };

  const handleStartPayment = async () => {
    if (!PAYSTACK_PUBLIC_KEY) {
      toast.error('Payment configuration missing. Set VITE_PAYSTACK_PUBLIC_KEY.', { title: 'Payment Offline' });
      return;
    }
    setLoading(true);
    try {
      const res = await initializeVaultFunding({ vaultId: vaultId as any });
      setAmountKobo(res.amountKobo);
      setDepositReference(res.reference);
      setShouldOpenPaystack(true);
    } catch (err: any) {
      toast.error(toUserMessage(err, 'Failed to initialize protocol funding.'), { title: 'Funding Failed' });
      setLoading(false);
    }
  };

  const depositStatusQuery = convexQuery(
    api.payments.getDepositStatus,
    {
      reference: pollRef ?? '',
    } as any,
  ) as any;
  const { data: depositStatus }: { data: any } = useQuery({
    ...depositStatusQuery,
    enabled: !!pollRef,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  });

  useEffect(() => {
    if (!pollRef) return;
    if (!depositStatus) return;
    if (depositStatus.status !== 'completed') return;
    (async () => {
      await queryClient.invalidateQueries({
        queryKey: (convexQuery(api.goals.listByUser, EMPTY_ARGS as any) as any).queryKey,
      });
      await queryClient.invalidateQueries({
        queryKey: (convexQuery((api as any).notifications.list, { limit: 50 } as any) as any).queryKey,
      });
      toast.success('Funding confirmed.', { title: 'Protocol Activated' });
      setLoading(false);
      setPollRef(null);
      onClose();
    })();
  }, [depositStatus, onClose, pollRef, queryClient, toast]);

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
        className="w-full max-w-md bg-[#0a0f1a] border border-white/10 rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
      >
        <div className="p-6 sm:p-12 text-left">
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-600/10 text-blue-500 flex items-center justify-center italic font-black border border-blue-500/20 shadow-xl">
                <CreditCard size={20} />
              </div>
              <h2 className="text-2xl font-black tracking-tight uppercase italic text-white leading-none">Fund Protocol</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:text-white transition-colors active:scale-90"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-white/30 text-xs font-bold italic uppercase tracking-widest mb-10 leading-relaxed">
            Authorize the stake payment to activate this protocol.
          </p>

          <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 flex items-center justify-between gap-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Stake</p>
            <p className="text-xl font-black italic text-white">₦{(amountKobo / 100).toLocaleString()}</p>
          </div>

          <button
            type="button"
            onClick={handleStartPayment}
            disabled={loading}
            className="w-full mt-12 py-6 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all shadow-white/5 disabled:opacity-50 italic"
          >
            {loading ? 'Processing...' : 'Authorize Stake'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
