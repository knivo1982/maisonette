import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Check localStorage first
    const saved = localStorage.getItem('maisonette_language');
    if (saved && (saved === 'it' || saved === 'en')) {
      return saved;
    }
    // Check browser language
    const browserLang = navigator.language?.substring(0, 2);
    return browserLang === 'it' ? 'it' : 'en';
  });

  useEffect(() => {
    localStorage.setItem('maisonette_language', language);
    document.documentElement.lang = language;
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];
    
    for (const k of keys) {
      if (value && value[k]) {
        value = value[k];
      } else {
        // Fallback to Italian if key not found
        value = translations['it'];
        for (const k2 of keys) {
          if (value && value[k2]) {
            value = value[k2];
          } else {
            return key; // Return key if not found
          }
        }
        break;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'it' ? 'en' : 'it');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
