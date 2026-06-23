import { useMemo, useState } from 'react';
import { Copy, Share2 } from 'lucide-react';

type SharePresetsProps = {
  title: string;
  status?: string;
  url: string;
};

export function SharePresets({ title, status, url }: SharePresetsProps) {
  const [copied, setCopied] = useState(false);

  const shareText = useMemo(() => {
    const cleanTitle = title?.trim() ? title.trim() : 'a new protocol';
    const s = String(status ?? '').toLowerCase();
    if (s === 'completed') {
      return `I completed "${cleanTitle}" on Lockedin. The commitment held, and the proof is on record.`;
    }
    if (s === 'failed') {
      return `I fell short on "${cleanTitle}" on Lockedin. The protocol stays visible, and the consequence stands.`;
    }
    if (s === 'awaiting_funding') {
      return `I just created "${cleanTitle}" on Lockedin. Funding is next, and I am making the commitment public.`;
    }
    return `I just funded and activated "${cleanTitle}" on Lockedin. The commitment is live and the stake is public.`;
  }, [status, title]);

  const shareMessage = useMemo(
    () => `${shareText}\n\nView the public protocol: ${url}`.trim(),
    [shareText, url],
  );

  const encodedText = useMemo(() => encodeURIComponent(shareMessage), [shareMessage]);
  const encodedUrl = useMemo(() => encodeURIComponent(url), [url]);

  const open = (shareUrl: string) => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const nativeShare = async () => {
    const nav: any = navigator;
    if (!nav?.share) return;
    await nav.share({ title: 'Lockedin', text: shareText, url });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 text-left shadow-2xl">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 text-left mb-6">Share Protocol</p>
      <p className="text-[10px] text-blue-400/80 uppercase tracking-[0.2em] font-black italic mb-4">
        Best used right after activation or a completed check-in.
      </p>
      <p className="text-xs text-white/40 italic leading-relaxed font-medium whitespace-pre-line">{shareMessage}</p>

      <div className="mt-8 grid grid-cols-1 gap-3">
        <button
          type="button"
          onClick={() => open(`https://wa.me/?text=${encodedText}`)}
          className="w-full px-8 py-4 rounded-2xl bg-white text-black font-black uppercase tracking-widest text-[10px] italic hover:scale-105 active:scale-95 transition-all"
        >
          Share on WhatsApp
        </button>
        <button
          type="button"
          onClick={() => open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodedUrl}`)}
          className="w-full px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] italic hover:bg-white/10 transition-all"
        >
          Share on X
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] italic hover:bg-white/10 transition-all"
        >
          <Copy size={16} />
          {copied ? 'Copied' : 'Copy Caption + Link'}
        </button>
        <button
          type="button"
          onClick={nativeShare}
          className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] italic hover:bg-white/10 transition-all disabled:opacity-60"
          disabled={!(navigator as any)?.share}
        >
          <Share2 size={16} />
          Share Sheet
        </button>
      </div>
    </div>
  );
}
