'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { en } from './en';
import { te } from './te';

export type Language = 'en' | 'te';

type TranslationType = typeof en;

interface LocaleContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  switchLanguage: () => void;
  t: (keyPath: string, fallback?: string) => string;
  translations: TranslationType;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'granite_measure_lang';

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    try {
      const storedLang = localStorage.getItem(LOCALE_STORAGE_KEY) as Language | null;
      if (storedLang === 'en' || storedLang === 'te') {
        setLanguageState(storedLang);
      }
    } catch (e) {
      console.warn('Unable to retrieve language from localStorage', e);
    }
  }, []);

  const setLanguage = (newLang: Language) => {
    setLanguageState(newLang);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLang);
      document.documentElement.lang = newLang;
    } catch (e) {
      console.warn('Unable to persist language to localStorage', e);
    }
  };

  const switchLanguage = () => {
    setLanguage(language === 'en' ? 'te' : 'en');
  };

  const translations = useMemo(() => {
    return language === 'te' ? te : en;
  }, [language]);

  const t = (keyPath: string, fallback?: string): string => {
    const keys = keyPath.split('.');
    let current: any = translations;
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return fallback || keyPath;
      }
    }
    return typeof current === 'string' ? current : fallback || keyPath;
  };

  return (
    <LocaleContext.Provider
      value={{
        language,
        setLanguage,
        switchLanguage,
        t,
        translations,
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LocaleProvider');
  }
  return context;
}
