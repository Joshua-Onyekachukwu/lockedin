import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  XCircle,
} from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

type ToastAction = {
  label: string
  onClick: () => void
}

type ToastItem = {
  id: string
  title?: string
  message: string
  variant: ToastVariant
  durationMs: number
  action?: ToastAction
}

type ToastInput = {
  id?: string
  title?: string
  message: string
  variant: ToastVariant
  durationMs?: number
  action?: ToastAction
}

type ToastApi = {
  push: (toast: ToastInput) => string
  success: (message: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => string
  error: (message: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => string
  warning: (message: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => string
  info: (message: string, opts?: Omit<ToastInput, 'message' | 'variant'>) => string
}

const ToastContext = createContext<ToastApi | null>(null)

function iconFor(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return <CheckCircle2 size={18} className="text-green-500" />
    case 'error':
      return <XCircle size={18} className="text-red-500" />
    case 'warning':
      return <AlertTriangle size={18} className="text-yellow-500" />
    case 'info':
      return <Info size={18} className="text-blue-500" />
  }
}

function toneFor(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return {
        border: 'border-green-500/20',
        glow: 'shadow-[0_0_40px_rgba(34,197,94,0.12)]',
        badge: 'bg-green-500/10 text-green-500 border-green-500/20',
      }
    case 'error':
      return {
        border: 'border-red-500/20',
        glow: 'shadow-[0_0_40px_rgba(239,68,68,0.12)]',
        badge: 'bg-red-500/10 text-red-500 border-red-500/20',
      }
    case 'warning':
      return {
        border: 'border-yellow-500/20',
        glow: 'shadow-[0_0_40px_rgba(234,179,8,0.12)]',
        badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      }
    case 'info':
      return {
        border: 'border-blue-500/20',
        glow: 'shadow-[0_0_40px_rgba(59,130,246,0.12)]',
        badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      }
  }
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Array<ToastItem>>([])
  const timers = useRef(new Map<string, number>())

  const remove = useCallback((id: string) => {
    const t = timers.current.get(id)
    if (t) window.clearTimeout(t)
    timers.current.delete(id)
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (input: ToastInput) => {
      const id = input.id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`
      const toast: ToastItem = {
        id,
        title: input.title,
        message: input.message,
        variant: input.variant,
        durationMs: input.durationMs ?? 4500,
        action: input.action,
      }

      setToasts((prev) => [toast, ...prev].slice(0, 5))

      const timeout = window.setTimeout(() => remove(id), toast.durationMs)
      timers.current.set(id, timeout)

      return id
    },
    [remove],
  )

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (message, opts) => push({ ...opts, message, variant: 'success', durationMs: opts?.durationMs ?? 3500 }),
      error: (message, opts) => push({ ...opts, message, variant: 'error', durationMs: opts?.durationMs ?? 6000 }),
      warning: (message, opts) => push({ ...opts, message, variant: 'warning', durationMs: opts?.durationMs ?? 6000 }),
      info: (message, opts) => push({ ...opts, message, variant: 'info', durationMs: opts?.durationMs ?? 4500 }),
    }),
    [push],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-6 right-6 z-[100] w-[380px] max-w-[calc(100vw-3rem)] space-y-4 pointer-events-none">
        <AnimatePresence initial={false}>
          {toasts.map((t) => {
            const tone = toneFor(t.variant)
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -8, x: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, x: 12, scale: 0.98 }}
                transition={{ duration: 0.18 }}
                className={`pointer-events-auto overflow-hidden rounded-[2.25rem] border bg-[#0a0f1a]/95 backdrop-blur-3xl ${tone.border} ${tone.glow}`}
              >
                <div className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-2xl border flex items-center justify-center shrink-0 ${tone.badge}`}>
                      {iconFor(t.variant)}
                    </div>
                    <div className="flex-1 min-w-0">
                      {t.title ? (
                        <p className="text-white font-black italic uppercase tracking-tight text-sm leading-tight">{t.title}</p>
                      ) : null}
                      <p className="text-white/40 text-xs italic font-bold leading-relaxed uppercase tracking-tight mt-1">
                        {t.message}
                      </p>
                      {t.action ? (
                        <button
                          onClick={() => {
                            t.action?.onClick()
                            remove(t.id)
                          }}
                          className="mt-4 inline-flex items-center justify-center rounded-2xl bg-white text-black px-4 py-2 text-[10px] font-black uppercase tracking-widest italic shadow-xl active:scale-95 transition-transform"
                        >
                          {t.action.label}
                        </button>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      className="h-9 w-9 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white transition-colors active:scale-90"
                      aria-label="Dismiss notification"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return ctx
}
