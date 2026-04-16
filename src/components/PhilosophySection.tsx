import ScrollReveal from "./ScrollReveal";

const features = [
  {
    icon: "eco",
    title: "Carbon-Negative Compute",
    description: "Our edge processing units are powered by onsite biomass energy, ensuring every calculation reduces our footprint.",
  },
  {
    icon: "lens_blur",
    title: "Spectral Soil Analysis",
    description: "Ultra-high resolution spectral imaging provides real-time micronutrient mapping across entire estates.",
  },
];

const PhilosophySection = () => {
  return (
    <section id="philosophy" className="py-40 bg-surface">
      <div className="max-w-[1440px] mx-auto px-8 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
        <ScrollReveal>
          <div>
            <h2 className="font-headline text-5xl md:text-7xl font-bold text-primary tracking-tighter leading-none mb-12">
              The Modern <br />Agrarian Approach
            </h2>
            <div className="space-y-8 max-w-xl">
              <p className="text-lg leading-relaxed text-on-surface-variant">
                We reject the sterile, clinical tech-heavy aesthetics of traditional industrial agriculture. Instead, we embrace a sophisticated, editorial vision that respects the land as much as the laboratory.
              </p>
              <p className="text-lg leading-relaxed text-on-surface-variant">
                Our philosophy is rooted in the tension between grounding, earthy fundamentals and the expansive, airy lightness of technological breakthroughs. We treat agricultural data with the same reverence as luxury craft.
              </p>
            </div>
          </div>
        </ScrollReveal>
        <ScrollReveal delay={0.2} direction="right">
          <div className="bg-surface-container-high p-12 rounded-xl">
            <h3 className="font-headline text-xs uppercase tracking-[0.3em] text-primary mb-16">
              Proprietary Infrastructure
            </h3>
            <div className="space-y-16">
              {features.map((feature) => (
                <div key={feature.title} className="flex gap-8 group">
                  <div className="w-16 h-16 shrink-0 bg-primary rounded-full flex items-center justify-center text-on-primary transition-transform group-hover:scale-110">
                    <span className="material-symbols-outlined text-3xl">{feature.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-headline text-xl font-bold text-primary mb-4 uppercase">{feature.title}</h4>
                    <p className="text-on-surface-variant leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default PhilosophySection;
