import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { convexQuery } from '@convex-dev/react-query'
import { useConvexAuth, useMutation } from 'convex/react'
import { ArrowLeft, CheckCircle2, ShieldCheck, User, X } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../convex/_generated/api'
import type { ReactNode } from 'react'
import { useToast } from '~/components/toast'
import { sanitizeMessage } from '~/lib/errors'

const EMPTY_ARGS: Record<string, never> = {}

export const Route = createFileRoute('/admin/users/$userId')({
  component: AdminUserDetailPage,
})

type PendingAction =
  | { kind: 'email_verified'; value: boolean }
  | { kind: 'bvn_verified'; value: boolean }
  | { kind: 'isAdmin'; value: boolean }
  | { kind: 'is_discoverable'; value: boolean }
  | { kind: 'witness_discoverable'; value: boolean }

function AdminUserDetailPage() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const queryClient = useQueryClient()
  const { userId } = Route.useParams()

  const userQuery = useMemo(() => convexQuery(api.users.current, EMPTY_ARGS as any) as any, [])
  const { data: me }: { data: any } = useSuspenseQuery({
    ...userQuery,
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  const adminStatusQuery = useMemo(() => convexQuery(api.admin.checkAdminStatus, EMPTY_ARGS as any) as any, [])
  const { data: adminStatus }: { data: any } = useSuspenseQuery({
    ...adminStatusQuery,
    enabled: isAuthenticated,
  })

  const isVerified = !!me?.emailVerificationTime
  const isAdmin = !!adminStatus?.isAdmin

  useEffect(() => {
    if (!authLoading && !isAuthenticated) navigate({ to: '/login' })
  }, [authLoading, isAuthenticated, navigate])

  useEffect(() => {
    if (!authLoading && isAuthenticated && !isVerified) navigate({ to: '/verify-required' })
  }, [authLoading, isAuthenticated, isVerified, navigate])

  useEffect(() => {
    if (!authLoading && isAuthenticated && isVerified && !isAdmin) navigate({ to: '/admin' })
  }, [authLoading, isAuthenticated, isVerified, isAdmin, navigate])

  const detailQuery = useMemo(
    () => convexQuery((api as any).admin.getUserDetail, { userId } as any) as any,
    [userId],
  )
  const { data: userDetail }: { data: any } = useSuspenseQuery({
    ...detailQuery,
    enabled: isAuthenticated && isVerified && isAdmin,
  })

  const protocolsQuery = useMemo(
    () => convexQuery((api as any).admin.getUserProtocols, { userId, limit: 50 } as any) as any,
    [userId],
  )
  const { data: protocols }: { data: any } = useSuspenseQuery({
    ...protocolsQuery,
    enabled: isAuthenticated && isVerified && isAdmin,
  })

  const updateUserVerifications = useMutation((api as any).admin.updateUserVerifications)

  const [pending, setPending] = useState<PendingAction | null>(null)
  const [reason, setReason] = useState('')
  const [running, setRunning] = useState(false)

  if (!userDetail) {
    return (
      <div className="min-h-screen bg-[#050810] text-white flex items-center justify-center p-6">
        <div className="text-white/30 font-black italic uppercase tracking-widest">User not found.</div>
      </div>
    )
  }

  const doUpdate = async () => {
    if (!pending) return
    const trimmed = reason.trim()
    if (!trimmed) return

    setRunning(true)
    try {
      const payload: any = { userId: userDetail._id, reason: trimmed }
      if (pending.kind === 'email_verified') payload.emailVerified = pending.value
      if (pending.kind === 'bvn_verified') payload.bvn_verified = pending.value
      if (pending.kind === 'isAdmin') payload.isAdmin = pending.value
      if (pending.kind === 'is_discoverable') payload.is_discoverable = pending.value
      if (pending.kind === 'witness_discoverable') payload.witness_discoverable = pending.value

      const res = await updateUserVerifications(payload)
      if (res?.success) {
        await queryClient.invalidateQueries()
        toast.success(res?.message ?? 'Updated.')
      } else {
        toast.error(res?.message ?? 'Update failed.')
      }
      setPending(null)
      setReason('')
    } catch (e: any) {
      toast.error(sanitizeMessage(e?.message ?? '', 'Update failed.'))
    } finally {
      setRunning(false)
    }
  }

  const emailVerified = !!userDetail.emailVerificationTime
  const witnessDiscoverable = userDetail.witness_discoverable !== false

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-12">
        <div className="flex items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              to="/admin"
              className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90 shrink-0"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="min-w-0">
              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                User Detail
              </p>
              <h1 className="mt-2 text-2xl sm:text-3xl text-white font-black uppercase italic tracking-tight truncate">
                {userDetail.name || 'Anonymous'}
              </h1>
              <p className="mt-2 text-[10px] text-white/30 uppercase tracking-[0.25em] italic font-black truncate">
                {userDetail.email || userDetail._id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/10">
              <p className="text-[9px] text-white/20 font-black uppercase tracking-widest italic">Integrity</p>
              <p className="mt-1 text-[10px] text-blue-500 font-black uppercase tracking-widest italic">
                {userDetail.integrityScore}%
              </p>
            </div>
            <div className="px-4 py-2 rounded-2xl bg-white/[0.02] border border-white/10">
              <p className="text-[9px] text-white/20 font-black uppercase tracking-widest italic">Email</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest italic">
                {emailVerified ? 'Verified' : 'Unverified'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-8">
            <section>
              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                Overview
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { k: 'Tier', v: userDetail.tier },
                  { k: 'Streak', v: `${userDetail.streak_count}W` },
                  { k: 'Missions', v: userDetail.goals_completed },
                  { k: 'Shields', v: userDetail.shields },
                  { k: 'Credits', v: userDetail.credits },
                  { k: 'Joined', v: new Date(userDetail._creationTime).toLocaleDateString() },
                  { k: 'Protocols', v: userDetail.vaultStats.total },
                  { k: 'Active', v: userDetail.vaultStats.active },
                ].map((row) => (
                  <div key={row.k} className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                      {row.k}
                    </p>
                    <p className="mt-3 text-white font-black uppercase italic tracking-tight text-lg">
                      {String(row.v ?? '')}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                Verification & Permissions
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3">
                <FlagRow
                  icon={<CheckCircle2 size={16} className="text-green-500" />}
                  label="Email Verified"
                  value={emailVerified ? 'On' : 'Off'}
                  actionLabel={emailVerified ? 'Clear' : 'Verify'}
                  disabled={running}
                  onAction={() => setPending({ kind: 'email_verified', value: !emailVerified })}
                />
                <FlagRow
                  icon={<ShieldCheck size={16} className="text-blue-500" />}
                  label="Admin"
                  value={userDetail.isAdmin ? 'On' : 'Off'}
                  actionLabel="Toggle"
                  disabled={running}
                  onAction={() => setPending({ kind: 'isAdmin', value: !userDetail.isAdmin })}
                />
                <FlagRow
                  icon={<User size={16} className="text-white/40" />}
                  label="Community Discoverable"
                  value={userDetail.is_discoverable ? 'On' : 'Off'}
                  actionLabel="Toggle"
                  disabled={running}
                  onAction={() => setPending({ kind: 'is_discoverable', value: !userDetail.is_discoverable })}
                />
                <FlagRow
                  icon={<User size={16} className="text-white/40" />}
                  label="Witness Pool"
                  value={witnessDiscoverable ? 'On' : 'Off'}
                  actionLabel="Toggle"
                  disabled={running}
                  onAction={() => setPending({ kind: 'witness_discoverable', value: !witnessDiscoverable })}
                />
                <FlagRow
                  icon={<User size={16} className="text-white/40" />}
                  label="BVN Verified"
                  value={userDetail.bvn_verified ? 'On' : 'Off'}
                  actionLabel="Toggle"
                  disabled={running}
                  onAction={() => setPending({ kind: 'bvn_verified', value: !userDetail.bvn_verified })}
                />
              </div>

              {userDetail.bvn_last4 ? (
                <p className="mt-5 text-[10px] text-white/25 font-black uppercase tracking-[0.25em] italic">
                  BVN: •••• {userDetail.bvn_last4}
                </p>
              ) : null}
            </section>

            <section className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/10">
              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                Protocol Status
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <StatPill label="Awaiting Funding" value={userDetail.vaultStats.awaiting_funding} />
                <StatPill label="Active" value={userDetail.vaultStats.active} />
                <StatPill label="Completed" value={userDetail.vaultStats.completed} />
                <StatPill label="Failed" value={userDetail.vaultStats.failed} />
              </div>
            </section>
          </div>

          <div className="lg:col-span-7 space-y-8">
            <section>
              <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                User Protocols
              </p>
              <div className="mt-6 space-y-4">
                {(protocols as Array<any>)?.length ? (
                  (protocols as Array<any>).map((v: any) => (
                    <Link
                      key={v._id}
                      to="/vault/$id"
                      params={{ id: v._id }}
                      className="block p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-white/20 transition-all"
                    >
                      <div className="flex items-start justify-between gap-6">
                        <div className="min-w-0">
                          <p className="text-white font-black uppercase italic tracking-tight truncate">
                            {v.goal?.title || 'Untitled'}
                          </p>
                          <p className="mt-2 text-[10px] text-white/30 font-black uppercase tracking-[0.25em] italic truncate">
                            {v.goal?.category} • {v.goal?.frequency_type || 'daily'} • {v.goal?.target_count ?? 1}/period
                          </p>
                          <p className="mt-3 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                            {v.status} • ₦{((v.amount ?? 0) / 100).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest italic">
                            {v.status === 'awaiting_funding' ? 'Funding required' : 'Protocol active'}
                          </p>
                          <p className="mt-2 text-[10px] text-white/15 font-black uppercase tracking-widest italic">
                            {new Date(v._creationTime).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="p-10 rounded-[2rem] bg-white/[0.01] border border-white/10 text-white/20 font-black uppercase tracking-widest italic text-center">
                    No protocols found.
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {pending ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (running) return
                setPending(null)
                setReason('')
              }}
              className="fixed inset-0 bg-[#050810]/70 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 14 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8"
            >
              <div className="w-full max-w-xl bg-[#0a0f1a] border border-white/10 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_0_120px_rgba(0,0,0,1)] overflow-hidden">
                <div className="p-6 sm:p-10 border-b border-white/5 flex items-start justify-between gap-6">
                  <div className="text-left min-w-0">
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.35em] italic">
                      Confirm Override
                    </p>
                    <p className="mt-2 text-white font-black uppercase italic tracking-tight text-xl truncate">
                      {userDetail.email || userDetail._id}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={running}
                    onClick={() => {
                      setPending(null)
                      setReason('')
                    }}
                    className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90 shrink-0 disabled:opacity-40"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div className="p-6 sm:p-10">
                  <p className="text-[10px] text-white/25 font-black uppercase tracking-[0.3em] italic mb-4">
                    Provide a reason (required)
                  </p>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full min-h-[120px] resize-none bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-blue-500 transition-all font-black italic tracking-tight text-sm text-white"
                    placeholder="Explain why this change is necessary..."
                  />
                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      disabled={running}
                      onClick={() => {
                        setPending(null)
                        setReason('')
                      }}
                      className="flex-1 px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black uppercase tracking-widest italic text-[10px] hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={running || !reason.trim()}
                      onClick={doUpdate}
                      className="flex-1 px-6 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest italic text-[10px] hover:scale-105 active:scale-95 transition-all disabled:opacity-40"
                    >
                      {running ? 'RUNNING...' : 'Confirm'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function FlagRow({
  icon,
  label,
  value,
  actionLabel,
  disabled,
  onAction,
}: {
  icon: ReactNode
  label: string
  value: string
  actionLabel: string
  disabled: boolean
  onAction: () => void
}) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 flex items-center justify-between gap-6">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-10 w-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.25em] italic">
            {label}
          </p>
          <p className="mt-1 text-xs text-white font-black uppercase italic tracking-tight truncate">
            {value}
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onAction}
        className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-white/70 font-black uppercase tracking-widest italic text-[10px] hover:bg-white/10 active:scale-95 transition-all disabled:opacity-40 shrink-0"
      >
        {actionLabel}
      </button>
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/10">
      <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.25em] italic">
        {label}
      </p>
      <p className="mt-2 text-white font-black uppercase italic tracking-tight text-lg">
        {value}
      </p>
    </div>
  )
}
