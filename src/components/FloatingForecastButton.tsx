import { Link } from "react-router-dom";
import { CloudSun } from "lucide-react";

const FloatingForecastButton = () => {
  return (
    <Link
      to="/weather-forecast"
      aria-label="Open Weather Forecast"
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full bg-primary text-on-primary px-4 py-3 shadow-lg hover:shadow-xl hover:opacity-90 transition-all font-headline text-xs uppercase tracking-widest"
    >
      <CloudSun className="h-5 w-5" />
      <span className="hidden sm:inline">Weather Forecast</span>
    </Link>
  );
};

export default FloatingForecastButton;
