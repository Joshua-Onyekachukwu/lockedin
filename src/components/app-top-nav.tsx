import { convexQuery } from '@convex-dev/react-query'
import { useAuthActions } from '@convex-dev/auth/react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useConvexAuth } from 'convex/react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  ChevronDown,
  LogOut,
  Target,
  User,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api } from '../../convex/_generated/api'
import { useToast } from './toast'

const EMPTY_ARGS: Record<string, never> = {}

type ContextLink = {
  to: '/leaderboard' | '/community' | '/dashboard' | '/profile' | '/admin'
  label: string
  icon?: any
}

function notificationMeta(n: any) {
  switch (n.type) {
    case 'wallet_funded':
      return {
        icon: <Wallet size={14} />,
        className:
          'bg-green-600/10 text-green-500 border border-green-500/20 shadow-green-900/20',
      }
    case 'wallet_withdrawal':
      return {
        icon: <LogOut size={14} />,
        className:
          'bg-orange-600/10 text-[#ff7a00] border border-[#ff7a00]/20 shadow-orange-900/20',
      }
    case 'protocol_created':
      return {
        icon: <Target size={14} />,
        className:
          'bg-blue-600/10 text-blue-500 border border-blue-500/20 shadow-blue-900/20',
      }
    case 'profile_updated':
      return {
        icon: <User size={14} />,
        className: 'bg-white/5 text-white/40 border border-white/10 shadow-black/40',
      }
    case 'partner_request':
      return {
        icon: <Users size={14} />,
        className:
          'bg-purple-600/10 text-purple-400 border border-purple-500/20 shadow-purple-900/20',
      }
    case 'verification_needed':
      return {
        icon: <CheckCircle2 size={14} />,
        className:
          'bg-blue-600/10 text-blue-500 border border-blue-500/20 shadow-blue-900/20',
      }
    default:
      return {
        icon: <Bell size={14} />,
        className: 'bg-white/5 text-white/30 border border-white/10 shadow-black/40',
      }
  }
}

export function AppTopNav({
  title,
  subtitle,
  variant = 'subpage',
  backTo = '/dashboard',
  contextLinks,
  user,
  walletActive,
  onWalletClick,
}: {
  title: string
  subtitle: string
  variant?: 'dashboard' | 'subpage'
  backTo?: string
  contextLinks?: Array<ContextLink>
  user?: any
  walletActive?: boolean
  onWalletClick?: () => void
}) {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const { signOut } = useAuthActions()

  const userQuery = useMemo(
    () => convexQuery(api.users.current, EMPTY_ARGS as any) as any,
    [],
  )

  const { data: currentUser }: { data: any } = useQuery({
    ...(userQuery as any),
    enabled: isAuthenticated && !user,
    staleTime: 1000 * 20,
  } as any)

  const effectiveUser = user ?? currentUser

  const notificationsQuery = useMemo(
    () => convexQuery((api as any).notifications.list, { limit: 50 } as any) as any,
    [],
  )
  const { data: notifications } = useQuery({
    ...(notificationsQuery as any),
    enabled: isAuthenticated,
    placeholderData: [],
    staleTime: 1000 * 10,
  } as any)

  const markRead = useMutation((api as any).notifications.markRead)

  const [showNotifications, setShowNotifications] = useState(false)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [activeNotification, setActiveNotification] = useState<any>(null)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) return
    if (!effectiveUser) return
  }, [authLoading, effectiveUser, isAuthenticated])

  const unreadCount =
    (notifications as any[])?.filter?.((n: any) => !n.read).length || 0

  const closeAll = () => {
    setShowNotifications(false)
    setShowProfileMenu(false)
  }

  const openNotification = async (n: any) => {
    setActiveNotification({ ...n, read: true })
    if (!n.read) {
      try {
        await markRead?.({ notificationId: n._id })
      } catch {}
    }
  }

  return (
    <>
      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          {variant === 'dashboard' ? (
            <div className="relative group text-left">
              <div className="absolute inset-0 bg-blue-600 blur-md opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold shadow-lg shadow-blue-900/40 transition-transform group-hover:scale-105 active:scale-95 text-white uppercase italic">
                L
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) {
                  window.history.back()
                  return
                }
                navigate({ to: backTo as any })
              }}
              className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90 shadow-xl"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div className="flex flex-col text-left">
            <span className="font-black tracking-tight text-lg leading-none text-white uppercase italic">
              {title}
            </span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black italic">
              {subtitle}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-8 text-left font-bold">
          {contextLinks && contextLinks.length ? (
            <div className="hidden sm:flex items-center gap-6 text-sm font-black uppercase tracking-widest text-white/40 italic">
              {contextLinks.map((l) => (
                <Link
                  key={l.to}
                  to={l.to as any}
                  className="hover:text-white cursor-pointer transition-colors active:scale-95 flex items-center gap-2 italic text-[10px]"
                  onClick={() => closeAll()}
                >
                  {l.icon ? l.icon : null} {l.label}
                </Link>
              ))}
            </div>
          ) : null}

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          <button
            type="button"
            onClick={() => {
              setShowProfileMenu(false)
              setShowNotifications((v) => !v)
            }}
            className="relative p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/40 hover:text-white active:scale-95"
          >
            <Bell size={20} />
            {unreadCount > 0 ? (
              <span className="absolute top-0 right-0 h-4 w-4 bg-[#ff7a00] rounded-full border-4 border-[#050810] flex items-center justify-center shadow-lg" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onWalletClick) {
                onWalletClick()
                return
              }
              navigate({ to: '/dashboard' })
            }}
            className={`flex items-center gap-3 px-4 py-2 rounded-2xl transition-all active:scale-95 border ${
              walletActive
                ? 'bg-blue-600/10 border-blue-500 text-white shadow-xl shadow-blue-900/10'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
            }`}
          >
            <Wallet size={16} className={walletActive ? 'text-blue-500' : 'text-[#ff7a00]'} />
            <span className="text-sm font-black tracking-tight italic">
              ₦{((effectiveUser?.balance ?? 0) / 100)?.toLocaleString()}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowNotifications(false)
              setShowProfileMenu((v) => !v)
            }}
            className="flex items-center gap-2 rounded-full bg-white/5 border border-white/10 p-1.5 hover:bg-white/10 transition-all active:scale-95"
          >
            <span className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-600 to-[#ff7a00] p-0.5 shadow-lg">
              <span className="h-full w-full rounded-full bg-[#0a0f1a] flex items-center justify-center text-[10px] font-black uppercase overflow-hidden">
                {effectiveUser?.image ? (
                  <img src={effectiveUser.image} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  effectiveUser?.name?.[0] || 'U'
                )}
              </span>
            </span>
            <ChevronDown
              size={14}
              className={`text-white/40 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {showProfileMenu ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileMenu(false)}
              className="fixed inset-0 z-40 bg-transparent"
            />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="fixed top-[88px] right-8 z-50 w-[260px] rounded-[2.5rem] bg-[#0a0f1a]/95 backdrop-blur-3xl border border-white/10 shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden"
            >
              <div className="p-6 border-b border-white/10">
                <p className="text-white font-black uppercase italic tracking-tight">
                  {effectiveUser?.name || 'Identity'}
                </p>
                <p className="text-[10px] text-white/30 uppercase tracking-[0.25em] mt-2 font-black italic truncate">
                  {effectiveUser?.email}
                </p>
              </div>
              <div className="p-4 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false)
                    navigate({ to: '/profile' })
                  }}
                  className="w-full p-4 rounded-[2rem] bg-white/[0.02] border border-white/10 hover:bg-white/[0.05] transition-all text-left"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest italic text-white">
                    View Profile
                  </p>
                  <p className="text-[9px] text-white/30 uppercase tracking-widest mt-2 italic font-black">
                    Identity & privacy
                  </p>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setShowProfileMenu(false)
                    try {
                      await signOut()
                      toast.info('Session closed.', { title: 'Signed Out' })
                      window.location.href = '/'
                    } catch (err: any) {
                      toast.error(err?.message || 'Failed to sign out.', {
                        title: 'Sign Out Failed',
                      })
                    }
                  }}
                  className="w-full p-4 rounded-[2rem] bg-red-500/10 border border-red-500/20 hover:bg-red-500/15 transition-all text-left"
                >
                  <p className="text-[10px] font-black uppercase tracking-widest italic text-red-400">
                    Logout
                  </p>
                  <p className="text-[9px] text-red-400/50 uppercase tracking-widest mt-2 italic font-black">
                    End session
                  </p>
                </button>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {showNotifications ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 bg-[#050810]/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="fixed top-0 right-0 h-full w-full max-w-sm bg-[#0a0f1a] border-l border-white/10 z-50 shadow-[0_0_80px_rgba(0,0,0,1)] p-8 overflow-y-auto backdrop-blur-3xl"
            >
              <div className="flex items-center justify-between mb-10 text-left">
                <h3 className="font-bold text-xl text-left text-white font-black uppercase tracking-widest italic">
                  Protocol Logs
                </h3>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  className="text-white/20 hover:text-white transition-colors active:scale-95"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 text-left">
                {(notifications as any[])?.length === 0 ? (
                  <div className="text-center mt-20">
                    <Bell className="mx-auto text-white/5 mb-4 opacity-10" size={60} />
                    <p className="text-sm text-white/20 italic font-medium uppercase tracking-widest">
                      System logs clear.
                    </p>
                  </div>
                ) : (
                  (notifications as any[]).map((n: any) => {
                    const meta = notificationMeta(n)
                    return (
                      <div
                        key={n._id}
                        onClick={() => openNotification(n)}
                        className={`p-6 rounded-[2rem] border transition-all text-left group cursor-pointer active:scale-[0.98] ${
                          n.read
                            ? 'bg-transparent border-white/5 opacity-50'
                            : 'bg-white/[0.03] border-white/10 shadow-xl shadow-black/40 hover:bg-white/[0.05] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start gap-4 text-left">
                          <div
                            className={`mt-1 h-8 w-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg ${meta.className} ${
                              n.read ? 'opacity-60' : 'group-hover:scale-110 transition-transform'
                            }`}
                          >
                            {meta.icon}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-black text-sm text-white italic uppercase tracking-tight">
                              {n.title}
                            </p>
                            <p className="text-xs text-white/30 mt-1 leading-relaxed font-medium italic">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-white/15 mt-3 uppercase tracking-widest font-black italic">
                              {n._creationTime ? new Date(n._creationTime).toLocaleString() : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {activeNotification ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveNotification(null)}
              className="fixed inset-0 z-[90] bg-[#050810]/70 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-6"
            >
              <div className="w-full max-w-xl rounded-[3rem] bg-[#0a0f1a]/95 backdrop-blur-3xl border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-hidden">
                <div className="p-10 border-b border-white/10 flex items-start justify-between gap-6">
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-1 h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                        notificationMeta(activeNotification).className
                      }`}
                    >
                      {notificationMeta(activeNotification).icon}
                    </div>
                    <div className="text-left">
                      <p className="text-white font-black uppercase italic tracking-tight text-lg leading-tight">
                        {activeNotification.title}
                      </p>
                      <p className="text-[10px] text-white/20 uppercase tracking-[0.3em] font-black italic mt-2">
                        {activeNotification._creationTime
                          ? new Date(activeNotification._creationTime).toLocaleString()
                          : ''}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveNotification(null)}
                    className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-10">
                  <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/10 shadow-inner">
                    <p className="text-xs text-white/40 italic leading-relaxed">
                      {activeNotification.message}
                    </p>
                  </div>

                  <div className="mt-10 flex flex-col sm:flex-row gap-4">
                    {activeNotification.link ? (
                      <button
                        type="button"
                        onClick={() => {
                          const link = activeNotification.link as string
                          setActiveNotification(null)
                          setShowNotifications(false)
                          navigate({ to: link as any })
                        }}
                        className="flex-1 py-5 rounded-2xl bg-white text-black font-black text-[10px] uppercase tracking-[0.3em] italic hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        Open
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => setActiveNotification(null)}
                      className="flex-1 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-white/10 active:scale-95 transition-all"
                    >
                      Close
                    </button>
                  </div>

                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  )
}
