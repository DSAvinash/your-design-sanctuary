import { Link } from "react-router-dom";

const HeroSection = () => {
  return (
    <section className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2WUA1_h3-NY9yXcUUYbrsHCo1izd-2nCZdI4MoFtDEyUgjIN-qYE78ew6E56sBdYkEhZSGFWaJVIgQa9OHBqdzf18ZBUIrBJOZFoacfj2U5LnXTpH1D_-BG2ibUdjDja7JzdMCKKRD1LoYqKATVgFADxOFhsOohIMfZdqqDaMKjytM5qVXPJgkKpEg_-9rtZ_iSO08TXdHbKf7Q_u0LEfdpHqO1uExO-XaRqGiNYwjc4__oxZZh9QBQj5WbvytLFlHWntZ_vDSYRj"
          alt="Aerial view of green rice terraces"
        />
        <div className="absolute inset-0 bg-black/30"></div>
      </div>
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <h1 className="font-headline font-bold text-5xl md:text-8xl text-on-primary tracking-tighter mb-8 leading-[0.9]">
          Transforming Tech <br />In Agriculture
        </h1>
        <p className="text-on-primary/90 text-lg md:text-xl font-light mb-12 max-w-2xl mx-auto leading-relaxed">
          Pioneering the intersection of algorithmic intelligence and organic growth to cultivate the future of our planet.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/leaf-diagnosis"
            className="px-10 py-5 bg-primary text-on-primary font-headline text-xs uppercase tracking-widest rounded-md hover:scale-95 transition-transform duration-200"
          >
            Launch Leaf Diagnosis
          </Link>
          <button className="px-10 py-5 bg-surface text-primary font-headline text-xs uppercase tracking-widest rounded-md hover:scale-95 transition-transform duration-200">
            View Our Soil
          </button>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
