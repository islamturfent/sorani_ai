'use client';
import { createContext, useContext, useEffect, useState } from 'react';

export type Lang = 'ckb' | 'en';

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  dir: 'rtl' | 'ltr';
}

const STORAGE_KEY = 'sorani-lang';

function readStoredLang(): Lang {
  // Default is Sorani (ckb). Only read the stored value in the browser.
  if (typeof window === 'undefined') return 'ckb';
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'en' ? 'en' : 'ckb';
  } catch {
    return 'ckb';
  }
}

const Ctx = createContext<LangCtx>({ lang: 'ckb', setLang: () => {}, dir: 'rtl' });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(readStoredLang);

  // Persist whenever the language changes.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* ignore storage errors */
    }
  }, [lang]);

  return (
    <Ctx.Provider value={{ lang, setLang, dir: lang === 'ckb' ? 'rtl' : 'ltr' }}>
      {children}
    </Ctx.Provider>
  );
}

export function useLanguage(): LangCtx {
  return useContext(Ctx);
}
