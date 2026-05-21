import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MapPin,
  Loader2,
  Droplets,
  Wind,
  Thermometer,
  CloudRain,
  AlertCircle,
  ExternalLink,
  Search,
  Leaf,
} from "lucide-react";
import {
  calculateDayRisks,
  type DayWeather,
  type Disease,
  type DiseaseRisk,
  riskColor,
  riskDot,
} from "@/lib/diseaseRisk";
import { toast } from "sonner";

const CROPS = ["Apple", "Apricot", "Cherry", "Grape", "Peach", "Pear", "Tomato", "Potato", "Corn"];
const STORAGE_CROPS = "pdf:selected-crops";
const STORAGE_LOC = "pdf:last-location";

interface WeatherResponse {
  ok?: boolean;
  reason?: string;
  error?: string;
  location: { name: string; lat: number; lon: number; country: string; state?: string };
  current: {
    temp: number;
    humidity: number;
    wind_kmh: number;
    dew_point: number;
    description: string;
    icon: string;
  };
  daily: DayWeather[];
}

const PlantDiseaseForecast = () => {
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [diseases, setDiseases] = useState<Disease[]>([]);
  const [selectedCrops, setSelectedCrops] = useState<string[]>(["Tomato"]);
  const [openRisk, setOpenRisk] = useState<DiseaseRisk | null>(null);
  const [testingKey, setTestingKey] = useState(false);

  const onTestKey = async () => {
    setTestingKey(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-weather-key");
      if (error) throw error;
      if (data?.ok) {
        setError(null);
        alert(data?.message ?? "✓ Weather service is ready.");
      } else {
        setError(`Weather key check failed: ${data?.message ?? "Unknown error"}`);
      }
    } catch (e) {
      setError(`Weather key check failed: ${(e as Error).message}`);
    } finally {
      setTestingKey(false);
    }
  };

  useEffect(() => {
    let hasSavedLoc = false;
    try {
      const c = localStorage.getItem(STORAGE_CROPS);
      if (c) {
        const parsedCrops = JSON.parse(c);
        if (Array.isArray(parsedCrops) && parsedCrops.length > 0) setSelectedCrops(parsedCrops);
      }
      const l = localStorage.getItem(STORAGE_LOC);
      if (l) {
        const parsed = JSON.parse(l);
        if (parsed.city) {
          hasSavedLoc = true;
          setCity(parsed.city);
          fetchWeather({ city: parsed.city });
        } else if (parsed.lat && parsed.lon) {
          hasSavedLoc = true;
          fetchWeather({ lat: parsed.lat, lon: parsed.lon });
        }
      }
    } catch {}
    if (!hasSavedLoc) {
      // Default location so the forecast renders immediately
      setCity("Bangalore");
      fetchWeather({ city: "Bangalore" });
    }
    supabase
      .from("plant_diseases")
      .select("*")
      .then(({ data }) => data && setDiseases(data));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_CROPS, JSON.stringify(selectedCrops));
  }, [selectedCrops]);

  const toggleCrop = (crop: string) =>
    setSelectedCrops((prev) =>
      prev.includes(crop) ? prev.filter((c) => c !== crop) : [...prev, crop],
    );

  const fetchWeather = async (params: { city?: string; lat?: number; lon?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (params.city) qs.set("city", params.city);
      if (params.lat != null) qs.set("lat", String(params.lat));
      if (params.lon != null) qs.set("lon", String(params.lon));
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-weather?${qs}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load weather");
      if (data?.ok === false) {
        setWeather(null);
        setError(data.error || "Weather key check failed. Test the weather key before running forecasts.");
        return;
      }
      setWeather(data);
      localStorage.setItem(
        STORAGE_LOC,
        JSON.stringify(params.city ? { city: params.city } : { lat: params.lat, lon: params.lon }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (city.trim()) fetchWeather({ city: city.trim() });
  };

  const onUseLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported by your browser");
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        setLoading(false);
        setError(err.message);
      },
    );
  };

  const filteredDiseases = useMemo(
    () => diseases.filter((d) => selectedCrops.includes(d.crop)),
    [diseases, selectedCrops],
  );

  const dailyRisks = useMemo(() => {
    if (!weather) return [];
    return weather.daily.map((day) => ({
      day,
      risks: calculateDayRisks(day, filteredDiseases),
    }));
  }, [weather, filteredDiseases]);

  const todayRisks = dailyRisks[0]?.risks ?? [];
  const topToday = todayRisks.slice(0, 3);

  return (
    <section id="forecast" className="bg-surface py-20 sm:py-28">
      <div className="container mx-auto max-w-6xl px-4">
        <div className="mb-10 max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <Leaf className="h-3.5 w-3.5" /> Forecast
          </div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Plant disease risk forecast
          </h2>
          <p className="mt-3 text-muted-foreground">
            Get a 5-day disease risk outlook for your crops based on local weather conditions.
          </p>
        </div>

        {/* Location + crops */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSearch} className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Enter a city or ZIP"
                    className="pl-9"
                    maxLength={100}
                  />
                </div>
                <Button type="submit" disabled={loading || !city.trim()}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
                </Button>
                <Button type="button" variant="outline" onClick={onUseLocation} disabled={loading}>
                  <MapPin className="mr-2 h-4 w-4" /> Use my location
                </Button>
                <Button type="button" variant="ghost" onClick={onTestKey} disabled={testingKey}>
                  {testingKey ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Test weather key
                </Button>
              </form>
              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div className="flex-1">{error}</div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      city ? fetchWeather({ city }) : setError("Enter a city and try again")
                    }
                  >
                    Retry
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Crops</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2">
                {CROPS.map((crop) => (
                  <label
                    key={crop}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-accent"
                  >
                    <Checkbox
                      checked={selectedCrops.includes(crop)}
                      onCheckedChange={() => toggleCrop(crop)}
                    />
                    <span>{crop}</span>
                  </label>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current weather + today summary */}
        {weather && (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {weather.location.name}
                  {weather.location.state ? `, ${weather.location.state}` : ""}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {weather.location.country}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <img
                    src={`https://openweathermap.org/img/wn/${weather.current.icon}@2x.png`}
                    alt={weather.current.description}
                    className="h-16 w-16"
                  />
                  <div>
                    <div className="text-3xl font-semibold">{weather.current.temp.toFixed(0)}°C</div>
                    <div className="text-sm capitalize text-muted-foreground">
                      {weather.current.description}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <Stat icon={<Droplets className="h-4 w-4" />} label="Humidity" value={`${weather.current.humidity}%`} />
                  <Stat icon={<Wind className="h-4 w-4" />} label="Wind" value={`${weather.current.wind_kmh.toFixed(0)} km/h`} />
                  <Stat icon={<Thermometer className="h-4 w-4" />} label="Dew" value={`${weather.current.dew_point.toFixed(0)}°C`} />
                </div>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Today's top risks</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedCrops.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Select at least one crop to see disease risks.
                  </p>
                ) : topToday.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No notable disease risk for today. ✅
                  </p>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-3">
                    {topToday.map((r) => (
                      <button
                        key={r.disease.id}
                        onClick={() => setOpenRisk(r)}
                        className={`rounded-md border p-3 text-left transition hover:opacity-90 ${riskColor(r.level)}`}
                      >
                        <div className="text-xs font-medium uppercase tracking-wide">
                          {r.level} · {r.disease.crop}
                        </div>
                        <div className="mt-1 font-semibold">{r.disease.name}</div>
                        <div className="mt-1 text-xs opacity-80">{r.disease.type}</div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* 5-day timeline */}
        {weather && selectedCrops.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 text-lg font-semibold">5-day risk timeline</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {dailyRisks.map(({ day, risks }) => {
                const top = risks[0]?.level ?? "low";
                const dateLabel = new Date(day.date + "T12:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                return (
                  <Card key={day.date}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{dateLabel}</div>
                        <span className={`h-2.5 w-2.5 rounded-full ${riskDot(top)}`} />
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <img
                          src={`https://openweathermap.org/img/wn/${day.icon}.png`}
                          alt={day.description}
                          className="h-10 w-10"
                        />
                        <div className="text-sm">
                          <div>
                            {day.temp_min.toFixed(0)}° / {day.temp_max.toFixed(0)}°
                          </div>
                          <div className="text-xs text-muted-foreground">
                            <Droplets className="mr-1 inline h-3 w-3" />
                            {day.humidity_avg.toFixed(0)}%
                            {day.precipitation_mm > 0 && (
                              <>
                                {" · "}
                                <CloudRain className="mr-1 inline h-3 w-3" />
                                {day.precipitation_mm.toFixed(1)}mm
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        {risks.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No risk detected</p>
                        ) : (
                          risks.slice(0, 3).map((r) => (
                            <button
                              key={r.disease.id}
                              onClick={() => setOpenRisk(r)}
                              className={`block w-full rounded border px-2 py-1 text-left text-xs ${riskColor(r.level)}`}
                            >
                              <span className="font-medium">{r.disease.name}</span>{" "}
                              <span className="opacity-70">· {r.disease.crop}</span>
                            </button>
                          ))
                        )}
                        {risks.length > 3 && (
                          <p className="text-xs text-muted-foreground">
                            +{risks.length - 3} more
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Risk detail modal */}
        <Dialog open={!!openRisk} onOpenChange={(o) => !o && setOpenRisk(null)}>
          <DialogContent className="max-w-lg">
            {openRisk && (
              <>
                <DialogHeader>
                  <div
                    className={`mb-2 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${riskColor(openRisk.level)}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${riskDot(openRisk.level)}`} />
                    {openRisk.level.toUpperCase()} RISK
                  </div>
                  <DialogTitle>{openRisk.disease.name}</DialogTitle>
                  <DialogDescription>
                    {openRisk.disease.crop} · {openRisk.disease.type}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                  <p>{openRisk.disease.description}</p>
                  <div>
                    <div className="mb-1 font-semibold">Prevention</div>
                    <p className="text-muted-foreground">{openRisk.disease.prevention}</p>
                  </div>
                  {openRisk.matched.length > 0 && (
                    <div>
                      <div className="mb-1 font-semibold">Matched conditions</div>
                      <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                        {openRisk.matched.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {openRisk.disease.wikipedia && (
                    <a
                      href={openRisk.disease.wikipedia}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Learn more on Wikipedia <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
};

const Stat = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="rounded-md border border-border bg-background/50 p-2">
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {icon} {label}
    </div>
    <div className="mt-0.5 font-medium">{value}</div>
  </div>
);

export default PlantDiseaseForecast;
