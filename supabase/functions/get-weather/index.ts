import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const API_KEY = Deno.env.get("OPENWEATHERMAP_API_KEY")?.trim();

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

interface GeoResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

async function geocode(query: string): Promise<GeoResult | null> {
  if (API_KEY) {
    try {
      const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`;
      const r = await fetch(url);
      if (r.ok) {
        const data = await r.json();
        if (!Array.isArray(data) || data.length === 0) return null;
        const g = data[0];
        return { name: g.name, lat: g.lat, lon: g.lon, country: g.country, state: g.state };
      }
    } catch (err) {
      console.warn("OpenWeatherMap geocoding unavailable, using fallback", (err as Error).message);
    }
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Geocoding failed: ${r.status}`);
  const data = await r.json();
  const g = data.results?.[0];
  if (!g) return null;
  return { name: g.name, lat: g.latitude, lon: g.longitude, country: g.country_code ?? g.country ?? "", state: g.admin1 };
}

async function reverseGeocode(lat: number, lon: number): Promise<GeoResult | null> {
  if (!API_KEY) return null;
  const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const g = data[0];
  return { name: g.name, lat, lon, country: g.country, state: g.state };
}

async function fetchForecast(lat: number, lon: number) {
  if (!API_KEY) throw new Error("Forecast failed: missing_key");
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Forecast failed: ${r.status}`);
  return await r.json();
}

async function fetchCurrent(lat: number, lon: number) {
  if (!API_KEY) throw new Error("Current weather failed: missing_key");
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Current weather failed: ${r.status}`);
  return await r.json();
}

// Approx dew point from temp + humidity (Magnus formula)
function dewPoint(tC: number, rh: number): number {
  const a = 17.625, b = 243.04;
  const alpha = Math.log(Math.max(rh, 1) / 100) + (a * tC) / (b + tC);
  return (b * alpha) / (a - alpha);
}

interface DailyAggregate {
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

function aggregateDaily(forecast: any): DailyAggregate[] {
  const buckets: Record<string, any[]> = {};
  for (const item of forecast.list) {
    const d = new Date(item.dt * 1000).toISOString().slice(0, 10);
    (buckets[d] ||= []).push(item);
  }
  return Object.entries(buckets).map(([date, items]) => {
    const temps = items.map((i) => i.main.temp);
    const hums = items.map((i) => i.main.humidity);
    const winds = items.map((i) => (i.wind?.speed ?? 0) * 3.6);
    const dews = items.map((i) => dewPoint(i.main.temp, i.main.humidity));
    const precip = items.reduce((s, i) => s + (i.rain?.["3h"] ?? 0) + (i.snow?.["3h"] ?? 0), 0);
    const mid = items[Math.floor(items.length / 2)];
    return {
      date,
      temp_min: Math.min(...temps),
      temp_max: Math.max(...temps),
      temp_avg: temps.reduce((a, b) => a + b, 0) / temps.length,
      humidity_avg: hums.reduce((a, b) => a + b, 0) / hums.length,
      humidity_max: Math.max(...hums),
      wind_max_kmh: Math.max(...winds),
      dew_point_avg: dews.reduce((a, b) => a + b, 0) / dews.length,
      precipitation_mm: precip,
      description: mid.weather[0]?.description ?? "",
      icon: mid.weather[0]?.icon ?? "01d",
    };
  });
}

function weatherCode(code: number) {
  if (code === 0) return { description: "clear sky", icon: "01d" };
  if ([1, 2].includes(code)) return { description: "partly cloudy", icon: "02d" };
  if (code === 3) return { description: "overcast clouds", icon: "04d" };
  if ([45, 48].includes(code)) return { description: "fog", icon: "50d" };
  if ([51, 53, 55, 56, 57].includes(code)) return { description: "drizzle", icon: "09d" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { description: "rain", icon: "10d" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { description: "snow", icon: "13d" };
  if ([95, 96, 99].includes(code)) return { description: "thunderstorm", icon: "11d" };
  return { description: "mixed conditions", icon: "03d" };
}

function aggregateOpenMeteoDaily(data: any): DailyAggregate[] {
  const daily = data.daily ?? {};
  return (daily.time ?? []).map((date: string, index: number) => {
    const tempMin = daily.temperature_2m_min?.[index] ?? 0;
    const tempMax = daily.temperature_2m_max?.[index] ?? 0;
    const humidity = daily.relative_humidity_2m_mean?.[index] ?? 60;
    const condition = weatherCode(daily.weather_code?.[index] ?? 0);
    return {
      date,
      temp_min: tempMin,
      temp_max: tempMax,
      temp_avg: (tempMin + tempMax) / 2,
      humidity_avg: humidity,
      humidity_max: daily.relative_humidity_2m_max?.[index] ?? humidity,
      wind_max_kmh: daily.wind_speed_10m_max?.[index] ?? 0,
      dew_point_avg: daily.dew_point_2m_mean?.[index] ?? dewPoint((tempMin + tempMax) / 2, humidity),
      precipitation_mm: daily.precipitation_sum?.[index] ?? 0,
      description: condition.description,
      icon: condition.icon,
    };
  });
}

async function fetchOpenMeteoWeather(location: GeoResult) {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({
    latitude: String(location.lat),
    longitude: String(location.lon),
    current: "temperature_2m,relative_humidity_2m,dew_point_2m,wind_speed_10m,weather_code",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,relative_humidity_2m_mean,relative_humidity_2m_max,dew_point_2m_mean",
    forecast_days: "5",
    timezone: "auto",
  }).toString();

  const r = await fetch(url);
  if (!r.ok) throw new Error(`Fallback weather failed: ${r.status}`);
  const data = await r.json();
  const currentCondition = weatherCode(data.current?.weather_code ?? 0);
  return {
    ok: true,
    source: "open-meteo-fallback",
    location,
    current: {
      temp: data.current?.temperature_2m ?? 0,
      humidity: data.current?.relative_humidity_2m ?? 0,
      wind_kmh: data.current?.wind_speed_10m ?? 0,
      dew_point: data.current?.dew_point_2m ?? dewPoint(data.current?.temperature_2m ?? 0, data.current?.relative_humidity_2m ?? 60),
      description: currentCondition.description,
      icon: currentCondition.icon,
    },
    daily: aggregateOpenMeteoDaily(data),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!API_KEY) {
      return json({ ok: false, reason: "weather_key_missing", error: "Weather API key not configured" });
    }

    const url = new URL(req.url);
    const city = url.searchParams.get("city");
    const latParam = url.searchParams.get("lat");
    const lonParam = url.searchParams.get("lon");

    let location: GeoResult | null = null;

    if (city) {
      if (city.length > 100) {
        return json({ error: "City name too long" }, 400);
      }
      location = await geocode(city);
    } else if (latParam && lonParam) {
      const lat = parseFloat(latParam);
      const lon = parseFloat(lonParam);
      if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return json({ error: "Invalid coordinates" }, 400);
      }
      const rLat = Math.round(lat * 10000) / 10000;
      const rLon = Math.round(lon * 10000) / 10000;
      location = (await reverseGeocode(rLat, rLon)) ?? { name: "Your location", lat: rLat, lon: rLon, country: "" };
    } else {
      return json({ error: "Provide city or lat/lon" }, 400);
    }

    if (!location) {
      return json({ error: "Location not found" }, 404);
    }

    const [current, forecast] = await Promise.all([
      fetchCurrent(location.lat, location.lon),
      fetchForecast(location.lat, location.lon),
    ]);

    const daily = aggregateDaily(forecast);

    const currentDew = dewPoint(current.main.temp, current.main.humidity);

    return new Response(
      JSON.stringify({
        location,
        current: {
          temp: current.main.temp,
          humidity: current.main.humidity,
          wind_kmh: (current.wind?.speed ?? 0) * 3.6,
          dew_point: currentDew,
          description: current.weather[0]?.description ?? "",
          icon: current.weather[0]?.icon ?? "01d",
        },
        daily,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("get-weather error", err);
    const message = (err as Error).message;
    const keyError = weatherKeyError(message.split(": ").pop() ?? "");
    if (keyError) return json(keyError);
    return json({ error: message }, 500);
  }
});
