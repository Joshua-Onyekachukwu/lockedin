import { convexQuery } from '@convex-dev/react-query'
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAction, useConvexAuth, useMutation } from 'convex/react'
import { motion } from 'framer-motion'
import {
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  Landmark,
  Receipt,
  Shield,
  Target,
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
const LEDGER_PAGE_SIZE = 7
const LEDGER_MAX_ITEMS = 200

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
  const withdrawalRequestsQuery = useMemo(
    () => convexQuery(api.payments.getWithdrawalRequests, { limit: 10 } as any) as any,
    [],
  )

  const [activityLimit] = useState(LEDGER_MAX_ITEMS)
  const [ledgerPage, setLedgerPage] = useState(1)
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
  const { data: withdrawalRequests } = useQuery({
    ...withdrawalRequestsQuery,
    enabled: isAuthenticated && isVerified,
    placeholderData: [] as Array<any>,
  }) as { data: Array<any> }
  const { data: activity }: { data: Array<any> } = useSuspenseQuery({
    ...walletActivityQuery,
    enabled: isAuthenticated && isVerified,
  })

  const initializeDeposit = useMutation(api.payments.initializeDeposit)
  const verifyPayment = useAction(api.payments.verifyPayment)
  const requestWithdrawal = useMutation(api.payments.requestWithdrawal)
  const cancelWithdrawalRequest = useMutation(api.payments.cancelWithdrawalRequest)
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
    await queryClient.invalidateQueries({ queryKey: withdrawalRequestsQuery.queryKey })
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
        bankName: withdrawalForm.bankName,
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
  const totalLedgerPages = Math.max(1, Math.ceil(filteredActivity.length / LEDGER_PAGE_SIZE))
  const currentLedgerPage = Math.min(ledgerPage, totalLedgerPages)
  const pagedActivity = filteredActivity.slice(
    (currentLedgerPage - 1) * LEDGER_PAGE_SIZE,
    currentLedgerPage * LEDGER_PAGE_SIZE,
  )

  const pendingActivity = activity.filter((entry) =>
    entry.status === 'pending' || entry.status === 'processing' || entry.status === 'approved',
  )
  const stakeHistory = activity.filter((entry) => entry.category === 'stake').slice(0, 6)
  const cancellableWithdrawals = (withdrawalRequests ?? []).filter(
    (entry) => entry.status === 'pending',
  )

  useEffect(() => {
    setLedgerPage(1)
  }, [ledgerFilter])

  async function handleCancelWithdrawal(withdrawalId: string) {
    try {
      const result = await cancelWithdrawalRequest({ withdrawalId: withdrawalId as any })
      if (!result.success) {
        toast.error(result.message, { title: 'Cancellation Blocked' })
        return
      }
      await refreshWalletQueries()
      toast.success(result.message, { title: 'Withdrawal Cancelled' })
    } catch (error: any) {
      toast.error(toUserMessage(error, 'Unable to cancel this withdrawal right now.'), {
        title: 'Cancellation Failed',
      })
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0a0d10] pb-20 font-ui text-[#f1e8d7]">
      <WalletTopupController
        config={depositConfig}
        shouldOpen={shouldOpenPaystack}
        fundReference={fundReference}
        onOpenHandled={() => setShouldOpenPaystack(false)}
        onSuccess={onTopupSuccess}
        onClose={onTopupClose}
      />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-64 bg-[linear-gradient(180deg,rgba(199,156,92,0.08),rgba(10,13,16,0))]" />
        <div className="absolute inset-x-0 top-24 h-px bg-white/6" />
      </div>

      <AppTopNav
        title="Wallet"
        subtitle="Balance, payouts and ledger"
        backTo="/dashboard"
        contextLinks={[
          { to: '/dashboard', label: 'Dashboard' },
          { to: '/community', label: 'Community' },
          { to: '/leaderboard', label: 'Leaderboard' },
        ]}
        user={user}
      />

      <main className="relative z-10 mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-12">
        <header className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[1.75rem] border border-[#2b3139] bg-[#12161b] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] italic text-[#c79c5c]">
              Wallet ledger
            </p>
            <h1 className="mt-4 max-w-2xl text-3xl font-black italic uppercase tracking-tight leading-tight text-[#f4ecdf] md:text-5xl">
              Your money, clearly accounted for.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#f1e8d7]/62 font-medium">
              Use this page to top up your balance, request withdrawals, and review every
              deposit, stake, refund, and payout without digging through profile settings.
            </p>

            <div className="mt-8 rounded-[1.5rem] border border-[#3a3123] bg-[#17130f] px-6 py-6">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] italic text-[#c79c5c]/82">
                Available to spend
              </p>
              <p className="mt-3 text-4xl font-black italic tracking-tight leading-none text-[#f8f0e2] md:text-5xl">
                {formatMoney(overview.availableBalance)}
              </p>
              <p className="mt-3 text-sm leading-6 text-[#f1e8d7]/56 font-medium">
                This is the balance you can move into a new protocol or withdraw to your bank.
              </p>
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-[#2b3139] bg-[#12161b] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
            <p className="text-[10px] font-black uppercase tracking-[0.32em] italic text-[#8fa1b4]">
              At a glance
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <MetricCard icon={<Shield size={17} />} label="Locked in active protocols" value={formatMoney(overview.lockedFunds)} />
              <MetricCard icon={<History size={17} />} label="Still settling" value={formatMoney(overview.pendingMovementTotal)} />
              <StatPanel label="Awaiting funding" value={formatMoney(overview.awaitingFunding)} helper="Created but not yet activated" />
              <StatPanel label="Active protocols" value={String(overview.activeProtocols)} helper="Currently locking capital" />
            </div>
          </section>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <StatPanel label="Deposited" value={formatMoney(overview.totalDeposited)} helper="Completed wallet topups" />
          <StatPanel label="Withdrawn" value={formatMoney(overview.totalWithdrawn)} helper="Completed payouts" />
          <StatPanel label="Pending deposits" value={String(overview.pendingDepositCount)} helper="Payments awaiting settlement" />
          <StatPanel label="Pending withdrawals" value={String(overview.pendingWithdrawalCount)} helper="Requests still in queue" />
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-[1.75rem] border border-[#2b3139] bg-[#12161b] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#c79c5c]/20 bg-[#c79c5c]/10 text-[#c79c5c]">
                <ArrowDownCircle size={20} />
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.28em] italic text-[#f1e8d7]/38">
                  Fund Wallet
                </p>
                <p className="mt-2 text-[1.35rem] font-black italic uppercase tracking-tight leading-tight text-[#f4ecdf]">
                  Add money to your available balance
                </p>
              </div>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-[1fr_auto]">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-[0.28em] italic text-[#f1e8d7]/40">
                  Amount (NGN)
                </span>
                <input
                  value={fundAmount}
                  onChange={(e) => setFundAmount(e.target.value)}
                  placeholder="5000"
                  inputMode="decimal"
                  className="mt-3 w-full rounded-[1rem] border border-[#313844] bg-[#0d1116] px-4 py-4 text-lg font-medium tracking-tight text-[#f4ecdf] placeholder:text-[#f4ecdf]/18"
                />
              </label>

              <button
                type="button"
                onClick={handleStartTopup}
                disabled={isFunding || fundAmountKobo <= 0 || !PAYSTACK_PUBLIC_KEY}
                className="self-end rounded-[1rem] bg-[#c79c5c] px-6 py-4 text-sm font-semibold tracking-tight text-[#17130d] transition-all hover:brightness-105 disabled:opacity-50"
              >
                {!PAYSTACK_PUBLIC_KEY ? 'Paystack unavailable' : isFunding ? 'Processing' : 'Fund wallet'}
              </button>
            </div>

            <div className="mt-5 rounded-[1rem] border border-[#313844] bg-[#0d1116] px-4 py-4">
              <p className="text-[10px] font-black uppercase tracking-[0.28em] italic text-[#f1e8d7]/40">
                Funding status
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#f1e8d7]/62">{fundingStatus}</p>
              {!PAYSTACK_PUBLIC_KEY ? (
                <p className="mt-3 font-data text-[11px] uppercase tracking-[0.2em] text-[#c79c5c]">
                  Missing `VITE_PAYSTACK_PUBLIC_KEY`
                </p>
              ) : null}
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-[#2b3139] bg-[#12161b] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#7c90a5]/20 bg-[#7c90a5]/10 text-[#aab9c8]">
                <ArrowUpCircle size={20} />
              </span>
              <div>
                <p className="font-data text-[11px] uppercase tracking-[0.22em] text-[#f1e8d7]/38">
                  Withdraw Funds
                </p>
                <p className="mt-2 font-editorial text-[1.7rem] leading-tight text-[#f4ecdf]">
                  Request a payout to your bank
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-4">
              <label className="block">
                <span className="font-data text-[11px] uppercase tracking-[0.2em] text-[#f1e8d7]/40">
                  Amount (NGN)
                </span>
                <input
                  value={withdrawalForm.amount}
                  onChange={(e) =>
                    setWithdrawalForm((current) => ({ ...current, amount: e.target.value }))
                  }
                  placeholder="2500"
                  inputMode="decimal"
                  className="mt-3 w-full rounded-[1rem] border border-[#313844] bg-[#0d1116] px-4 py-4 text-lg font-medium tracking-tight text-[#f4ecdf] placeholder:text-[#f4ecdf]/18"
                />
              </label>

              <label className="block">
                <span className="font-data text-[11px] uppercase tracking-[0.2em] text-[#f1e8d7]/40">
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
                  className="mt-3 w-full rounded-[1rem] border border-[#313844] bg-[#0d1116] px-4 py-4 text-sm font-medium text-[#f4ecdf]"
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
                <span className="font-data text-[11px] uppercase tracking-[0.2em] text-[#f1e8d7]/40">
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
                  className="mt-3 w-full rounded-[1rem] border border-[#313844] bg-[#0d1116] px-4 py-4 text-lg font-medium tracking-tight text-[#f4ecdf] placeholder:text-[#f4ecdf]/18"
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleResolveAccount}
                  disabled={isResolvingAccount || banksLoading}
                  className="rounded-[1rem] border border-[#313844] bg-[#151a21] px-5 py-4 text-sm font-medium text-[#f4ecdf] transition-all hover:bg-[#1a2028] disabled:opacity-50"
                >
                  {isResolvingAccount ? 'Resolving' : banksLoading ? 'Loading Banks' : 'Resolve Account'}
                </button>
                <button
                  type="button"
                  onClick={handleWithdrawalRequest}
                  disabled={isWithdrawing}
                  className="rounded-[1rem] bg-[#7c90a5] px-5 py-4 text-sm font-medium text-[#f7f0e4] transition-all hover:brightness-110 disabled:opacity-50"
                >
                  {isWithdrawing ? 'Submitting' : 'Request withdrawal'}
                </button>
              </div>

              <div className="rounded-[1rem] border border-[#313844] bg-[#0d1116] px-4 py-4">
                <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#f1e8d7]/40">
                  Resolved account
                </p>
                <p className="mt-2 text-sm text-[#f1e8d7]/62">
                  {withdrawalForm.accountName || 'Resolve the destination account before submitting.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[1.75rem] border border-[#2b3139] bg-[#12161b] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#313844] bg-[#151a21] text-[#f1e8d7]/60">
                <Receipt size={20} />
              </span>
              <div>
                <p className="font-data text-[11px] uppercase tracking-[0.22em] text-[#f1e8d7]/38">
                  Pending Movement
                </p>
                <p className="mt-2 font-editorial text-[1.7rem] leading-tight text-[#f4ecdf]">
                  Items still settling
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            {cancellableWithdrawals.length > 0 ? (
              <div className="mt-6 rounded-[1.25rem] border border-[#3a3123] bg-[#17130f] p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] italic text-[#c79c5c]">
                  Pending withdrawals you can release
                </p>
                <div className="mt-4 space-y-3">
                  {cancellableWithdrawals.map((withdrawal) => (
                    <div
                      key={withdrawal._id}
                      className="flex flex-col gap-3 rounded-[1rem] border border-[#3a3123] bg-[#0d1116] px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-editorial text-lg leading-tight text-[#f4ecdf]">
                          {formatMoney(withdrawal.amount)}
                        </p>
                        <p className="mt-1 text-xs leading-6 text-[#f1e8d7]/56">
                          Requested {new Date(withdrawal.requested_at).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelWithdrawal(String(withdrawal._id))}
                        className="rounded-full border border-[#c79c5c]/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f4ecdf] transition-all hover:bg-[#c79c5c]/10"
                      >
                        Cancel withdrawal
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-[1.75rem] border border-[#2b3139] bg-[#12161b] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.16)]">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] border border-[#313844] bg-[#151a21] text-[#f1e8d7]/60">
                <Target size={20} />
              </span>
              <div>
                <p className="font-data text-[11px] uppercase tracking-[0.22em] text-[#f1e8d7]/38">
                  Stake History
                </p>
                <p className="mt-2 font-editorial text-[1.7rem] leading-tight text-[#f4ecdf]">
                  Capital deployed into protocols
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
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

        <section className="rounded-[1.75rem] border border-[#2b3139] bg-[#12161b] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.16)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-data text-[11px] uppercase tracking-[0.22em] text-[#f1e8d7]/38">
                Complete ledger
              </p>
              <p className="mt-2 font-editorial text-[2rem] leading-tight text-[#f4ecdf]">
                Every recorded financial activity in Lockedin
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
                  className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                    ledgerFilter === value
                      ? 'bg-[#c79c5c] text-[#17130d]'
                      : 'border border-[#313844] bg-[#151a21] text-[#f1e8d7]/52'
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
              pagedActivity.map((entry) => <LedgerRow key={entry.entryId} entry={entry} />)
            )}
          </div>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] italic text-[#f1e8d7]/42">
              Page {currentLedgerPage} of {totalLedgerPages} · {LEDGER_PAGE_SIZE} per page · showing latest{' '}
              {Math.min(activityLimit, filteredActivity.length)}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLedgerPage((current) => Math.max(1, current - 1))}
                disabled={currentLedgerPage <= 1}
                className="rounded-full border border-[#313844] bg-[#151a21] px-5 py-3 text-sm font-medium text-[#f1e8d7] transition-all hover:bg-[#1a2028] disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() =>
                  setLedgerPage((current) => Math.min(totalLedgerPages, current + 1))
                }
                disabled={currentLedgerPage >= totalLedgerPages}
                className="rounded-full border border-[#313844] bg-[#151a21] px-5 py-3 text-sm font-medium text-[#f1e8d7] transition-all hover:bg-[#1a2028] disabled:opacity-40"
              >
                Next
              </button>
            </div>
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
      className="rounded-[1.25rem] border border-[#313844] bg-[#0d1116] p-5"
    >
      <div className="flex items-center gap-3 text-[#f1e8d7]/44">
        {icon}
        <p className="font-data text-[11px] uppercase tracking-[0.2em]">{label}</p>
      </div>
      <p className="mt-4 font-editorial text-[1.9rem] leading-none text-[#f4ecdf]">{value}</p>
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
    <div className="rounded-[1.25rem] border border-[#313844] bg-[#0d1116] p-4">
      <p className="font-data text-[11px] uppercase tracking-[0.2em] text-[#f1e8d7]/40">{label}</p>
      <p className="mt-3 font-editorial text-[1.45rem] leading-none text-[#f4ecdf]">{value}</p>
      <p className="mt-2 text-sm leading-6 text-[#f1e8d7]/48">{helper}</p>
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
    <div className="rounded-[1.25rem] border border-dashed border-[#313844] bg-[#0d1116] px-6 py-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1rem] border border-[#313844] bg-[#151a21] text-[#f1e8d7]/40">
        {icon}
      </div>
      <p className="mt-4 font-editorial text-xl leading-none text-[#f4ecdf]">{title}</p>
      <p className="mt-3 text-sm leading-7 text-[#f1e8d7]/48">{body}</p>
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
    <div className="rounded-[1.25rem] border border-[#313844] bg-[#0d1116] px-5 py-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="font-editorial text-xl leading-tight text-[#f4ecdf]">
            {entry.title}
          </p>
          {entry.subtitle ? (
            <p className="mt-2 text-sm leading-7 text-[#f1e8d7]/52">{entry.subtitle}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2 font-data text-[11px] uppercase tracking-[0.12em] text-[#f1e8d7]/38">
            <span>{new Date(entry.createdAt).toLocaleString()}</span>
            <span>{entry.status}</span>
            {entry.reference ? <span>Receipt {entry.reference}</span> : null}
          </div>
        </div>

        <div className="text-left lg:text-right shrink-0">
          <p className={`font-editorial text-[1.65rem] leading-none ${amountTone}`}>
            {amountLabel}
          </p>
          <p className="mt-2 font-data text-[11px] uppercase tracking-[0.14em] text-[#f1e8d7]/38">
            {entry.category.replaceAll('_', ' ')}
          </p>
        </div>
      </div>
    </div>
  )
}
