import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LanguageSwitcher = ({ compact = false }: { compact?: boolean }) => {
  const { i18n } = useTranslation();
  const current = LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`flex items-center gap-2 rounded-full border border-outline-variant/40 bg-surface-container-lowest/60 backdrop-blur-md font-headline text-xs uppercase tracking-[0.2em] text-primary hover:bg-surface-container-low transition-colors ${
          compact ? "px-3 py-1.5" : "px-4 py-2"
        }`}
        aria-label="Change language"
      >
        <span className="material-symbols-outlined text-base">language</span>
        <span className="font-bold">{current.short}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-surface-container-lowest border-outline-variant/30">
        {LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`cursor-pointer font-headline text-sm ${
              lang.code === current.code ? "bg-secondary-container text-on-secondary-container" : "text-primary"
            }`}
          >
            <span className="font-bold mr-3 text-xs tracking-widest">{lang.short}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
