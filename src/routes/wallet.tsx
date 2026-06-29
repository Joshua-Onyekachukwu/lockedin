import { convexQuery } from '@convex-dev/react-query'
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAction, useConvexAuth, useMutation } from 'convex/react'
import { motion } from 'framer-motion'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CreditCard,
  History,
  Landmark,
  Receipt,
  Shield,
  Target,
  Wallet,
} from 'lucide-react'
import { usePaystackPayment } from 'react-paystack'
import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { ReactNode } from 'react'
import { AppTopNav } from '~/components/app-top-nav'
import { useToast } from '~/components/toast'
import { toUserMessage } from '~/lib/errors'

const EMPTY_ARGS: Record<string, never> = {}
const PAYSTACK_PUBLIC_KEY =
  import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || process.env.VITE_PAYSTACK_PUBLIC_KEY

type LedgerFilter = 'all' | 'money' | 'stake' | 'refund' | 'reward'

export const Route = createFileRoute('/wallet')({
  component: WalletPage,
})

function formatMoney(amount: number) {
  const sign = amount < 0 ? '-' : ''
  return `${sign}₦${(Math.abs(amount) / 100).toLocaleString()}`
}

type WalletTopupControllerProps = {
  config: {
    reference: string
    email: string
    amount: number
    publicKey: string
  }
  shouldOpen: boolean
  fundReference: string | null
  onOpenHandled: () => void
  onSuccess: (reference: any) => void
  onClose: () => void
}

function WalletTopupController({
  config,
  shouldOpen,
  fundReference,
  onOpenHandled,
  onSuccess,
  onClose,
}: WalletTopupControllerProps) {
  const initializePayment = usePaystackPayment(config)

  useEffect(() => {
    if (!shouldOpen || !fundReference) return
    initializePayment({
      onSuccess,
      onClose,
    })
    onOpenHandled()
  }, [fundReference, initializePayment, onClose, onOpenHandled, onSuccess, shouldOpen])

  return null
}

function WalletPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const queryClient = useQueryClient()
  const toast = useToast()

  const userQuery = useMemo(
    () => convexQuery(api.users.current, EMPTY_ARGS as any) as any,
    [],
  )
  const walletOverviewQuery = useMemo(
    () => convexQuery(api.payments.getWalletOverview, EMPTY_ARGS as any) as any,
    [],
  )

  const [activityLimit, setActivityLimit] = useState(40)
  const walletActivityQuery = useMemo(
    () => convexQuery(api.payments.getWalletActivity, { limit: activityLimit } as any) as any,
    [activityLimit],
  )

  const { data: user }: { data: any } = useSuspenseQuery({
    ...userQuery,
    enabled: isAuthenticated,
  })
  const isVerified = !!user?.emailVerificationTime

  const { data: overview }: { data: any } = useSuspenseQuery({
    ...walletOverviewQuery,
    enabled: isAuthenticated && isVerified,
  })
  const { data: activity }: { data: Array<any> } = useSuspenseQuery({
    ...walletActivityQuery,
    enabled: isAuthenticated && isVerified,
  })

  const initializeDeposit = useMutation(api.payments.initializeDeposit)
  const verifyPayment = useAction(api.payments.verifyPayment)
  const requestWithdrawal = useMutation(api.payments.requestWithdrawal)
  const listPaystackBanks = useAction(api.payments.listPaystackBanks)
  const resolvePaystackAccount = useAction(api.payments.resolvePaystackAccount)

  const [ledgerFilter, setLedgerFilter] = useState<LedgerFilter>('all')
  const [fundAmount, setFundAmount] = useState('')
  const [fundAmountKobo, setFundAmountKobo] = useState(0)
  const [fundReference, setFundReference] = useState<string | null>(null)
  const [shouldOpenPaystack, setShouldOpenPaystack] = useState(false)
  const [isFunding, setIsFunding] = useState(false)
  const [fundingStatus, setFundingStatus] = useState('Top up your available balance instantly via Paystack.')
  const [pollReference, setPollReference] = useState<string | null>(null)
  const awaitingConfirmationRef = useRef(false)
  const finalizingRef = useRef(false)
  const retryingRef = useRef(false)

  const [banks, setBanks] = useState<Array<{ name: string; code: string }>>([])
  const [banksLoading, setBanksLoading] = useState(false)
  const [isResolvingAccount, setIsResolvingAccount] = useState(false)
  const [isWithdrawing, setIsWithdrawing] = useState(false)
  const [withdrawalForm, setWithdrawalForm] = useState({
    amount: '',
    bankCode: '',
    bankName: '',
    accountNumber: '',
    accountName: '',
  })

  const depositConfig = {
    reference: fundReference ?? '',
    email: user?.email ?? '',
    amount: fundAmountKobo,
    publicKey: PAYSTACK_PUBLIC_KEY,
  }

  const depositStatusQuery = useMemo(
    () =>
      convexQuery(
        api.payments.getDepositStatus,
        {
          reference: pollReference ?? '',
        } as any,
      ) as any,
    [pollReference],
  )
  const { data: depositStatus }: { data: any } = useQuery({
    ...depositStatusQuery,
    enabled: !!pollReference,
    refetchInterval: 5000,
    refetchIntervalInBackground: false,
  })

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' })
    }
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !isVerified) {
      navigate({ to: '/verify-required' })
    }
  }, [authLoading, isAuthenticated, isVerified, navigate, user])

  useEffect(() => {
    if (!isAuthenticated || !isVerified) return

    let cancelled = false
    ;(async () => {
      setBanksLoading(true)
      try {
        const result = await listPaystackBanks({})
        if (!cancelled && result.success) {
          setBanks(result.banks)
        }
      } catch {
        if (!cancelled) {
          toast.error('Unable to load bank list right now.', { title: 'Wallet Banking' })
        }
      } finally {
        if (!cancelled) setBanksLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, isVerified, listPaystackBanks, toast])

  useEffect(() => {
    if (!pollReference || !depositStatus) return
    if (depositStatus.status !== 'completed') return
    void finalizeWalletRefresh('Wallet funded successfully.')
  }, [depositStatus, pollReference])

  useEffect(() => {
    if (!pollReference) return
    const interval = window.setInterval(async () => {
      if (retryingRef.current || finalizingRef.current) return
      retryingRef.current = true
      try {
        const result = await verifyPayment({ reference: pollReference })
        if (result.success) {
          await finalizeWalletRefresh(result.message)
        }
      } catch {
      } finally {
        retryingRef.current = false
      }
    }, 6000)

    return () => window.clearInterval(interval)
  }, [pollReference, verifyPayment])

  if (authLoading || !isAuthenticated || !user || !isVerified) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full" />
      </div>
    )
  }

  async function refreshWalletQueries() {
    await queryClient.invalidateQueries({ queryKey: userQuery.queryKey })
    await queryClient.invalidateQueries({ queryKey: walletOverviewQuery.queryKey })
    await queryClient.invalidateQueries({ queryKey: walletActivityQuery.queryKey })
    await queryClient.invalidateQueries({
      queryKey: (convexQuery((api as any).notifications.list, { limit: 50 } as any) as any).queryKey,
    })
  }

  async function finalizeWalletRefresh(message: string) {
    if (finalizingRef.current) return
    finalizingRef.current = true
    awaitingConfirmationRef.current = false
    await refreshWalletQueries()
    toast.success(message, { title: 'Wallet Updated' })
    setIsFunding(false)
    setFundAmount('')
    setFundReference(null)
    setPollReference(null)
    setFundingStatus('Top up your available balance instantly via Paystack.')
    finalizingRef.current = false
  }

  async function handleStartTopup() {
    const amount = Number(fundAmount)
    if (!PAYSTACK_PUBLIC_KEY) {
      toast.error('Payment configuration missing.', { title: 'Wallet Funding Offline' })
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid funding amount.', { title: 'Invalid Amount' })
      return
    }

    setIsFunding(true)
    setFundingStatus('Preparing secure payment session...')
    try {
      const result = await initializeDeposit({ amount })
      setFundAmountKobo(Math.round(amount * 100))
      setFundReference(result.reference)
      setShouldOpenPaystack(true)
      setFundingStatus('Opening Paystack checkout...')
    } catch (error: any) {
      setIsFunding(false)
      setFundingStatus('Top up your available balance instantly via Paystack.')
      toast.error(toUserMessage(error, 'Unable to initialize wallet funding.'), {
        title: 'Funding Failed',
      })
    }
  }

  async function onTopupSuccess(reference: any) {
    awaitingConfirmationRef.current = true
    setFundingStatus('Payment received. Verifying with Paystack...')
    try {
      const result = await verifyPayment({ reference: reference.reference })
      if (result.success) {
        await finalizeWalletRefresh(result.message)
        return
      }
      setPollReference(reference.reference)
      setFundingStatus('Awaiting payment confirmation...')
    } catch {
      setPollReference(reference.reference)
      setFundingStatus('Awaiting payment confirmation...')
    }
  }

  function onTopupClose() {
    setFundReference(null)
    if (!awaitingConfirmationRef.current) {
      setIsFunding(false)
      setFundingStatus('Top up your available balance instantly via Paystack.')
    }
  }

  async function handleResolveAccount() {
    if (!withdrawalForm.bankCode || withdrawalForm.accountNumber.trim().length !== 10) {
      toast.error('Select a bank and enter a valid 10-digit account number.', {
        title: 'Resolve Account',
      })
      return
    }
    setIsResolvingAccount(true)
    try {
      const result = await resolvePaystackAccount({
        accountNumber: withdrawalForm.accountNumber.trim(),
        bankCode: withdrawalForm.bankCode,
      })
      if (!result.success || !result.accountName) {
        toast.error(result.message || 'Unable to resolve account.', {
          title: 'Resolve Account',
        })
        return
      }
      setWithdrawalForm((current) => ({
        ...current,
        accountName: result.accountName ?? '',
      }))
      toast.success('Account resolved successfully.', { title: 'Bank Details Confirmed' })
    } catch (error: any) {
      toast.error(toUserMessage(error, 'Unable to resolve bank account.'), {
        title: 'Resolve Account Failed',
      })
    } finally {
      setIsResolvingAccount(false)
    }
  }

  async function handleWithdrawalRequest() {
    const amount = Number(withdrawalForm.amount)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Enter a valid withdrawal amount.', { title: 'Invalid Amount' })
      return
    }
    if (!withdrawalForm.bankCode || !withdrawalForm.bankName || !withdrawalForm.accountName) {
      toast.error('Resolve the destination account before submitting.', {
        title: 'Withdrawal Blocked',
      })
      return
    }

    setIsWithdrawing(true)
    try {
      const result = await requestWithdrawal({
        amount: Math.round(amount * 100),
        accountNumber: withdrawalForm.accountNumber.trim(),
        bankCode: withdrawalForm.bankCode,
        bankName: withdrawalForm.bankName,
        accountName: withdrawalForm.accountName,
      })
      if (!result.success) {
        toast.error(result.message, { title: 'Withdrawal Request Failed' })
        return
      }

      await refreshWalletQueries()
      setWithdrawalForm({
        amount: '',
        bankCode: '',
        bankName: '',
        accountNumber: '',
        accountName: '',
      })
      toast.success(result.message, { title: 'Withdrawal Queued' })
    } catch (error: any) {
      toast.error(toUserMessage(error, 'Unable to request withdrawal.'), {
        title: 'Withdrawal Failed',
      })
    } finally {
      setIsWithdrawing(false)
    }
  }

  const filteredActivity = activity.filter((entry) => {
    if (ledgerFilter === 'all') return true
    if (ledgerFilter === 'money') return entry.valueKind === 'money'
    if (ledgerFilter === 'stake') return entry.category === 'stake'
    if (ledgerFilter === 'refund') return entry.category === 'refund'
    if (ledgerFilter === 'reward') {
      return entry.category === 'reward_distribution' || entry.category === 'dividend'
    }
    return true
  })

  const pendingActivity = activity.filter((entry) =>
    entry.status === 'pending' || entry.status === 'processing' || entry.status === 'approved',
  )
  const stakeHistory = activity.filter((entry) => entry.category === 'stake').slice(0, 6)

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden pb-20">
      <WalletTopupController
        config={depositConfig}
        shouldOpen={shouldOpenPaystack}
        fundReference={fundReference}
        onOpenHandled={() => setShouldOpenPaystack(false)}
        onSuccess={onTopupSuccess}
        onClose={onTopupClose}
      />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full" />
      </div>

      <AppTopNav
        title="Wallet Command"
        subtitle="Financial Ledger"
        backTo="/dashboard"
        contextLinks={[
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/community', label: 'Community' },
          { to: '/leaderboard', label: 'Leaderboard' },
        ]}
        user={user}
      />

      <main className="max-w-7xl mx-auto p-6 lg:p-12 text-left relative z-10 space-y-10">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-white/30 italic">
              First-Class Wallet
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl lg:text-6xl uppercase italic leading-tight">
              Capital <span className="text-blue-500">Control.</span>
            </h1>
            <p className="mt-5 max-w-3xl text-white/30 text-lg leading-relaxed italic">
              Track available balance, locked stake, pending movement, receipts, refunds, rewards,
              and the full financial ledger for your Lockedin account.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetricCard icon={<Wallet size={18} />} label="Available" value={formatMoney(overview.availableBalance)} />
            <MetricCard icon={<Shield size={18} />} label="Locked" value={formatMoney(overview.lockedFunds)} />
            <MetricCard icon={<History size={18} />} label="Pending" value={formatMoney(overview.pendingMovementTotal)} />
            <MetricCard icon={<CreditCard size={18} />} label="Credits" value={overview.creditsBalance.toLocaleString()} />
          </div>
        </header>

        <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <ArrowDownCircle size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">
                  Fund Wallet
                </p>
                <p className="mt-2 text-white font-black uppercase italic tracking-tight text-xl">
                  Add available balance
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 italic">
                  Amount (NGN)
                </span>
                <input
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="5000"
                  inputMode="decimal"
                  className="mt-3 w-full rounded-[1.75rem] border border-white/10 bg-[#0a0f1a] px-5 py-4 text-lg font-black italic tracking-tight text-white placeholder:text-white/10"
                />
              </label>

              <button
                type="button"
                onClick={handleStartTopup}
                disabled={isFunding}
                className="self-end rounded-[1.75rem] bg-blue-600 px-6 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-all disabled:opacity-50"
              >
                {isFunding ? 'Processing' : 'Fund Wallet'}
              </button>
            </div>

            <div className="mt-5 rounded-[1.75rem] border border-white/10 bg-[#0a0f1a] px-5 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">
                Funding status
              </p>
              <p className="mt-2 text-sm text-white/60 italic">{fundingStatus}</p>
              {!PAYSTACK_PUBLIC_KEY ? (
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.25em] text-[#ff7a00] italic">
                  Missing `VITE_PAYSTACK_PUBLIC_KEY`
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 rounded-2xl bg-[#ff7a00]/10 border border-[#ff7a00]/20 flex items-center justify-center text-[#ff7a00]">
                <ArrowUpCircle size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">
                  Withdraw Funds
                </p>
                <p className="mt-2 text-white font-black uppercase italic tracking-tight text-xl">
                  Request payout
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 italic">
                  Amount (NGN)
                </span>
                <input
                  value={withdrawalForm.amount}
                  onChange={(e) =>
                    setWithdrawalForm((current) => ({ ...current, amount: e.target.value }))
                  }
                  placeholder="2500"
                  inputMode="decimal"
                  className="mt-3 w-full rounded-[1.75rem] border border-white/10 bg-[#0a0f1a] px-5 py-4 text-lg font-black italic tracking-tight text-white placeholder:text-white/10"
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 italic">
                  Bank
                </span>
                <select
                  value={withdrawalForm.bankCode}
                  onChange={(e) => {
                    const selected = banks.find((bank) => bank.code === e.target.value)
                    setWithdrawalForm((current) => ({
                      ...current,
                      bankCode: e.target.value,
                      bankName: selected?.name ?? '',
                      accountName: '',
                    }))
                  }}
                  className="mt-3 w-full rounded-[1.75rem] border border-white/10 bg-[#0a0f1a] px-5 py-4 text-sm font-black italic tracking-tight text-white"
                >
                  <option value="">Select bank</option>
                  {banks.map((bank) => (
                    <option key={bank.code} value={bank.code}>
                      {bank.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 italic">
                  Account Number
                </span>
                <input
                  value={withdrawalForm.accountNumber}
                  onChange={(e) =>
                    setWithdrawalForm((current) => ({
                      ...current,
                      accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10),
                      accountName: '',
                    }))
                  }
                  placeholder="0123456789"
                  inputMode="numeric"
                  className="mt-3 w-full rounded-[1.75rem] border border-white/10 bg-[#0a0f1a] px-5 py-4 text-lg font-black italic tracking-tight text-white placeholder:text-white/10"
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleResolveAccount}
                  disabled={isResolvingAccount || banksLoading}
                  className="rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-all disabled:opacity-50"
                >
                  {isResolvingAccount ? 'Resolving' : banksLoading ? 'Loading Banks' : 'Resolve Account'}
                </button>
                <button
                  type="button"
                  onClick={handleWithdrawalRequest}
                  disabled={isWithdrawing}
                  className="rounded-[1.75rem] bg-[#ff7a00] px-5 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-all disabled:opacity-50"
                >
                  {isWithdrawing ? 'Submitting' : 'Request Withdrawal'}
                </button>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-[#0a0f1a] px-5 py-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 italic">
                  Resolved account
                </p>
                <p className="mt-2 text-sm text-white/70 italic">
                  {withdrawalForm.accountName || 'Resolve the destination account before submitting.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatPanel label="Pending deposits" value={formatMoney(overview.pendingDeposits)} helper={`${overview.pendingDepositCount} items`} />
          <StatPanel label="Pending withdrawals" value={formatMoney(overview.pendingWithdrawals)} helper={`${overview.pendingWithdrawalCount} items`} />
          <StatPanel label="Awaiting funding" value={formatMoney(overview.awaitingFunding)} helper="Protocols not yet activated" />
          <StatPanel label="Total staked" value={formatMoney(overview.totalStaked)} helper={`${overview.activeProtocols} active protocols`} />
          <StatPanel label="Total deposited" value={formatMoney(overview.totalDeposited)} helper="Completed wallet topups" />
          <StatPanel label="Total withdrawn" value={formatMoney(overview.totalWithdrawn)} helper="Completed payouts" />
          <StatPanel label="Refunded" value={formatMoney(overview.totalRefunded)} helper="Recovered payment value" />
          <StatPanel label="Shields" value={overview.shieldsBalance.toLocaleString()} helper="Non-cash protection credits" />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
                <Receipt size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">
                  Pending Movement
                </p>
                <p className="mt-2 text-white font-black uppercase italic tracking-tight text-xl">
                  What is still settling
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {pendingActivity.length === 0 ? (
                <EmptyState
                  icon={<History size={28} />}
                  title="No pending movement"
                  body="Your wallet has no deposits or withdrawals waiting on settlement right now."
                />
              ) : (
                pendingActivity.slice(0, 8).map((entry) => (
                  <LedgerRow key={entry.entryId} entry={entry} />
                ))
              )}
            </div>
          </div>

          <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60">
                <Target size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">
                  Stake History
                </p>
                <p className="mt-2 text-white font-black uppercase italic tracking-tight text-xl">
                  Protocol capital trail
                </p>
              </div>
            </div>

            <div className="mt-8 space-y-3">
              {stakeHistory.length === 0 ? (
                <EmptyState
                  icon={<Target size={28} />}
                  title="No stake entries yet"
                  body="Stake locks will appear here once wallet balance is deployed into protocols."
                />
              ) : (
                stakeHistory.map((entry) => <LedgerRow key={entry.entryId} entry={entry} />)
              )}
            </div>
          </div>
        </section>

        <section className="rounded-[2.5rem] border border-white/10 bg-white/[0.02] p-8 shadow-2xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 italic">
                Complete Ledger
              </p>
              <p className="mt-2 text-white font-black uppercase italic tracking-tight text-2xl">
                Every financial activity in Lockedin
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {([
                ['all', 'All'],
                ['money', 'Money'],
                ['stake', 'Stakes'],
                ['refund', 'Refunds'],
                ['reward', 'Rewards'],
              ] as Array<[LedgerFilter, string]>).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLedgerFilter(value)}
                  className={`rounded-2xl px-4 py-2 text-[10px] font-black uppercase tracking-[0.25em] transition-all ${
                    ledgerFilter === value
                      ? 'bg-white text-black'
                      : 'bg-white/5 border border-white/10 text-white/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {filteredActivity.length === 0 ? (
              <EmptyState
                icon={<Landmark size={28} />}
                title="No ledger entries"
                body="Financial activity will appear here as you fund, stake, withdraw, receive refunds, or earn rewards."
              />
            ) : (
              filteredActivity.map((entry) => <LedgerRow key={entry.entryId} entry={entry} />)
            )}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={() => setActivityLimit((current) => Math.min(current + 20, 100))}
              disabled={activity.length < activityLimit || activityLimit >= 100}
              className="rounded-[1.75rem] border border-white/10 bg-white/5 px-5 py-4 text-[10px] font-black uppercase tracking-[0.25em] text-white transition-all disabled:opacity-40"
            >
              Load More Entries
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-5 shadow-2xl"
    >
      <div className="flex items-center gap-3 text-white/40">
        {icon}
        <p className="text-[10px] font-black uppercase tracking-[0.25em] italic">{label}</p>
      </div>
      <p className="mt-4 text-xl font-black uppercase italic tracking-tight text-white">{value}</p>
    </motion.div>
  )
}

function StatPanel({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper: string
}) {
  return (
    <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 italic">{label}</p>
      <p className="mt-4 text-xl font-black uppercase italic tracking-tight text-white">{value}</p>
      <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-white/25 italic">{helper}</p>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <div className="rounded-[2rem] border border-dashed border-white/10 bg-[#0a0f1a] px-6 py-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/40">
        {icon}
      </div>
      <p className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-white italic">{title}</p>
      <p className="mt-3 text-sm text-white/35 italic leading-relaxed">{body}</p>
    </div>
  )
}

function LedgerRow({ entry }: { entry: any }) {
  const amountTone =
    entry.valueKind === 'credits'
      ? 'text-blue-400'
      : entry.amount < 0
        ? 'text-[#ff7a00]'
        : 'text-emerald-400'

  const amountLabel =
    entry.valueKind === 'credits'
      ? `${entry.amount.toLocaleString()} credits`
      : formatMoney(entry.amount)

  return (
    <div className="rounded-[2rem] border border-white/10 bg-[#0a0f1a] px-5 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white italic">
            {entry.title}
          </p>
          {entry.subtitle ? (
            <p className="mt-2 text-sm text-white/45 italic leading-relaxed">{entry.subtitle}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/25 italic">
            <span>{new Date(entry.createdAt).toLocaleString()}</span>
            <span>{entry.status}</span>
            {entry.reference ? <span>Receipt {entry.reference}</span> : null}
          </div>
        </div>

        <div className="text-left lg:text-right shrink-0">
          <p className={`text-lg font-black uppercase italic tracking-tight ${amountTone}`}>
            {amountLabel}
          </p>
          <p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-white/20 italic">
            {entry.category.replaceAll('_', ' ')}
          </p>
        </div>
      </div>
    </div>
  )
}
