import { Tables } from "@/integrations/supabase/types";

export type Disease = Tables<"plant_diseases">;

export interface DayWeather {
  date: string;
  temp_min: number;
  temp_max: number;
  temp_avg: number;
  humidity_avg: number;
  humidity_max: number;
  wind_max_kmh: number;
  dew_point_avg: number;
  precipitation_mm: number;
  description: string;
  icon: string;
}

export type RiskLevel = "low" | "moderate" | "high";

export interface DiseaseRisk {
  disease: Disease;
  level: RiskLevel;
  matched: string[];
  unmet: string[];
}

function inRange(v: number, min: number, max: number) {
  return v >= min && v <= max;
}

export function calculateDayRisks(day: DayWeather, diseases: Disease[]): DiseaseRisk[] {
  const month = new Date(day.date + "T12:00:00").getMonth() + 1;
  const results: DiseaseRisk[] = [];

  for (const d of diseases) {
    const matched: string[] = [];
    const unmet: string[] = [];

    const monthOk = d.active_months.length === 0 || d.active_months.includes(month);
    monthOk ? matched.push("Active season") : unmet.push("Off-season");

    const tempOk = inRange(day.temp_avg, Number(d.temperature_min_c), Number(d.temperature_max_c));
    const tempBorderline =
      !tempOk &&
      inRange(day.temp_max, Number(d.temperature_min_c), Number(d.temperature_max_c));
    if (tempOk) matched.push(`Temp ${day.temp_avg.toFixed(0)}°C in range`);
    else if (tempBorderline) matched.push("Temp borderline");
    else unmet.push("Temp out of range");

    const humOk = inRange(day.humidity_avg, Number(d.humidity_min), Number(d.humidity_max));
    const humBorderline =
      !humOk && inRange(day.humidity_max, Number(d.humidity_min), Number(d.humidity_max));
    if (humOk) matched.push(`Humidity ${day.humidity_avg.toFixed(0)}% in range`);
    else if (humBorderline) matched.push("Humidity borderline");
    else unmet.push("Humidity out of range");

    let dewOk = true;
    if (d.dew_point_min_c != null && d.dew_point_max_c != null) {
      dewOk = inRange(day.dew_point_avg, Number(d.dew_point_min_c), Number(d.dew_point_max_c));
      if (dewOk) matched.push(`Dew point ${day.dew_point_avg.toFixed(0)}°C`);
    }

    let windOk = true;
    if (d.wind_speed_max_kmh != null) {
      windOk = day.wind_max_kmh <= Number(d.wind_speed_max_kmh);
      if (!windOk) unmet.push(`Wind > ${d.wind_speed_max_kmh} km/h`);
    }

    let level: RiskLevel;
    if (monthOk && tempOk && humOk && dewOk && windOk) level = "high";
    else if ((tempOk || tempBorderline) && (humOk || humBorderline) && monthOk) level = "moderate";
    else if (tempOk || humOk) level = "low";
    else continue;

    results.push({ disease: d, level, matched, unmet });
  }

  const order: Record<RiskLevel, number> = { high: 0, moderate: 1, low: 2 };
  return results.sort((a, b) => order[a.level] - order[b.level]);
}

export const riskColor = (l: RiskLevel) =>
  l === "high"
    ? "bg-red-100 text-red-900 border-red-300 dark:bg-red-950/40 dark:text-red-200 dark:border-red-900"
    : l === "moderate"
    ? "bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-900"
    : "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-900";

export const riskDot = (l: RiskLevel) =>
  l === "high" ? "bg-red-500" : l === "moderate" ? "bg-amber-500" : "bg-emerald-500";
