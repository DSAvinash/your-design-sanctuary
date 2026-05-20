import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "./LanguageSwitcher";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut } from "lucide-react";

const Navbar = () => {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
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
          <Link
            to="/weather-forecast"
            className="text-xs uppercase tracking-widest font-headline text-primary/70 hover:opacity-80 transition-opacity duration-300"
          >
            Weather Forecast
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
          {user ? (
            <Button variant="outline" size="sm" onClick={signOut} className="rounded-full">
              <LogOut className="mr-1 h-4 w-4" /> Sign out
            </Button>
          ) : (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth">
                <LogIn className="mr-1 h-4 w-4" /> Login
              </Link>
            </Button>
          )}
        </div>
        <div className="md:hidden flex items-center gap-2">
          <LanguageSwitcher compact />
          {user ? (
            <Button variant="outline" size="sm" onClick={signOut} className="rounded-full">
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button asChild size="sm" className="rounded-full">
              <Link to="/auth"><LogIn className="h-4 w-4" /></Link>
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
