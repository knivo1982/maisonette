import { useLanguage } from '../contexts/LanguageContext';
import { Globe } from 'lucide-react';

export default function LanguageSwitch({ className = '' }) {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button
      onClick={toggleLanguage}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:border-[#C5A059] hover:text-[#C5A059] transition-colors text-sm font-medium ${className}`}
      title={language === 'it' ? 'Switch to English' : 'Passa a Italiano'}
    >
      <Globe className="w-4 h-4" />
      <span className="uppercase">{language === 'it' ? 'EN' : 'IT'}</span>
    </button>
  );
}
