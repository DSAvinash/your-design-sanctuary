import { Link } from "react-router-dom";
import ScrollReveal from "./ScrollReveal";

const DiagnosisFeature = () => {
  return (
    <section className="py-32 bg-surface-container-low">
      <div className="max-w-[1440px] mx-auto px-8 md:px-12 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <ScrollReveal direction="left">
          <div className="relative rounded-3xl overflow-hidden aspect-square md:aspect-video shadow-2xl">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeAkre_euHwX7TzsCNf-eqR0NrHSwtAOeTZxo69vRh8dtfAp7rCDrvCJVKApj3oEhU_LuvUHAkgWkQSzfFfh_EMu9B9Kampm5dkjxWAMYu68EvMQxODAbQpDxyNfqkvHfqXuyb98VNNrpigX2sxANgeGaw1MDrYey6YfEoEF6023gAOp8_xTObzjrMQUhk-rWdwVrXYqb_7rjM19emD-ixZvVtp81CAw2zAhsN2yzx7WruRRoevkWSv3XA43XefWfgGA3MhmaHi0Y0"
              alt="Leaf being analyzed with digital diagnostic overlays"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent"></div>
          </div>
        </ScrollReveal>
        <ScrollReveal direction="right" delay={0.15}>
          <div className="flex flex-col gap-8">
            <span className="font-headline text-xs uppercase tracking-[0.4em] text-secondary font-bold">
              Advanced Detection
            </span>
            <h2 className="font-headline text-5xl md:text-6xl font-bold text-primary tracking-tighter leading-tight">
              AI Leaf <br />Diagnosis Tool
            </h2>
            <p className="text-lg text-on-surface-variant leading-relaxed max-w-xl">
              Harness the power of spectral imaging and neural networks to identify crop diseases, nutrient deficiencies, and pest infestations in real-time. Scan your crops with precision.
            </p>
            <Link
              to="/leaf-diagnosis"
              className="self-start px-12 py-5 bg-primary text-on-primary font-headline text-xs uppercase tracking-[0.2em] rounded-full hover:bg-primary-container transition-all shadow-lg hover:shadow-xl flex items-center gap-4 group"
            >
              <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">biotech</span>
              Start Diagnosis Scan
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default DiagnosisFeature;
