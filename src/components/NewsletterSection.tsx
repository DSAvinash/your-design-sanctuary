import ScrollReveal from "./ScrollReveal";

const NewsletterSection = () => {
  return (
    <section id="newsletter" className="py-24 bg-primary text-on-primary">
      <ScrollReveal>
        <div className="max-w-[1440px] mx-auto px-8 md:px-12 flex flex-col md:flex-row justify-between items-end gap-12">
          <div className="max-w-2xl">
            <h2 className="font-headline text-4xl font-bold mb-6 tracking-tight">
              Stay informed on the season's progress.
            </h2>
            <div className="flex gap-4 w-full max-w-md">
              <input
                className="bg-transparent border-b border-on-primary/30 w-full py-4 text-xs uppercase tracking-widest focus:border-on-primary focus:ring-0 outline-none transition-colors placeholder:text-on-primary/40"
                placeholder="YOUR EMAIL"
                type="email"
              />
              <button className="shrink-0 font-headline text-xs uppercase tracking-widest p-4 hover:opacity-80 text-on-primary">
                Join
              </button>
            </div>
          </div>
          <div className="text-right">
            <p className="font-headline text-sm tracking-[0.2em] opacity-60">EST. 2024</p>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
};

export default NewsletterSection;
