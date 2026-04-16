import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="fixed top-0 w-full z-50 bg-surface-container-low/80 tonal-shift shadow-[0_32px_64px_-15px_rgba(40,45,26,0.04)]">
      <div className="flex justify-between items-center px-8 h-20 max-w-[1440px] mx-auto">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">agriculture</span>
          <span className="text-xl font-bold tracking-widest text-primary font-headline uppercase">
            EARTH & ETHER
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          <Link
            to="/leaf-diagnosis"
            className="text-xs uppercase tracking-widest font-headline text-secondary border-b-2 border-primary transition-opacity duration-300"
          >
            Diagnosis
          </Link>
          <a
            href="#philosophy"
            className="text-xs uppercase tracking-widest font-headline text-primary/70 hover:opacity-80 transition-opacity duration-300"
          >
            Sustainability
          </a>
          <a
            href="#newsletter"
            className="text-xs uppercase tracking-widest font-headline text-primary/70 hover:opacity-80 transition-opacity duration-300"
          >
            Heritage
          </a>
          <div className="h-10 w-10 rounded-full bg-primary-container overflow-hidden">
            <img
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDKJryr3CZoRQuv4cg9goI_tpinxAp4XXqpp1q-lg8fqr3VQPlvXKUUWpPth90-HbXnfNY8iC1I7VPrZXo2aqqoH8YoRvCzVOtMmDxXKAH4XHIlygT7Ozi_gfa4ABy7kYctpRC7UwATCmx7tdqUka4KKTlGCFea0VTS8baYp-IP1Q3AXEN88y6JFq2NpKWTvGOwslRg3xEEwlf8E6XcvoloFCq9_TOT5RgMRu6QcaTa02EWVtmD1glD_fbkUpOlNdevkxu-sTM987RN"
              alt="Profile"
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
