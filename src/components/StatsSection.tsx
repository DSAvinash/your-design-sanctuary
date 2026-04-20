import ScrollReveal from "./ScrollReveal";

type Priority = "critical" | "warning" | "optimal";

type TrendDir = "up" | "down" | "stable";

interface FieldSignal {
  id: string;
  icon: string;
  title: string;
  rawValue: string;
  priority: Priority;
  insight: string;
  risk: string;
  action: string;
  trend: TrendDir;
  trendCaption: string;
  confidencePct: number;
  spark: number[];
}

const priorityStyles: Record<
  Priority,
  { badge: string; border: string; label: string }
> = {
  critical: {
    badge: "bg-red-100 text-red-900 border-red-200",
    border: "border-l-4 border-l-red-500",
    label: "Critical — act now",
  },
  warning: {
    badge: "bg-amber-100 text-amber-900 border-amber-200",
    border: "border-l-4 border-l-amber-500",
    label: "Warning — review soon",
  },
  optimal: {
    badge: "bg-emerald-100 text-emerald-900 border-emerald-200",
    border: "border-l-4 border-l-emerald-500",
    label: "Optimal",
  },
};

/** Demo signals: values align with copy so the panel reads as a coherent advisor, not random metrics. */
const signals: FieldSignal[] = [
  {
    id: "soil",
    icon: "opacity",
    title: "Soil moisture",
    rawValue: "82.4%",
    priority: "critical",
    insight: "High moisture — field is holding more water than ideal for this stage.",
    risk: "Root rot and fungal pressure increase when soil stays saturated.",
    action: "Delay irrigation for at least 48 hours; check drainage in low spots.",
    trend: "up",
    trendCaption: "7-day trend: rising vs last week",
    confidencePct: 88,
    spark: [42, 48, 55, 62, 71, 78, 82],
  },
  {
    id: "light",
    icon: "light_mode",
    title: "Light (PAR proxy)",
    rawValue: "1,240 LUX",
    priority: "optimal",
    insight: "Light levels support healthy photosynthesis for current cloud cover.",
    risk: "No immediate stress from shading at this reading.",
    action: "No shading changes needed; re-check at midday if clouds clear.",
    trend: "stable",
    trendCaption: "7-day trend: steady",
    confidencePct: 81,
    spark: [1180, 1210, 1195, 1240, 1220, 1235, 1240],
  },
  {
    id: "biomass",
    icon: "trending_up",
    title: "Biomass trajectory",
    rawValue: "+12% vs prior period",
    priority: "warning",
    insight: "Growth is improving, but the rate has softened slightly.",
    risk: "If moisture stays high, yield gains may not hold through grain fill.",
    action: "Keep current fertilizer timing; prioritize soil drying before next top-dress.",
    trend: "up",
    trendCaption: "7-day trend: up, slope easing",
    confidencePct: 74,
    spark: [4, 7, 9, 10, 11, 11.5, 12],
  },
];

function TrendSparkline({ values, trend }: { values: number[]; trend: TrendDir }) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const barColor =
    trend === "up" ? "bg-primary/50" : trend === "down" ? "bg-amber-500/50" : "bg-primary/35";
  return (
    <div className="flex items-end gap-0.5 h-10 shrink-0" aria-hidden title="7-day relative pattern">
      {values.map((v, i) => {
        const n = (v - min) / span;
        const px = 6 + Math.round(n * 26);
        return <div key={i} className={`w-2 rounded-sm ${barColor}`} style={{ height: px }} />;
      })}
    </div>
  );
}

const StatsSection = () => {
  return (
    <section className="py-24 md:py-32 bg-surface">
      <div className="max-w-[1440px] mx-auto px-8 md:px-12">
        <div className="max-w-3xl mb-14 md:mb-16">
          <p className="font-headline text-xs uppercase tracking-[0.2em] text-primary/70 mb-3">
            Smart Field Intelligence
          </p>
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary tracking-tight mb-4">
            From readings to decisions
          </h2>
          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed">
            Raw numbers only help when they answer:{" "}
            <span className="text-primary font-medium">what should I do next?</span> Each signal below
            pairs the measurement with risk, context, and a concrete next step—prioritized so you can act
            in minutes, not guess from a dashboard.
          </p>
          <p className="mt-4 text-sm text-on-surface-variant/80">
            Demo context: <span className="text-primary/90">Rice · vegetative stage</span> — rules tuned
            for this crop; production would pull live sensors + weather.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {signals.map((signal, i) => {
            const ps = priorityStyles[signal.priority];
            return (
              <ScrollReveal key={signal.id} delay={i * 0.12}>
                <article
                  className={`bg-surface-container-low rounded-xl p-8 md:p-10 flex flex-col gap-6 shadow-sm ${ps.border}`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <span className="material-symbols-outlined text-primary text-3xl shrink-0">
                      {signal.icon}
                    </span>
                    <span
                      className={`font-headline text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-md border ${ps.badge}`}
                    >
                      {ps.label}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-primary/80 mb-1">
                      {signal.title}
                    </h3>
                    <p className="font-headline text-3xl md:text-4xl font-bold text-primary tabular-nums">
                      {signal.rawValue}
                    </p>
                  </div>

                  <div className="space-y-3 text-sm leading-relaxed">
                    <div>
                      <p className="font-headline text-[10px] uppercase tracking-widest text-primary/50 mb-1">
                        Insight
                      </p>
                      <p className="text-on-surface">{signal.insight}</p>
                    </div>
                    <div>
                      <p className="font-headline text-[10px] uppercase tracking-widest text-primary/50 mb-1">
                        Risk / opportunity
                      </p>
                      <p className="text-on-surface">{signal.risk}</p>
                    </div>
                    <div className="rounded-lg bg-primary/5 border border-primary/10 px-3 py-2.5">
                      <p className="font-headline text-[10px] uppercase tracking-widest text-primary mb-1">
                        Recommended action
                      </p>
                      <p className="text-primary font-medium">{signal.action}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-outline-variant/30 space-y-3">
                    <div className="flex justify-between items-end gap-3">
                      <div>
                        <p className="font-headline text-[10px] uppercase tracking-widest text-primary/50 mb-1">
                          7-day pattern
                        </p>
                        <p className="text-xs text-on-surface-variant">{signal.trendCaption}</p>
                      </div>
                      <TrendSparkline values={signal.spark} trend={signal.trend} />
                    </div>
                    <div className="flex items-center justify-between text-xs text-on-surface-variant">
                      <span>Confidence (rule + trend fit)</span>
                      <span className="tabular-nums font-medium text-primary">{signal.confidencePct}%</span>
                    </div>
                  </div>
                </article>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
