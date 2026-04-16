import { Link } from "react-router-dom";
import ScrollReveal from "./ScrollReveal";

const Footer = () => {
  return (
    <footer className="bg-primary">
      <ScrollReveal>
        <div className="flex flex-col md:flex-row justify-between items-center px-12 py-16 w-full max-w-[1440px] mx-auto">
          <div className="mb-12 md:mb-0">
            <span className="text-primary-foreground font-black text-2xl font-headline tracking-tighter">
              EARTH & ETHER
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-10">
            {["Sustainability", "Heritage", "Diagnosis", "Contact"].map((item) => (
              <Link
                key={item}
                to={item === "Diagnosis" ? "/leaf-diagnosis" : "#"}
                className="font-headline text-xs uppercase tracking-widest text-primary-foreground/60 hover:text-primary-foreground transition-colors duration-300"
              >
                {item}
              </Link>
            ))}
          </div>
          <div className="mt-12 md:mt-0">
            <p className="font-headline text-[10px] uppercase tracking-widest text-primary-foreground/40">
              © 2024 EARTH & ETHER. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </ScrollReveal>
    </footer>
  );
};

export default Footer;
