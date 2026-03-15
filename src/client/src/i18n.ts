import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';

// Map backend language enum to i18n locale code
const LANG_MAP: Record<string, string> = {
  ENGLISH: 'en',
  HINDI: 'hi',
};

// Read saved language from localStorage (set by language picker)
const savedLang = localStorage.getItem('sb_language') || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: savedLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

/** Switch language — call from language picker */
export function switchLanguage(backendEnum: string) {
  const locale = LANG_MAP[backendEnum] || 'en';
  i18n.changeLanguage(locale);
  localStorage.setItem('sb_language', locale);
}

/** Initialize language from user profile (call after login/profile fetch) */
export function initLanguageFromProfile(backendEnum?: string) {
  if (backendEnum && LANG_MAP[backendEnum]) {
    switchLanguage(backendEnum);
  }
}

export default i18n;
