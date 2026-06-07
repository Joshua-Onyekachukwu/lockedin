import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Camera, Loader2, X } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useToast } from '~/components/toast';
import { toUserMessage } from '~/lib/errors';
import { useBodyScrollLock } from '~/lib/useBodyScrollLock';

export default function CheckInModal({ vault, onClose }: { vault: any; onClose: () => void }) {
  const generateUploadUrl = useMutation(api.goals.generateUploadUrl);
  const checkIn = useMutation(api.goals.checkIn);
  const toast = useToast();
  useBodyScrollLock(true);
  const [note, setNote] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(selectedFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      let proofImageId: string | undefined = undefined;
      if (selectedFile) {
        const postUrl = await generateUploadUrl();
        const result = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': selectedFile.type },
          body: selectedFile,
        });
        if (!result.ok) {
          const text = await result.text().catch(() => '');
          throw new Error(text || 'Image upload failed.');
        }
        const json = await result.json();
        const storageId = json?.storageId as string | undefined;
        if (!storageId) throw new Error('Image upload failed (missing storage id).');
        proofImageId = storageId;
      }
      const args: any = { goalId: vault.goal._id, note: note };
      if (proofImageId) args.proofImageId = proofImageId;
      await checkIn(args);
      toast.success('Execution log transmitted.', { title: 'Log Submitted' });
      onClose();
    } catch (err: any) {
      toast.error(toUserMessage(err, 'Log transmission failed.'), { title: 'Transmission Failed' });
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
        className="w-full max-w-xl bg-[#0a0f1a] border border-white/10 rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]"
      >
        <form onSubmit={handleSubmit} className="p-6 sm:p-12 text-left font-black italic uppercase">
          <div className="flex items-center justify-between mb-12 text-left">
            <div className="flex items-center gap-4 text-left">
              <div className="h-12 w-12 rounded-2xl bg-[#ff7a00]/10 text-[#ff7a00] flex items-center justify-center italic font-black border border-[#ff7a00]/20 shadow-xl">
                C
              </div>
              <h2 className="text-2xl font-black tracking-tight uppercase italic text-white leading-none">Execute Log</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 text-white/20 hover:text-white transition-colors active:scale-90"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 rounded-[2rem] bg-blue-600/10 border border-blue-500/20 mb-10 flex items-start gap-4 text-left shadow-inner">
            <AlertCircle className="text-blue-500 mt-1" size={20} />
            <p className="text-xs text-blue-500 leading-relaxed font-bold italic tracking-tight uppercase">
              Evidence must be verifiable. False logs result in permanent integrity score reduction.
            </p>
          </div>

          <div className="space-y-8 text-left font-bold italic">
            <div className="text-left">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-4 block italic">
                Evidence Specification
              </label>
              <textarea
                required
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Describe execution protocol adherence..."
                className="w-full h-32 bg-white/[0.02] border border-white/10 rounded-2xl px-6 py-5 outline-none focus:border-blue-500 transition-all font-bold italic uppercase tracking-widest text-sm text-white resize-none"
              />
            </div>

            <div className="flex flex-col gap-4 text-center">
              <label className="w-full p-12 rounded-[2.5rem] border border-dashed border-white/10 bg-white/[0.01] text-center group hover:bg-white/[0.03] transition-all cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
                <Camera
                  size={40}
                  className={`mx-auto mb-6 transition-transform ${
                    selectedFile ? 'text-blue-500 scale-110' : 'text-white/10 group-hover:scale-110'
                  }`}
                />
                <p className={`text-[10px] font-black uppercase tracking-widest italic ${selectedFile ? 'text-white' : 'text-white/20'}`}>
                  {selectedFile ? selectedFile.name : 'Attach Photographic Evidence'}
                </p>
              </label>

              {previewUrl ? (
                <div className="w-full p-4 rounded-[2.5rem] border border-white/10 bg-white/[0.02]">
                  <img src={previewUrl} alt="Evidence preview" className="w-full max-h-[320px] object-contain rounded-[2rem]" />
                </div>
              ) : null}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-12 py-6 rounded-2xl bg-[#ff7a00] text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all shadow-[#ff7a00]/10 disabled:opacity-50 italic inline-flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" /> Transmitting...
              </>
            ) : (
              'Confirm Execution'
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

