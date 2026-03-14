import { useState, useEffect, useCallback } from 'react';
import { userAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import toast from 'react-hot-toast';

export function useProfile() {
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await userAPI.me();
      const p = res.data.data || res.data;
      setProfile(p);
      if (p && user) setUser({ ...user, fullName: p.fullName || user.fullName, email: p.email || undefined, phone: p.phone || user.phone });
    } catch {}
    setLoading(false);
  }, [user?.id]);

  const updateProfile = async (data: any) => {
    try {
      const res = await userAPI.update(data);
      const updated = res.data.data || res.data;
      if (updated && user) {
        setUser({ ...user, fullName: updated.fullName || user.fullName, email: updated.email || user.email });
        setProfile({ ...profile, ...updated });
      }
      toast.success('Saved!');
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed';
      toast.error(msg.includes('nique') ? 'Email already in use' : msg);
      return false;
    }
  };

  useEffect(() => { if (user) fetchProfile(); }, [user?.id]);

  return { profile, loading, fetchProfile, updateProfile };
}
