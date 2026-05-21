import { Link } from "react-router-dom";
import { CloudSun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FloatingForecastButton = () => {
  const handleClick = async () => {
    try {
      await supabase.from("analytics_events").insert({
        event_type: "forecast_button_click",
        page_path: window.location.pathname,
        metadata: { source: "floating_button" },
      });
    } catch {
      // silently fail — analytics should never block navigation
    }
  };

  return (
    <Link
      to="/weather-forecast"
      aria-label="Open Weather Forecast"
      onClick={handleClick}
      className="fixed bottom-6 left-6 z-50 flex items-center gap-2 rounded-full bg-primary text-on-primary px-4 py-3 shadow-lg hover:shadow-xl hover:opacity-90 transition-all font-headline text-xs uppercase tracking-widest"
    >
      <CloudSun className="h-5 w-5" />
      <span className="hidden sm:inline">Weather Forecast</span>
    </Link>
  );
};

export default FloatingForecastButton;
