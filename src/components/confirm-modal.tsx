import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useState } from 'react'

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  tone = 'primary',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  tone?: 'primary' | 'danger'
  onConfirm: () => Promise<void> | void
  onClose: () => void
}) {
  const [working, setWorking] = useState(false)

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => (working ? null : onClose())}
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
                <div className="text-left">
                  <p className="text-white font-black uppercase italic tracking-tight text-lg leading-tight">
                    {title}
                  </p>
                  {description ? (
                    <p className="text-[10px] text-white/30 uppercase tracking-[0.28em] font-black italic mt-3 leading-relaxed">
                      {description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => (working ? null : onClose())}
                  className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-10 flex flex-col sm:flex-row gap-4">
                <button
                  type="button"
                  disabled={working}
                  onClick={async () => {
                    if (working) return
                    try {
                      setWorking(true)
                      await onConfirm()
                      onClose()
                    } finally {
                      setWorking(false)
                    }
                  }}
                  className={`flex-1 py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] italic hover:scale-[1.02] active:scale-95 transition-all ${
                    tone === 'danger'
                      ? 'bg-red-500 text-white shadow-xl shadow-red-900/20'
                      : 'bg-white text-black'
                  } ${working ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  {working ? 'Processing...' : confirmLabel}
                </button>
                <button
                  type="button"
                  disabled={working}
                  onClick={() => (working ? null : onClose())}
                  className={`flex-1 py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-white/10 active:scale-95 transition-all ${
                    working ? 'opacity-60 pointer-events-none' : ''
                  }`}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}

