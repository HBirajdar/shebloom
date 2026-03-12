import { useState, useEffect } from 'react';
import { api } from '../services/api';

export interface ChiefDoctor {
  id: string;
  name: string;
  specialization: string;
  experience: number;
  rating: number;
  reviews: number;
  fee: number;
  qualification: string;
  about: string;
  tags: string[];
  languages: string[];
  avatarUrl: string | null;
  isChief: boolean;
  isPublished: boolean;
  isPromoted: boolean;
  feeFreeForPoor?: boolean;
}

// Shared cache so multiple components don't re-fetch
let cachedChief: ChiefDoctor | null = null;
let fetchPromise: Promise<ChiefDoctor | null> | null = null;

function fetchChief(): Promise<ChiefDoctor | null> {
  if (fetchPromise) return fetchPromise;
  fetchPromise = api.get('/doctors')
    .then(r => {
      const items = r.data.data || r.data.doctors || [];
      const chief = items.find((d: any) => d.isChief);
      if (chief) {
        cachedChief = {
          id: chief.id,
          name: chief.fullName || chief.name || '',
          specialization: chief.specialization || '',
          experience: chief.experienceYears || chief.experience || 0,
          rating: chief.rating || 5.0,
          reviews: chief.totalReviews || chief.reviews || 0,
          fee: chief.consultationFee || chief.fee || 0,
          qualification: Array.isArray(chief.qualifications) ? chief.qualifications.join(', ') : (chief.qualification || ''),
          about: chief.bio || chief.about || '',
          tags: chief.tags || [],
          languages: chief.languages || [],
          avatarUrl: chief.avatarUrl || chief.photoUrl || null,
          isChief: true,
          isPublished: chief.isPublished ?? true,
          isPromoted: chief.isPromoted ?? false,
          feeFreeForPoor: false,
        };
      }
      return cachedChief;
    })
    .catch(() => null)
    .finally(() => { fetchPromise = null; });
  return fetchPromise;
}

// Empty placeholder while loading (prevents crashes when accessing chief.name etc.)
const EMPTY_CHIEF: ChiefDoctor = {
  id: '', name: '', specialization: '', experience: 0, rating: 0, reviews: 0,
  fee: 0, qualification: '', about: '', tags: [], languages: [], avatarUrl: null,
  isChief: false, isPublished: false, isPromoted: false, feeFreeForPoor: false,
};

export function useChiefDoctor() {
  const [chief, setChief] = useState<ChiefDoctor>(cachedChief || EMPTY_CHIEF);
  const [loading, setLoading] = useState(!cachedChief);

  useEffect(() => {
    if (cachedChief) {
      setChief(cachedChief);
      setLoading(false);
      return;
    }
    fetchChief().then(c => {
      if (c) setChief(c);
      setLoading(false);
    });
  }, []);

  return { chief, chiefLoading: loading, hasChief: !!chief.id };
}
