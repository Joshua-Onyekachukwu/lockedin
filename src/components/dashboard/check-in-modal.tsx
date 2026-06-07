import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Camera, Loader2, X } from 'lucide-react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useToast } from '~/components/toast';
import { toUserMessage } from '~/lib/errors';
import { useBodyScrollLock } from '~/lib/useBodyScrollLock';

export default function CheckInModal({
  vault,
  onClose,
  onSuccess,
}: {
  vault: any;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const generateUploadUrl = useMutation(api.goals.generateUploadUrl);
  const checkIn = useMutation(api.goals.checkIn);
  const toast = useToast();
  useBodyScrollLock(true);
  const [note, setNote] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Array<File>>([]);
  const [previewUrls, setPreviewUrls] = useState<Array<string>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const urls = selectedFiles.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    return () => {
      for (const u of urls) URL.revokeObjectURL(u);
    };
  }, [selectedFiles]);

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    try {
      let proofImageIds: Array<string> = [];
      if (selectedFiles.length > 0) {
        if (selectedFiles.length > 3) {
          throw new Error('Maximum 3 images per log.');
        }

        const ids: Array<string> = [];
        for (const file of selectedFiles) {
          const postUrl = await generateUploadUrl();
          const result = await fetch(postUrl, {
            method: 'POST',
            headers: { 'Content-Type': file.type },
            body: file,
          });
          if (!result.ok) {
            const text = await result.text().catch(() => '');
            throw new Error(text || 'Image upload failed.');
          }
          const json = await result.json();
          const storageId = json?.storageId as string | undefined;
          if (!storageId) throw new Error('Image upload failed (missing storage id).');
          ids.push(storageId);
        }
        proofImageIds = ids;
      }
      const args: any = { goalId: vault.goal._id, note: note };
      if (proofImageIds.length > 0) args.proofImageIds = proofImageIds;
      await checkIn(args);
      toast.success('Execution log transmitted.', { title: 'Log Submitted' });
      onSuccess?.();
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
      className="fixed inset-0 z-50 flex items-start justify-center bg-[#050810]/95 backdrop-blur-3xl p-4 sm:p-6 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-xl bg-[#0a0f1a] border border-white/10 rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] my-6"
      >
        <form
          onSubmit={handleSubmit}
          className="p-6 sm:p-12 text-left font-black italic uppercase overflow-y-auto custom-scrollbar"
        >
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
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const next = Array.from(e.target.files ?? []);
                    if (next.length === 0) return;
                    setSelectedFiles((prev) => [...prev, ...next].slice(0, 3));
                    e.target.value = '';
                  }}
                />
                <Camera
                  size={40}
                  className={`mx-auto mb-6 transition-transform ${
                    selectedFiles.length > 0 ? 'text-blue-500 scale-110' : 'text-white/10 group-hover:scale-110'
                  }`}
                />
                <p
                  className={`text-[10px] font-black uppercase tracking-widest italic ${
                    selectedFiles.length > 0 ? 'text-white' : 'text-white/20'
                  }`}
                >
                  {selectedFiles.length > 0
                    ? `${selectedFiles.length} image${selectedFiles.length === 1 ? '' : 's'} attached`
                    : 'Attach Photographic Evidence (Max 3)'}
                </p>
              </label>

              {previewUrls.length > 0 ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {previewUrls.map((u, idx) => (
                    <div key={u} className="relative p-3 rounded-[2.5rem] border border-white/10 bg-white/[0.02]">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="absolute top-4 right-4 h-9 w-9 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-white transition-colors active:scale-95 flex items-center justify-center"
                      >
                        <X size={16} />
                      </button>
                      <img
                        src={u}
                        alt="Evidence preview"
                        className="w-full max-h-[260px] object-contain rounded-[2rem]"
                      />
                    </div>
                  ))}
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
