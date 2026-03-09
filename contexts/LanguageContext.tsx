import React, { createContext, useContext, useState, useCallback } from 'react';
import { Language, DEFAULT_LANGUAGE, getLanguageByCode } from '../constants/languages';
import { StorageKeys, getString, setString } from '../lib/utils/storage';

interface LanguageContextType {
  language: Language;
  setLanguage: (code: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = getString(StorageKeys.LANGUAGE_CODE);
    return saved ? getLanguageByCode(saved) : DEFAULT_LANGUAGE;
  });

  const setLanguage = useCallback((code: string) => {
    const lang = getLanguageByCode(code);
    setLanguageState(lang);
    setString(StorageKeys.LANGUAGE_CODE, code);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
