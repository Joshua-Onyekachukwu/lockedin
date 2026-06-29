import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useConvexAuth, useMutation } from 'convex/react';
import { 
  ArrowLeft, 
  Camera, 
  Eye, 
  EyeOff, 
  Globe, 
  Loader2,
  Lock,
  MapPin,
  ShieldCheck,
  User
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { api } from '../../convex/_generated/api';
import { useToast } from '~/components/toast';
import { toUserMessage } from '~/lib/errors';

export const Route = createFileRoute('/profile')({
  component: ProfileSettings,
});

function ProfileSettings() {
  const { isAuthenticated, isLoading: authLoading } = useConvexAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const toast = useToast();
  const userQuery = convexQuery(api.users.current, {}) as any;
  const { data: user }: { data: any } = useSuspenseQuery({
    ...userQuery,
    enabled: isAuthenticated,
  });
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateProfileImageUploadUrl as any);
  const setProfileImage = useMutation(api.users.setProfileImage as any);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    city: user?.city || '',
    bio: user?.bio || '',
    is_discoverable: user?.is_discoverable ?? true,
    witness_discoverable: user?.witness_discoverable ?? true,
  });
  useEffect(() => {
    if (isEditing) return;
    setFormData({
      name: user?.name || '',
      city: user?.city || '',
      bio: user?.bio || '',
      is_discoverable: user?.is_discoverable ?? true,
      witness_discoverable: user?.witness_discoverable ?? true,
    });
  }, [isEditing, user]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate({ to: '/login' });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const isVerified = !!user?.emailVerificationTime;

  useEffect(() => {
    if (!authLoading && isAuthenticated && user && !isVerified) {
      navigate({ to: '/verify-required' });
    }
  }, [authLoading, isAuthenticated, isVerified, navigate, user]);

  if (authLoading || !isAuthenticated || !user || !isVerified) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent animate-spin rounded-full" />
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateProfile(formData);
      await queryClient.invalidateQueries({ queryKey: userQuery.queryKey });
      toast.success('Identity synchronized.', { title: 'Synchronization Complete' });
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      toast.error(toUserMessage(err, 'Failed to update identity protocol.'), {
        title: 'Synchronization Failed',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const resetAndCloseEdit = () => {
    setFormData({
      name: user?.name || '',
      city: user?.city || '',
      bio: user?.bio || '',
      is_discoverable: user?.is_discoverable ?? true,
      witness_discoverable: user?.witness_discoverable ?? true,
    });
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen bg-[#050810] text-white font-sans selection:bg-blue-500/30 overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-50 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#ff7a00]/5 blur-[120px] rounded-full" />
      </div>

      <nav className="border-b border-white/5 bg-[#0a0f1a]/50 backdrop-blur-xl px-8 py-5 flex items-center justify-between sticky top-0 z-40 text-left shadow-lg">
        <div className="flex items-center gap-4 text-left">
          <button onClick={() => navigate({ to: '/dashboard' })} className="relative h-10 w-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90 shadow-xl">
            <ArrowLeft size={20} />
          </button>
          <div className="flex flex-col text-left">
            <span className="font-black tracking-tight text-lg leading-none text-white uppercase italic">Identity Protocol</span>
            <span className="text-[10px] text-white/20 uppercase tracking-[0.2em] mt-1 font-black italic">Configuration Session</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className={`px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest italic transition-all border ${
            isEditing
              ? 'bg-white/5 text-white/30 border-white/10'
              : 'bg-white text-black border-white/10 hover:scale-[1.02] active:scale-95'
          }`}
          disabled={isEditing}
        >
          Edit
        </button>
      </nav>

      <main className="max-w-3xl mx-auto p-6 lg:p-12 text-left relative z-10">
        <form onSubmit={handleSave} className="space-y-12">
          {/* Avatar Section */}
          <div className="flex flex-col items-center text-center">
            <div className="relative group">
              <div className="absolute inset-0 bg-blue-600 blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
              <div className="relative h-32 w-32 rounded-[3rem] bg-gradient-to-tr from-blue-600 to-[#ff7a00] p-0.5 shadow-2xl">
                <div className="h-full w-full rounded-[3rem] bg-[#0a0f1a] overflow-hidden flex items-center justify-center font-black text-4xl text-white uppercase italic">
                  {user?.image ? (
                    <img src={user.image} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    user?.name?.[0] || <User size={40} />
                  )}
                </div>
                <button
                  type="button"
                  disabled={!isEditing || avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-2 -right-2 h-10 w-10 rounded-xl bg-white text-black flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform border-4 border-[#050810] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {avatarUploading ? <Loader2 size={18} className="animate-spin" /> : <Camera size={18} />}
                </button>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                try {
                  setAvatarUploading(true)
                  const uploadUrl = await generateUploadUrl({})
                  const headers: Record<string, string> = {}
                  if (file.type) headers['Content-Type'] = file.type
                  const res = await fetch(uploadUrl, {
                    method: 'POST',
                    headers,
                    body: file,
                  })
                  if (!res.ok) throw new Error('Upload failed.')
                  let json: any = null
                  try {
                    json = await res.json()
                  } catch {
                    json = null
                  }
                  const storageId = json?.storageId
                  if (!storageId) throw new Error('Upload failed.')
                  await setProfileImage({ storageId })
                  await queryClient.invalidateQueries({ queryKey: userQuery.queryKey })
                  toast.success('Profile image updated.', { title: 'Synchronization Complete' })
                } catch (err: any) {
                  console.error(err)
                  toast.error(toUserMessage(err, 'Failed to update profile image.'), { title: 'Upload Failed' })
                } finally {
                  setAvatarUploading(false)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }
              }}
            />
            <h2 className="mt-8 text-3xl font-black italic uppercase tracking-tight">{user?.name}</h2>
            <p className="mt-3 text-[10px] text-white/20 uppercase tracking-[0.3em] font-black italic">{user?.email}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-600/10 border border-blue-500/20 text-[10px] font-black text-blue-500 uppercase tracking-widest italic shadow-xl">
                <ShieldCheck size={14} /> Integrity Score: {user?.integrityScore}%
              </div>
              {user?.bvn_verified && (
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-600/10 border border-green-500/20 text-[10px] font-black text-green-500 uppercase tracking-widest italic shadow-xl">
                   KYC Verified
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Email</p>
              <p className="mt-4 text-sm text-white font-black italic uppercase tracking-tight">{user?.email || '—'}</p>
              <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                {user?.emailVerificationTime ? `Verified: ${new Date(user.emailVerificationTime).toLocaleDateString()}` : 'Not verified'}
              </p>
            </div>
            {user?.bvn_verified || user?.bvn_last4 ? (
              <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">BVN</p>
                <p className="mt-4 text-sm text-white font-black italic uppercase tracking-tight">
                  {user?.bvn_last4 ? `•••• ${user.bvn_last4}` : 'Linked'}
                </p>
                <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                  {user?.bvn_verified ? 'Verified' : 'Pending verification'}
                </p>
              </div>
            ) : null}
            <div className="p-8 rounded-[2.5rem] bg-white/[0.02] border border-white/5 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 italic">Tier</p>
              <p className="mt-4 text-sm text-white font-black italic uppercase tracking-tight">{user?.tier || 'bronze'}</p>
              <p className="mt-2 text-[10px] text-white/20 font-black uppercase tracking-widest italic">
                Shields: {user?.shields ?? 0} • Credits: {user?.credits ?? 0}
              </p>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-6 italic">Public Identity (Alias)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  disabled={!isEditing}
                  className={`w-full bg-white/[0.02] border border-white/10 rounded-2xl px-8 py-5 text-lg transition-all placeholder:text-white/5 font-black uppercase italic tracking-widest text-white shadow-inner ${
                    isEditing ? 'focus:border-blue-500' : 'opacity-60 cursor-not-allowed'
                  }`}
                />
                <User className="absolute right-8 top-1/2 -translate-y-1/2 text-white/5 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
              <p className="text-[9px] text-white/10 ml-6 uppercase tracking-widest italic font-black">This name will be visible on the Leaderboard and Community Feed.</p>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-6 italic">Operational Sector (City)</label>
              <div className="relative group">
                <input 
                  type="text" 
                  value={formData.city}
                  placeholder="e.g. LAGOS, NIGERIA"
                  onChange={e => setFormData({...formData, city: e.target.value})}
                  disabled={!isEditing}
                  className={`w-full bg-white/[0.02] border border-white/10 rounded-2xl px-8 py-5 text-lg transition-all placeholder:text-white/10 font-black uppercase italic tracking-widest text-white shadow-inner ${
                    isEditing ? 'focus:border-blue-500' : 'opacity-60 cursor-not-allowed'
                  }`}
                />
                <MapPin className="absolute right-8 top-1/2 -translate-y-1/2 text-white/5 group-focus-within:text-blue-500 transition-colors" size={20} />
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-6 italic">Behavioral Goal (Bio)</label>
              <textarea 
                value={formData.bio}
                placeholder="Describe your commitment protocol..."
                onChange={e => setFormData({...formData, bio: e.target.value})}
                disabled={!isEditing}
                className={`w-full bg-white/[0.02] border border-white/10 rounded-[2.5rem] px-8 py-8 text-lg transition-all h-40 resize-none placeholder:text-white/10 font-medium italic text-white shadow-inner ${
                  isEditing ? 'focus:border-blue-500' : 'opacity-60 cursor-not-allowed'
                }`}
              />
            </div>

            {/* Visibility Protocols */}
            <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 ml-6 italic">Privacy Protocols</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        type="button"
                        onClick={() => {
                          if (!isEditing) return;
                          setFormData({...formData, is_discoverable: !formData.is_discoverable});
                        }}
                        className={`p-8 rounded-[2.5rem] border transition-all text-left group relative overflow-hidden ${formData.is_discoverable ? 'bg-blue-600/5 border-blue-500/20' : 'bg-white/[0.02] border-white/5'}`}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${formData.is_discoverable ? 'bg-blue-600 text-white border-blue-400 shadow-xl shadow-blue-900/40' : 'bg-white/5 text-white/20 border-white/5'}`}>
                                {formData.is_discoverable ? <Eye size={18} /> : <EyeOff size={18} />}
                            </div>
                            <p className={`font-black italic uppercase text-xs tracking-tight ${formData.is_discoverable ? 'text-white' : 'text-white/20'}`}>Community Feed</p>
                        </div>
                        <p className="text-[10px] text-white/30 font-bold italic uppercase leading-relaxed font-black">
                            {formData.is_discoverable ? 'Goals are visible in the Community Hub.' : 'Goals are private and hidden from public feeds.'}
                        </p>
                    </button>

                    <button 
                        type="button"
                        onClick={() => {
                          if (!isEditing) return;
                          setFormData({...formData, witness_discoverable: !formData.witness_discoverable});
                        }}
                        className={`p-8 rounded-[2.5rem] border transition-all text-left group relative overflow-hidden ${formData.witness_discoverable ? 'bg-[#ff7a00]/5 border-[#ff7a00]/20' : 'bg-white/[0.02] border-white/5'}`}
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className={`h-10 w-10 rounded-xl flex items-center justify-center border ${formData.witness_discoverable ? 'bg-[#ff7a00] text-white border-[#ff9d47] shadow-xl shadow-orange-900/40' : 'bg-white/5 text-white/20 border-white/5'}`}>
                                <Globe size={18} />
                            </div>
                            <p className={`font-black italic uppercase text-xs tracking-tight ${formData.witness_discoverable ? 'text-white' : 'text-white/20'}`}>Witness Directory</p>
                        </div>
                        <p className="text-[10px] text-white/30 font-bold italic uppercase leading-relaxed font-black">
                            {formData.witness_discoverable ? 'Visible as an active verifier in the witness pool.' : 'Only people with your link can request your oversight.'}
                        </p>
                    </button>
                </div>
            </div>
          </div>

          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={resetAndCloseEdit}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-3 rounded-3xl bg-white/5 border border-white/10 text-white py-6 font-black uppercase tracking-[0.3em] hover:bg-white/10 active:scale-[0.98] disabled:opacity-50 transition-all text-xs italic"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-4 rounded-3xl bg-white text-black py-6 font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition-all shadow-[0_20px_50px_rgba(255,255,255,0.05)] text-xs italic"
              >
                {isSaving ? <Loader2 className="animate-spin" /> : <><Lock size={18} /> Synchronize Identity</>}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="w-full flex items-center justify-center gap-4 rounded-3xl bg-white/5 border border-white/10 text-white py-6 font-black uppercase tracking-[0.3em] hover:bg-white/10 active:scale-[0.98] transition-all text-xs italic"
            >
              Edit Identity
            </button>
          )}
        </form>
      </main>

      <footer className="py-20 text-center opacity-10">
        <p className="text-[10px] font-black uppercase tracking-[0.5em] italic font-black">Secure Identity Synchronization Module v2.0.4</p>
      </footer>
    </div>
  );
}
