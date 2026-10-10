import { create } from 'zustand';
import { en } from './en';
import { te } from './te';

type Language = 'en' | 'te';
type Translations = typeof en;

interface I18nStore {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof Translations) => string;
}

export const useTranslation = create<I18nStore>((set, get) => ({
  language: 'en',
  setLanguage: (lang) => set({ language: lang }),
  t: (key) => {
    const { language } = get();
    const translations = language === 'en' ? en : te;
    return translations[key] || key;
  },
}));
