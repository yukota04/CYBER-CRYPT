import React from 'react';
import { Language, SUPPORTED_LANGUAGES } from '../game/i18n';
import { Globe } from 'lucide-react';

interface LanguageSelectorProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onLanguageChange
}) => {
  return (
    <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-900/80 border border-cyan-500/30 text-xs font-mono">
      <Globe className="w-3.5 h-3.5 text-cyan-400 ml-1" />
      <div className="flex gap-1">
        {SUPPORTED_LANGUAGES.map(lang => (
          <button
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className={`px-2 py-0.5 rounded text-[11px] font-bold transition cursor-pointer flex items-center gap-1 ${
              currentLanguage === lang.code
                ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title={lang.label}
            aria-label={`Select Language ${lang.label}`}
          >
            <span>{lang.flag}</span>
            <span className="uppercase">{lang.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
