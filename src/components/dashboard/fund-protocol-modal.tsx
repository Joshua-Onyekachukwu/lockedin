import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useAction, useMutation } from 'convex/react';
import { usePaystackPayment } from 'react-paystack';
import * as Sentry from '@sentry/react';
import { api } from '../../../convex/_generated/api';
import { useToast } from '~/components/toast';
import { toUserMessage } from '~/lib/errors';
import { useBodyScrollLock } from '~/lib/useBodyScrollLock';

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY;
const EMPTY_ARGS: Record<string, never> = {};
type FundingStage = 'idle' | 'initializing' | 'checkout' | 'verifying' | 'awaiting_confirmation';

export default function FundProtocolModal({
  vaultId,
  user,
  onClose,
  onSuccess,
}: {
  vaultId: string;
  user: any;
  onClose: () => void;
  onSuccess?: () => void;
}) {
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
  const [stage, setStage] = useState<FundingStage>('idle');
  const [statusMessage, setStatusMessage] = useState('Authorize the stake payment to activate this protocol.');
  const awaitingConfirmationRef = useRef(false);
  const finalizingRef = useRef(false);
  const retryingRef = useRef(false);

  const config = {
    reference: depositReference ?? '',
    email: user.email,
    amount: amountKobo,
    publicKey: PAYSTACK_PUBLIC_KEY,
  };

  const initializePayment = usePaystackPayment(config);

  useEffect(() => {
    if (!shouldOpenPaystack || !depositReference) return;
    setStage('checkout');
    setStatusMessage('Waiting for Paystack authorization...');
    initializePayment({ onSuccess: onPaystackSuccess, onClose: onClosePaystack });
    setShouldOpenPaystack(false);
  }, [depositReference, initializePayment, shouldOpenPaystack]);

  const completeFunding = async (message: string) => {
    if (finalizingRef.current) return;
    finalizingRef.current = true;
    awaitingConfirmationRef.current = false;
    setStatusMessage('Funding confirmed. Finalizing protocol activation...');
    await queryClient.invalidateQueries({
      queryKey: (convexQuery(api.goals.listByUser, EMPTY_ARGS as any) as any).queryKey,
    });
    await queryClient.invalidateQueries({
      queryKey: (convexQuery((api as any).notifications.list, { limit: 50 } as any) as any).queryKey,
    });
    toast.success(message, { title: 'Protocol Activated' });
    setLoading(false);
    setPollRef(null);
    setStage('idle');
    onSuccess?.();
    onClose();
  };

  const onPaystackSuccess = async (reference: any) => {
    awaitingConfirmationRef.current = true;
    setLoading(true);
    setStage('verifying');
    setStatusMessage('Verifying payment with Paystack...');
    // #region debug-point paystack-success-callback
    Sentry.captureMessage('paystack-success-callback', {
      level: 'info',
      tags: { area: 'payments', step: 'success-callback' },
      extra: {
        vaultId,
        depositReference,
        paystackReference: reference?.reference ?? null,
      },
    });
    // #endregion debug-point paystack-success-callback
    try {
      const result = await verifyPayment({ reference: reference.reference });
      // #region debug-point paystack-verify-result
      Sentry.captureMessage('paystack-verify-result', {
        level: 'info',
        tags: { area: 'payments', step: 'verify-result' },
        extra: {
          vaultId,
          paystackReference: reference?.reference ?? null,
          result,
        },
      });
      // #endregion debug-point paystack-verify-result
      if (result.success) {
        await completeFunding(result.message);
      } else {
        setStage('awaiting_confirmation');
        setStatusMessage('Payment received. Waiting for final confirmation...');
        toast.info('Awaiting confirmation...', { title: 'Processing' });
        setPollRef(reference.reference);
      }
    } catch (error) {
      // #region debug-point paystack-verify-error
      Sentry.captureMessage('paystack-verify-error', {
        level: 'error',
        tags: { area: 'payments', step: 'verify-error' },
        extra: {
          vaultId,
          paystackReference: reference?.reference ?? null,
          error: String(error),
        },
      });
      // #endregion debug-point paystack-verify-error
      setStage('awaiting_confirmation');
      setStatusMessage('Payment received. Waiting for final confirmation...');
      toast.info('Awaiting confirmation...', { title: 'Processing' });
      setPollRef(reference.reference);
    }
  };

  const onClosePaystack = () => {
    // #region debug-point paystack-close-callback
    Sentry.captureMessage('paystack-close-callback', {
      level: 'info',
      tags: { area: 'payments', step: 'close-callback' },
      extra: {
        vaultId,
        depositReference,
        pollRef,
        awaitingConfirmation: awaitingConfirmationRef.current,
      },
    });
    // #endregion debug-point paystack-close-callback
    setDepositReference(null);
    if (!awaitingConfirmationRef.current) {
      setLoading(false);
      setPollRef(null);
      setStage('idle');
      setStatusMessage('Authorize the stake payment to activate this protocol.');
    }
  };

  const handleStartPayment = async () => {
    if (!PAYSTACK_PUBLIC_KEY) {
      toast.error('Payment configuration missing. Set VITE_PAYSTACK_PUBLIC_KEY.', { title: 'Payment Offline' });
      return;
    }
    setLoading(true);
    setStage('initializing');
    setStatusMessage('Preparing secure payment session...');
    // #region debug-point paystack-start-init
    Sentry.captureMessage('paystack-start-init', {
      level: 'info',
      tags: { area: 'payments', step: 'start-init' },
      extra: { vaultId, userId: user?._id ?? null, email: user?.email ?? null },
    });
    // #endregion debug-point paystack-start-init
    try {
      const res = await initializeVaultFunding({ vaultId: vaultId as any });
      // #region debug-point paystack-init-result
      Sentry.captureMessage('paystack-init-result', {
        level: 'info',
        tags: { area: 'payments', step: 'init-result' },
        extra: {
          vaultId,
          reference: res.reference,
          amountKobo: res.amountKobo,
        },
      });
      // #endregion debug-point paystack-init-result
      setAmountKobo(res.amountKobo);
      setDepositReference(res.reference);
      setShouldOpenPaystack(true);
    } catch (err: any) {
      // #region debug-point paystack-init-error
      Sentry.captureMessage('paystack-init-error', {
        level: 'error',
        tags: { area: 'payments', step: 'init-error' },
        extra: { vaultId, error: String(err) },
      });
      // #endregion debug-point paystack-init-error
      toast.error(toUserMessage(err, 'Failed to initialize protocol funding.'), { title: 'Funding Failed' });
      setLoading(false);
      setStage('idle');
      setStatusMessage('Authorize the stake payment to activate this protocol.');
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
    // #region debug-point paystack-poll-status
    Sentry.captureMessage('paystack-poll-status', {
      level: 'info',
      tags: { area: 'payments', step: 'poll-status' },
      extra: {
        vaultId,
        pollRef,
        depositStatus,
      },
    });
    // #endregion debug-point paystack-poll-status
    if (depositStatus.status !== 'completed') return;
    (async () => {
      await completeFunding('Funding confirmed.');
    })();
  }, [depositStatus, pollRef, queryClient, toast]);

  useEffect(() => {
    if (!pollRef) return;
    const interval = window.setInterval(async () => {
      if (retryingRef.current || finalizingRef.current) return;
      retryingRef.current = true;
      try {
        setStage('awaiting_confirmation');
        setStatusMessage('Still confirming payment... this usually takes a few seconds.');
        const result = await verifyPayment({ reference: pollRef });
        if (result.success) {
          await completeFunding(result.message);
        }
      } catch (error) {
        // #region debug-point paystack-retry-error
        Sentry.captureMessage('paystack-retry-error', {
          level: 'error',
          tags: { area: 'payments', step: 'retry-error' },
          extra: { vaultId, pollRef, error: String(error) },
        });
        // #endregion debug-point paystack-retry-error
      } finally {
        retryingRef.current = false;
      }
    }, 4000);

    return () => window.clearInterval(interval);
  }, [pollRef, verifyPayment, vaultId]);

  const progressPercent =
    stage === 'initializing'
      ? 18
      : stage === 'checkout'
        ? 42
        : stage === 'verifying'
          ? 72
          : stage === 'awaiting_confirmation'
            ? 88
            : 0;
  const showProgressPanel = loading || stage !== 'idle';
  const disableClose = stage === 'verifying' || stage === 'awaiting_confirmation';

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
              disabled={disableClose}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:text-white transition-colors active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <X size={20} />
            </button>
          </div>

          <p className="text-white/30 text-xs font-bold italic uppercase tracking-widest mb-10 leading-relaxed">
            {statusMessage}
          </p>

          <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 flex items-center justify-between gap-6">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 italic">Stake</p>
            <p className="text-xl font-black italic text-white">₦{(amountKobo / 100).toLocaleString()}</p>
          </div>

          {showProgressPanel ? (
            <div className="mt-8 rounded-[2rem] border border-blue-500/20 bg-blue-500/5 p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full border-2 border-blue-500/30 border-t-blue-500 animate-spin" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 italic">
                    {stage === 'initializing'
                      ? 'Preparing'
                      : stage === 'checkout'
                        ? 'Authorize Payment'
                        : stage === 'verifying'
                          ? 'Verifying'
                          : 'Confirming'}
                  </p>
                  <p className="mt-2 text-xs text-white/55 italic leading-relaxed">
                    {stage === 'awaiting_confirmation'
                      ? 'We have your payment signal. Lockedin is waiting for final confirmation from the payment rail.'
                      : statusMessage}
                  </p>
                </div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          ) : null}

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
