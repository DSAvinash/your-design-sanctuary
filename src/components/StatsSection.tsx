import ScrollReveal from "./ScrollReveal";

const stats = [
  { icon: "opacity", label: "Soil Saturation", value: "82.4%", metric: "01" },
  { icon: "light_mode", label: "Photic Intensity", value: "1,240", unit: "LUX", metric: "02" },
  { icon: "trending_up", label: "Biomass Yield", value: "+12%", metric: "03" },
];

const StatsSection = () => {
  return (
    <section className="py-32 bg-surface">
      <div className="max-w-[1440px] mx-auto px-8 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {stats.map((stat, i) => (
            <ScrollReveal key={stat.metric} delay={i * 0.15}>
              <div className="bg-surface-container-low p-12 rounded-xl flex flex-col gap-8">
                <div className="flex justify-between items-start">
                  <span className="material-symbols-outlined text-primary text-3xl">{stat.icon}</span>
                  <span className="font-headline text-[10px] uppercase tracking-widest text-primary/60">
                    Metric {stat.metric}
                  </span>
                </div>
                <div>
                  <h3 className="font-headline text-xs uppercase tracking-[0.2em] text-primary mb-2">{stat.label}</h3>
                  <p className="font-headline text-5xl font-bold text-primary">
                    {stat.value}
                    {stat.unit && <span className="text-2xl font-medium"> {stat.unit}</span>}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
