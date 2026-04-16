import { Link } from "react-router-dom";

const LeafDiagnosis = () => {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      {/* TopAppBar */}
      <header className="bg-surface fixed top-0 w-full z-[60]">
        <div className="flex items-center justify-between px-6 py-4 w-full">
          <div className="flex items-center gap-4">
            <Link to="/" className="active:scale-95 duration-200 hover:opacity-80 transition-opacity text-primary">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-headline font-bold tracking-tight text-xl text-primary">Leaf Diagnosis</h1>
          </div>
          <div className="flex gap-4">
            <span className="material-symbols-outlined text-primary">help_outline</span>
          </div>
        </div>
        <div className="h-px w-full bg-surface-container-low"></div>
      </header>

      <main className="min-h-screen pt-16 pb-32">
        {/* Hero Scanning Section */}
        <section className="relative h-[530px] overflow-hidden bg-primary-container">
          <img
            alt="Ultra close-up macro shot of a green leaf with yellowish spots"
            className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[0.2]"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeAkre_euHwX7TzsCNf-eqR0NrHSwtAOeTZxo69vRh8dtfAp7rCDrvCJVKApj3oEhU_LuvUHAkgWkQSzfFfh_EMu9B9Kampm5dkjxWAMYu68EvMQxODAbQpDxyNfqkvHfqXuyb98VNNrpigX2sxANgeGaw1MDrYey6YfEoEF6023gAOp8_xTObzjrMQUhk-rWdwVrXYqb_7rjM19emD-ixZvVtp81CAw2zAhsN2yzx7WruRRoevkWSv3XA43XefWfgGA3MhmaHi0Y0"
          />
          {/* Scanning Overlay */}
          <div className="scanner-line opacity-40"></div>
          {/* Diagnostic Overlays */}
          <div className="absolute inset-0 p-8 flex flex-col justify-between pointer-events-none">
            <div className="flex justify-between items-start">
              <div className="bg-surface-container-lowest/80 backdrop-blur-md p-3 rounded-xl border border-outline-variant/20">
                <p className="font-label text-[10px] uppercase tracking-widest text-primary font-bold">Confidence</p>
                <p className="font-headline text-2xl font-bold text-primary">94.2%</p>
              </div>
              <div className="bg-primary/90 p-3 rounded-xl border border-outline-variant/20 text-on-primary">
                <p className="font-label text-[10px] uppercase tracking-widest opacity-80">Sensor Status</p>
                <p className="font-headline text-sm font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-secondary-container animate-pulse"></span>
                  Active Scanning
                </p>
              </div>
            </div>
            {/* Bounding Box */}
            <div className="self-center w-64 h-64 border-2 border-dashed border-secondary-container/60 relative flex items-center justify-center">
              <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-secondary-container"></div>
              <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-secondary-container"></div>
              <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-secondary-container"></div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-secondary-container"></div>
              <div className="bg-error/10 border border-error/30 p-2 absolute top-10 left-10 rounded text-[10px] font-bold text-error backdrop-blur-sm">
                ISSUE DETECTED: CHLOROSIS
              </div>
            </div>
            <div className="flex justify-between items-end">
              <div className="text-on-primary bg-primary/40 backdrop-blur-sm p-4 rounded-xl max-w-[200px]">
                <p className="font-label text-[10px] uppercase mb-1">Environmental Sync</p>
                <p className="text-xs leading-relaxed opacity-90">
                  Humidity: 62%<br />Soil pH: 6.4<br />Light Level: 1400 lx
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Action & Results Canvas */}
        <section className="px-6 -mt-12 relative z-10">
          <div className="bg-surface-container-lowest rounded-[2rem] p-8 shadow-[0_20px_50px_rgba(40,45,26,0.08)]">
            <div className="text-center mb-8">
              <h2 className="font-headline text-3xl font-bold text-primary mb-2">Analyzing Specimen</h2>
              <p className="text-on-surface-variant font-medium">
                Position the affected leaf area within the frame for highest accuracy.
              </p>
            </div>
            {/* Control Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <button className="flex flex-col items-center justify-center p-6 bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-colors active:scale-95 duration-150 group">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-on-secondary-container">upload_file</span>
                </div>
                <span className="font-label text-[11px] font-bold uppercase tracking-wider text-primary">Upload Photo</span>
              </button>
              <button className="flex flex-col items-center justify-center p-6 bg-surface-container-low rounded-2xl hover:bg-surface-container-high transition-colors active:scale-95 duration-150 group">
                <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <span className="material-symbols-outlined text-on-secondary-container">history</span>
                </div>
                <span className="font-label text-[11px] font-bold uppercase tracking-wider text-primary">Recent Scans</span>
              </button>
            </div>
            {/* Diagnostic Breakdown */}
            <div className="space-y-4">
              <div className="bg-surface-container p-6 rounded-3xl border border-outline-variant/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-secondary">analytics</span>
                    <h3 className="font-headline font-bold text-lg">Preliminary Findings</h3>
                  </div>
                  <span className="px-3 py-1 bg-error-container text-on-error-container text-[10px] font-bold rounded-full uppercase tracking-tighter">
                    Action Required
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-surface-container-highest/50 rounded-xl">
                    <div>
                      <p className="text-xs font-bold font-label text-on-surface-variant uppercase">Potential Issue</p>
                      <p className="font-bold text-primary">Nitrogen Deficiency</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-label text-on-surface-variant uppercase">Probability</p>
                      <p className="font-bold text-secondary">88%</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-surface-container-highest/50 rounded-xl">
                    <div>
                      <p className="text-xs font-bold font-label text-on-surface-variant uppercase">Secondary Risk</p>
                      <p className="font-bold text-primary">Spider Mites</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold font-label text-on-surface-variant uppercase">Probability</p>
                      <p className="font-bold text-secondary">12%</p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Primary CTA */}
              <button className="w-full py-5 bg-primary text-on-primary rounded-2xl font-headline font-bold text-lg shadow-xl shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                <span className="material-symbols-outlined">biotech</span>
                Diagnose Now
              </button>
            </div>
          </div>
        </section>

        {/* Quick Tips */}
        <section className="px-6 mt-12 pb-12">
          <h4 className="font-headline font-bold text-xl mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">tips_and_updates</span>
            Scanner Calibration Tips
          </h4>
          <div className="flex gap-4 overflow-x-auto pb-4">
            <div className="min-w-[240px] bg-surface-container-low p-5 rounded-2xl">
              <span className="material-symbols-outlined text-secondary mb-3 block">light_mode</span>
              <p className="font-bold text-primary mb-1">Natural Light</p>
              <p className="text-sm text-on-surface-variant">Best results are achieved under indirect natural sunlight.</p>
            </div>
            <div className="min-w-[240px] bg-surface-container-low p-5 rounded-2xl">
              <span className="material-symbols-outlined text-secondary mb-3 block">center_focus_strong</span>
              <p className="font-bold text-primary mb-1">Hold Steady</p>
              <p className="text-sm text-on-surface-variant">Minimize movement for the AI to map micro-structures.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-surface/80 backdrop-blur-xl shadow-[0_-4px_32px_rgba(40,45,26,0.04)] rounded-t-xl">
        <Link to="/" className="flex flex-col items-center justify-center text-secondary px-4 py-1.5 hover:text-primary transition-colors active:scale-90 duration-150">
          <span className="material-symbols-outlined">psychology</span>
          <span className="font-label text-[10px] uppercase font-bold tracking-widest mt-1">Fields</span>
        </Link>
        <Link to="/leaf-diagnosis" className="flex flex-col items-center justify-center bg-secondary-container text-primary rounded-xl px-4 py-1.5 active:scale-90 duration-150">
          <span className="material-symbols-outlined">pest_control</span>
          <span className="font-label text-[10px] uppercase font-bold tracking-widest mt-1">Diagnosis</span>
        </Link>
        <a href="#" className="flex flex-col items-center justify-center text-secondary px-4 py-1.5 hover:text-primary transition-colors active:scale-90 duration-150">
          <span className="material-symbols-outlined">bar_chart</span>
          <span className="font-label text-[10px] uppercase font-bold tracking-widest mt-1">Insights</span>
        </a>
        <a href="#" className="flex flex-col items-center justify-center text-secondary px-4 py-1.5 hover:text-primary transition-colors active:scale-90 duration-150">
          <span className="material-symbols-outlined">account_circle</span>
          <span className="font-label text-[10px] uppercase font-bold tracking-widest mt-1">Profile</span>
        </a>
      </nav>
    </div>
  );
};

export default LeafDiagnosis;
