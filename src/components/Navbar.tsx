import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";

const Navbar = () => {
  const { t } = useTranslation();
  return (
    <nav className="fixed top-0 w-full z-50 bg-surface-container-low/80 tonal-shift shadow-[0_32px_64px_-15px_rgba(40,45,26,0.04)]">
      <div className="flex justify-between items-center px-8 h-20 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">agriculture</span>
          <span className="text-xl font-bold tracking-widest text-primary font-headline uppercase">
            AgroVision AI
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link
            to="/leaf-diagnosis"
            className="text-xs uppercase tracking-widest font-headline text-secondary border-b-2 border-primary transition-opacity duration-300"
          >
            {t("nav.diagnosis")}
          </Link>
          <a
            href="#philosophy"
            className="text-xs uppercase tracking-widest font-headline text-primary/70 hover:opacity-80 transition-opacity duration-300"
          >
            {t("nav.sustainability")}
          </a>
          <a
            href="#newsletter"
            className="text-xs uppercase tracking-widest font-headline text-primary/70 hover:opacity-80 transition-opacity duration-300"
          >
            {t("nav.heritage")}
          </a>
          <LanguageSwitcher />
        </div>
        <div className="md:hidden">
          <LanguageSwitcher compact />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
