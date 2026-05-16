import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const API_KEY = Deno.env.get("OPENWEATHERMAP_API_KEY")?.trim();

interface GeoResult {
  name: string;
  lat: number;
  lon: number;
  country: string;
  state?: string;
}

async function geocode(query: string): Promise<GeoResult | null> {
  const url = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Geocoding failed: ${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const g = data[0];
  return { name: g.name, lat: g.lat, lon: g.lon, country: g.country, state: g.state };
}

async function reverseGeocode(lat: number, lon: number): Promise<GeoResult | null> {
  const url = `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const data = await r.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  const g = data[0];
  return { name: g.name, lat, lon, country: g.country, state: g.state };
}

async function fetchForecast(lat: number, lon: number) {
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Forecast failed: ${r.status}`);
  return await r.json();
}

async function fetchCurrent(lat: number, lon: number) {
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!API_KEY) {
      return new Response(JSON.stringify({ error: "Weather API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const url0 = new URL(req.url);
    if (url0.searchParams.get("debug") === "1") {
      return new Response(JSON.stringify({ keyLen: API_KEY.length, keyPreview: API_KEY.slice(0,4)+"..."+API_KEY.slice(-2) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const url = new URL(req.url);
    const city = url.searchParams.get("city");
    const latParam = url.searchParams.get("lat");
    const lonParam = url.searchParams.get("lon");

    let location: GeoResult | null = null;

    if (city) {
      if (city.length > 100) {
        return new Response(JSON.stringify({ error: "City name too long" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      location = await geocode(city);
    } else if (latParam && lonParam) {
      const lat = parseFloat(latParam);
      const lon = parseFloat(lonParam);
      if (Number.isNaN(lat) || Number.isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return new Response(JSON.stringify({ error: "Invalid coordinates" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const rLat = Math.round(lat * 10000) / 10000;
      const rLon = Math.round(lon * 10000) / 10000;
      location = (await reverseGeocode(rLat, rLon)) ?? { name: "Your location", lat: rLat, lon: rLon, country: "" };
    } else {
      return new Response(JSON.stringify({ error: "Provide city or lat/lon" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!location) {
      return new Response(JSON.stringify({ error: "Location not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
