import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { SharePresets } from '~/components/share-presets'

export function SharePromptModal({
  open,
  title,
  status,
  url,
  onClose,
}: {
  open: boolean
  title: string
  status?: string
  url: string
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[90] bg-[#050810]/70 backdrop-blur-xl"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          >
            <div className="w-full max-w-3xl rounded-[3rem] bg-[#0a0f1a]/95 backdrop-blur-3xl border border-white/10 shadow-[0_0_120px_rgba(0,0,0,0.9)] overflow-hidden">
              <div className="p-6 sm:p-10 border-b border-white/10 flex items-start justify-between gap-6">
                <div className="text-left">
                  <p className="text-white font-black uppercase italic tracking-tight text-lg leading-tight">
                    Share Protocol
                  </p>
                  <p className="text-[10px] text-white/30 uppercase tracking-[0.28em] font-black italic mt-3 leading-relaxed">
                    Optional broadcast. Share only if you want social pressure.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 w-10 flex items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-white/30 hover:text-white transition-colors active:scale-90"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-0">
                <div className="p-0">
                  <SharePresets title={title} status={status} url={url} />
                </div>
                <div className="px-6 sm:px-10 pb-6 sm:pb-10">
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-5 rounded-2xl bg-white/5 border border-white/10 text-white font-black text-[10px] uppercase tracking-[0.3em] italic hover:bg-white/10 active:scale-95 transition-all"
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
  )
}

