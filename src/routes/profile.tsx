import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  User, 
  MapPin, 
  Camera, 
  ShieldCheck, 
  Globe, 
  ArrowLeft,
  Save,
  Loader2
} from 'lucide-react';
import { useState } from 'react';

export const Route = createFileRoute('/profile')({
  component: ProfileSettings,
});

function ProfileSettings() {
  const navigate = useNavigate();
  const { data: user } = useSuspenseQuery(convexQuery(api.users.current, {}));
  const updateProfile = useMutation(api.users.updateProfile);
  
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    city: user?.city || '',
    bio: user?.bio || '',
    is_discoverable: user?.is_discoverable ?? true,
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(formData);
      navigate({ to: '/dashboard' });
    } catch (err) {
      console.error(err);
      alert("Failed to update profile protocol.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Premium Glow Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full" />
      </div>

      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <button onClick={() => navigate({ to: '/dashboard' })} className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col text-left">
            <span className="font-bold tracking-tight text-lg leading-none text-white uppercase italic">Identity Protocol</span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black">Configuration Session</span>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto p-6 lg:p-12 text-left relative z-10">
        <form onSubmit={handleSave} className="space-y-12">
          {/* Avatar Section */}
          <div className="flex flex-col items-center text-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative h-32 w-32 rounded-[2.5rem] bg-gradient-to-tr from-blue-600 to-[#ff7a00] p-0.5 shadow-2xl">
                <div className="h-full w-full rounded-[2.5rem] bg-[#0a0f1a] flex items-center justify-center font-black text-4xl text-white uppercase italic">
                  {user?.name?.[0] || <User size={40} />}
                </div>
                <button type="button" className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform border-4 border-[#050810]">
                  <Camera size={18} />
                </button>
              </div>
            </div>
            <h2 className="mt-6 text-2xl font-black italic uppercase tracking-tight">{user?.name}</h2>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/10 border border-blue-500/20 text-[10px] font-black text-blue-500 uppercase tracking-widest italic shadow-xl">
                <ShieldCheck size={14} /> Integrity Score: {user?.integrityScore}%
              </div>
              {user?.bvn_verified && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff7a00]/10 border border-[#ff7a00]/20 text-[10px] font-black text-[#ff7a00] uppercase tracking-widest italic shadow-xl">
                   KYC Verified
                </div>
              )}
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-4 font-black">Full Legal Name</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-lg focus:border-blue-500/50 outline-none transition-all placeholder:text-white/5 font-medium"
                />
                <User className="absolute right-6 top-1/2 -translate-y-1/2 text-white/5 group-focus-within:text-blue-500/50 transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-4 font-black">Operating City</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={formData.city}
                  placeholder="e.g. Lagos, Nigeria"
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-lg focus:border-blue-500/50 outline-none transition-all placeholder:text-white/10 font-medium italic"
                />
                <MapPin className="absolute right-6 top-1/2 -translate-y-1/2 text-white/5 group-focus-within:text-blue-500/50 transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-4 font-black">Bio / Protocol Briefing</label>
              <textarea 
                value={formData.bio}
                placeholder="Briefly describe your high-performance focus..."
                onChange={e => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-[2rem] px-6 py-6 text-lg focus:border-blue-500/50 outline-none transition-all h-32 resize-none placeholder:text-white/10 font-medium"
              />
            </div>

            {/* Visibility Protocol */}
            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-600/10 text-blue-500 flex items-center justify-center">
                    <Globe size={20} />
                  </div>
                  <div className="text-left">
                    <p className="font-bold tracking-tight text-white italic uppercase text-sm">Witness Discovery</p>
                    <p className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Allow others to find you as a verifier</p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, is_discoverable: !formData.is_discoverable})}
                  className={`h-8 w-14 rounded-full transition-all relative ${formData.is_discoverable ? 'bg-blue-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 h-6 w-6 rounded-full bg-white transition-all ${formData.is_discoverable ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={isSaving}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-white text-black p-5 font-black uppercase tracking-[0.2em] hover:bg-white/90 disabled:opacity-50 transition-all active:scale-[0.98] shadow-2xl shadow-white/5 text-sm italic"
          >
            {isSaving ? <Loader2 className="animate-spin" /> : <><Save size={20} /> Commit Changes</>}
          </button>
        </form>
      </main>
    </div>
  );
}
